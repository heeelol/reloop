import { supabase } from './supabase'
import type {
  AppNotification,
  Category,
  ChatMessage,
  Item,
  LeaderRow,
} from './types'
import { generateMockItems } from './mock'

// Maps a DB row (from a table select or the items_near RPC) to our Item shape.
function rowToItem(r: Record<string, unknown>): Item {
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description ?? ''),
    category: (r.category as Category) ?? 'Other',
    imageUrl: String(r.image_url),
    lat: Number(r.lat),
    lng: Number(r.lng),
    locationName: String(r.location_name ?? 'Near you'),
    co2Saved: Number(r.co2_saved ?? 5),
    status: (r.status as Item['status']) ?? 'available',
    createdAt: String(r.created_at),
    ownerName: String(r.owner_name ?? 'Neighbour'),
    ownerId: (r.owner_id as string | null) ?? null,
    claimedById: (r.claimed_by as string | null) ?? null,
  }
}

/** Items the current user posted or reserved (for the "Mine" tab). */
export async function fetchMyItems(userId: string): Promise<Item[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .or(`owner_id.eq.${userId},claimed_by.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('fetchMyItems failed:', error.message)
    return []
  }
  return (data ?? []).map(rowToItem)
}

/** Release a reservation you made — puts the item back on the map. */
export async function releaseClaim(id: string): Promise<Item> {
  if (!supabase) throw new Error('No backend')
  const { data, error } = await supabase.rpc('release_claim', { p_item_id: id })
  if (error) throw error
  return rowToItem(Array.isArray(data) ? data[0] : data)
}

/** Remove one of your own listings. */
export async function deleteItem(id: string): Promise<void> {
  if (!supabase) throw new Error('No backend')
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

// ── Notifications ───────────────────────────────────────────────────────────
function rowToNotif(r: Record<string, unknown>): AppNotification {
  return {
    id: String(r.id),
    type: r.type as AppNotification['type'],
    title: String(r.title),
    body: String(r.body ?? ''),
    itemId: (r.item_id as string | null) ?? null,
    read: Boolean(r.read),
    createdAt: String(r.created_at),
  }
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) return []
  return (data ?? []).map(rowToNotif)
}

export async function markNotificationsRead(): Promise<void> {
  if (!supabase) return
  await supabase.from('notifications').update({ read: true }).eq('read', false)
}

export function subscribeNotifications(
  userId: string,
  onNew: (n: AppNotification) => void,
): () => void {
  if (!supabase) return () => {}
  const sb = supabase
  const ch = sb
    .channel(`notif:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNew(rowToNotif(payload.new as Record<string, unknown>)),
    )
    .subscribe()
  return () => {
    sb.removeChannel(ch)
  }
}

// ── Wants (alert me when a match appears) ────────────────────────────────────
export async function createWant(
  query: string,
  userId: string,
  lat: number | null,
  lng: number | null,
  radiusM = 10000,
): Promise<boolean> {
  if (!supabase) return false
  const emb = await embedText(query)
  const { error } = await supabase.from('wants').insert({
    user_id: userId,
    query,
    embedding: emb ? JSON.stringify(emb) : null,
    lat,
    lng,
    radius_m: radiusM,
  })
  return !error
}

/** After posting, notify anyone whose want matches this item. */
export async function notifyMatches(itemId: string): Promise<number> {
  if (!supabase) return 0
  const { data } = await supabase.rpc('notify_matching_wants', {
    p_item_id: itemId,
  })
  return typeof data === 'number' ? data : 0
}

// ── Pickup chat ──────────────────────────────────────────────────────────────
function rowToMsg(r: Record<string, unknown>): ChatMessage {
  return {
    id: String(r.id),
    itemId: String(r.item_id),
    senderId: String(r.sender_id),
    body: String(r.body),
    createdAt: String(r.created_at),
  }
}

export async function fetchMessages(itemId: string): Promise<ChatMessage[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true })
  return (data ?? []).map(rowToMsg)
}

export async function sendMessage(
  itemId: string,
  senderId: string,
  body: string,
): Promise<void> {
  if (!supabase) return
  await supabase
    .from('messages')
    .insert({ item_id: itemId, sender_id: senderId, body })
}

export function subscribeMessages(
  itemId: string,
  onNew: (m: ChatMessage) => void,
): () => void {
  if (!supabase) return () => {}
  const sb = supabase
  const ch = sb
    .channel(`msg:${itemId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `item_id=eq.${itemId}`,
      },
      (payload) => onNew(rowToMsg(payload.new as Record<string, unknown>)),
    )
    .subscribe()
  return () => {
    sb.removeChannel(ch)
  }
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
export async function fetchLeaderboard(limit = 10): Promise<LeaderRow[]> {
  if (!supabase) return []
  const { data } = await supabase.rpc('leaderboard', { p_limit: limit })
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ownerName: String(r.owner_name ?? 'Neighbour'),
    given: Number(r.given ?? 0),
    co2: Number(r.co2 ?? 0),
  }))
}

const EMBED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Embed text via the edge function (OpenAI). Returns the raw vector. */
export async function embedText(text: string): Promise<number[] | null> {
  if (!import.meta.env.VITE_SUPABASE_URL) return null
  try {
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANON ? { Authorization: `Bearer ${ANON}`, apikey: ANON } : {}),
      },
      body: JSON.stringify({ input: text }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return Array.isArray(json.embedding) ? json.embedding : null
  } catch {
    return null
  }
}

/** Semantic "search by need": embed the query, match items by meaning. */
export async function searchItems(
  query: string,
  lat: number | null,
  lng: number | null,
): Promise<Item[] | null> {
  if (!supabase) return null
  const emb = await embedText(query)
  if (!emb) return null
  const { data, error } = await supabase.rpc('match_items', {
    query_embedding: JSON.stringify(emb),
    p_lat: lat,
    p_lng: lng,
  })
  if (error) {
    console.warn('match_items failed:', error.message)
    return null
  }
  return (data ?? []).map(rowToItem)
}

/** Ensure we have an (anonymous) identity so posting/claiming works. */
export async function ensureAuth(): Promise<string | null> {
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return user.id
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.warn('Anonymous sign-in failed:', error.message)
    return null
  }
  return data.user?.id ?? null
}

/** Nearest available + claimed items around a point, via PostGIS. */
export async function fetchItemsNear(
  lat: number,
  lng: number,
  radiusM = 8000,
): Promise<Item[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('items_near', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  })
  if (error) {
    console.warn('items_near failed:', error.message)
    return []
  }
  return (data ?? []).map(rowToItem)
}

/** Upload a photo to storage and return its public URL. */
export async function uploadPhoto(file: File, userId: string): Promise<string> {
  if (!supabase) throw new Error('No backend')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('item-photos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return supabase.storage.from('item-photos').getPublicUrl(path).data.publicUrl
}

export async function createItem(
  input: Omit<Item, 'id' | 'createdAt' | 'status'>,
  ownerId: string,
): Promise<Item> {
  if (!supabase) throw new Error('No backend')
  // Embed the listing so it's immediately findable by semantic search.
  const emb = await embedText(
    `${input.title}. ${input.description} (category: ${input.category})`,
  )
  const { data, error } = await supabase
    .from('items')
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description,
      category: input.category,
      image_url: input.imageUrl,
      lat: input.lat,
      lng: input.lng,
      location_name: input.locationName,
      co2_saved: input.co2Saved,
      owner_name: input.ownerName,
      embedding: emb ? JSON.stringify(emb) : null,
    })
    .select()
    .single()
  if (error) throw error
  return rowToItem(data)
}

export async function claimItem(id: string): Promise<Item> {
  if (!supabase) throw new Error('No backend')
  const { data, error } = await supabase.rpc('claim_item', { p_item_id: id })
  if (error) throw error
  // RPC returns the updated row (single record).
  return rowToItem(Array.isArray(data) ? data[0] : data)
}

/** Live updates: new give-aways and status changes pushed to every client. */
export function subscribeItems(
  onInsert: (item: Item) => void,
  onUpdate: (item: Item) => void,
): () => void {
  if (!supabase) return () => {}
  const sb = supabase
  const channel = sb
    .channel(`public:items:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'items' },
      (payload) => onInsert(rowToItem(payload.new as Record<string, unknown>)),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'items' },
      (payload) => onUpdate(rowToItem(payload.new as Record<string, unknown>)),
    )
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}

/** Live presence — reports how many people are browsing ReLoop right now. */
export function subscribePresence(onCount: (n: number) => void): () => void {
  if (!supabase) return () => {}
  const sb = supabase
  const key = Math.random().toString(36).slice(2)
  const ch = sb.channel('reloop-presence', {
    config: { presence: { key } },
  })
  ch.on('presence', { event: 'sync' }, () => {
    onCount(Object.keys(ch.presenceState()).length)
  }).subscribe((status) => {
    if (status === 'SUBSCRIBED') ch.track({ online_at: Date.now() })
  })
  return () => {
    sb.removeChannel(ch)
  }
}

/** Demo helper: drop a set of sample give-aways around the user. */
export async function seedNearby(
  lat: number,
  lng: number,
  ownerId: string,
): Promise<Item[]> {
  if (!supabase) return []
  const rows = generateMockItems(lat, lng).map((i) => ({
    owner_id: ownerId,
    title: i.title,
    description: i.description,
    category: i.category,
    image_url: i.imageUrl,
    lat: i.lat,
    lng: i.lng,
    location_name: i.locationName,
    co2_saved: i.co2Saved,
    status: i.status,
    owner_name: i.ownerName,
    created_at: i.createdAt,
  }))
  const { data, error } = await supabase.from('items').insert(rows).select()
  if (error) {
    console.warn('seedNearby failed:', error.message)
    return []
  }
  return (data ?? []).map(rowToItem)
}
