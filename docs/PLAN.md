# ReLoop — Implementation Plan (messaging + 2-instance demo)

Goal: turn the basic item-chat into a real **messaging system**, and make everything
shine when two instances run **side by side** (realtime chat, notifications, matching
alerts, live map). Demo is Thursday evening.

> How to apply DB changes tomorrow: paste each migration's SQL into
> **Supabase → SQL Editor** (project `obawenuortkgehznrkre`), or `npx supabase db push`
> if you link the CLI. Edge functions already deployed; no change needed there.

---

## Priorities (do in this order)

- **P1 — Messaging overhaul** (the core ask). Highest demo value.
- **P2 — Demo hardening** (cross-instance realtime, shared location, presence).
- **P3 — Stretch** (web push, clustering, ratings, impact chart) if time remains.

---

## P1 — Messaging overhaul

### What's wrong today
- Chat is **item-scoped** and only appears **after** an item is claimed
  (`ChatPanel` renders only when `canChat = claimed && (isOwner || isClaimer)`).
- No **inbox**, no **unread** counts, no **read receipts**, no **typing** indicator.
- You can't message a giver to ask a question **before** reserving.

### Target model: conversations + inbox
Move from `messages(item_id, sender_id)` to threads keyed by (item, taker):

**DB migration (`supabase/migrations/*_conversations.sql`)**
```sql
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  giver_id uuid not null references auth.users(id) on delete cascade,
  taker_id uuid not null references auth.users(id) on delete cascade,
  giver_last_read_at timestamptz,
  taker_last_read_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (item_id, taker_id)
);
alter table public.conversations enable row level security;
create policy conv_participant on public.conversations for select to authenticated
  using (giver_id = auth.uid() or taker_id = auth.uid());
create policy conv_update on public.conversations for update to authenticated
  using (giver_id = auth.uid() or taker_id = auth.uid());
alter publication supabase_realtime add table public.conversations;

-- Rebuild messages around conversations (low data — safe to drop/recreate).
drop table if exists public.messages cascade;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy msg_participant on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c
          where c.id = conversation_id and (c.giver_id = auth.uid() or c.taker_id = auth.uid())));
create policy msg_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.conversations c
          where c.id = conversation_id and (c.giver_id = auth.uid() or c.taker_id = auth.uid())));
alter publication supabase_realtime add table public.messages;

-- Get or create the conversation for the current user (taker) on an item.
create or replace function public.start_conversation(p_item_id uuid)
returns public.conversations language plpgsql security definer set search_path=public as $$
declare it public.items; conv public.conversations;
begin
  select * into it from public.items where id = p_item_id;
  if it.owner_id is null then raise exception 'No owner to message'; end if;
  if it.owner_id = auth.uid() then raise exception 'You own this item'; end if;
  select * into conv from public.conversations
    where item_id = p_item_id and taker_id = auth.uid();
  if conv.id is null then
    insert into public.conversations(item_id, giver_id, taker_id)
      values (p_item_id, it.owner_id, auth.uid()) returning * into conv;
  end if;
  return conv;
end; $$;

-- Update thread preview + notify the other party on each message.
create or replace function public.on_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare c public.conversations; other uuid; it public.items;
begin
  select * into c from public.conversations where id = new.conversation_id;
  update public.conversations
     set last_message = new.body, last_message_at = new.created_at
     where id = new.conversation_id;
  other := case when new.sender_id = c.giver_id then c.taker_id else c.giver_id end;
  select * into it from public.items where id = c.item_id;
  insert into public.notifications(user_id, type, title, body, item_id)
    values (other, 'message', 'New message · '||it.title, new.body, it.id);
  return new;
end; $$;
create trigger on_message_ins after insert on public.messages
  for each row execute function public.on_message();

-- Inbox: my conversations with unread counts + item/other-party info.
create or replace function public.my_conversations()
returns table (
  id uuid, item_id uuid, item_title text, item_image text,
  other_name text, last_message text, last_message_at timestamptz, unread int
) language sql stable as $$
  select c.id, c.item_id, i.title, i.image_url,
    case when c.giver_id = auth.uid() then tk.raw_user_meta_data->>'name' else i.owner_name end,
    c.last_message, c.last_message_at,
    (select count(*)::int from public.messages m
       where m.conversation_id = c.id and m.sender_id <> auth.uid()
         and m.created_at > coalesce(
           case when c.giver_id = auth.uid() then c.giver_last_read_at else c.taker_last_read_at end,
           'epoch'))
  from public.conversations c
  join public.items i on i.id = c.item_id
  left join auth.users tk on tk.id = c.taker_id
  where c.giver_id = auth.uid() or c.taker_id = auth.uid()
  order by c.last_message_at desc nulls last;
$$;

-- Mark a conversation read for the current participant.
create or replace function public.mark_conversation_read(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.conversations set
    giver_last_read_at = case when giver_id = auth.uid() then now() else giver_last_read_at end,
    taker_last_read_at = case when taker_id = auth.uid() then now() else taker_last_read_at end
  where id = p_id;
end; $$;
```
> Note: taker display name — anon users don't store a name in `auth.users` by default.
> Simplest fix: also store the sender's chosen name on each message (add `sender_name text`
> and pass `name` from the client), and show that. Avoids the `raw_user_meta_data` lookup.

**Client work**
- `src/lib/api.ts`: replace the item-scoped chat fns with:
  - `startConversation(itemId)` → RPC, returns conversation id.
  - `fetchConversationMessages(convId)`, `sendMessage(convId, senderId, senderName, body)`.
  - `subscribeMessages(convId, onNew)` (filter `conversation_id=eq.<id>`).
  - `fetchConversations()` → `my_conversations` RPC; `markConversationRead(convId)`.
  - Realtime `subscribeConversations(userId, onChange)` for inbox live-updates.
- `src/components/ChatPanel.tsx`: take a `conversationId` instead of `itemId`; otherwise same.
- **Message-before-claim**: in `ItemDrawer`, add a **"Message giver"** button whenever
  `!isOwner` (available or claimed). It calls `startConversation(item.id)` then opens chat.
  Keep "Reserve" separate. (canChat no longer gated on claimed.)
- **Inbox tab**: add a third left-panel tab **Messages** (next to Browse / Mine) rendering
  a `<Inbox>` list from `my_conversations` — item thumbnail, other party, last message,
  unread badge. Clicking opens `<ChatPanel>` (full-height on mobile, or in the drawer).
- **Unread everywhere**: sum of `unread` across conversations → badge on the Messages tab
  and optionally on the header (reuse the notification bell styling).

**Typing indicator (cheap, big demo wow)**
- Use a Supabase Realtime **broadcast** channel per conversation:
  `supabase.channel('typing:'+convId).on('broadcast', {event:'typing'}, ...)`.
- On input change, `channel.send({type:'broadcast', event:'typing', payload:{from:userId}})`
  (throttle ~1/sec). Show "… typing" in the other instance for ~2s after last event.
- No DB needed — pure realtime. Shows beautifully across two windows.

**Read receipts (optional, nice)**
- On opening a thread, call `mark_conversation_read`. Show a subtle "Seen" under your last
  message when the other party's `*_last_read_at` passes its timestamp (from the
  conversations realtime row).

### Acceptance for P1
- User B can **message a giver before claiming**; a thread appears in both inboxes.
- Typing in one instance shows "… typing" in the other.
- Sending a message updates the other instance live + bumps its unread badge + bell.

---

## P2 — Demo hardening (two instances side by side)

### Identity & location (get this right — it's the #1 demo gotcha)
- Two instances = two **separate anonymous users**. Use **one normal window + one
  incognito window** (separate localStorage + separate Supabase anon session). Two
  different browsers also works. Same profile in two tabs = SAME user (won't demo cross-user).
- **Same location**: both windows on the same laptop geolocate to the same spot, so items
  posted in one appear in the other. If you deny geolocation, both default to San Francisco —
  also fine. Just make sure **both do the same thing** (both allow, or both deny).
- Pre-seed a shared neighbourhood: in one instance click **🌱 Seed my neighbourhood** first,
  or pre-insert a few items near your demo location the night before.

### Make sure these cross-instance flows are crisp
1. **Live map**: B posts → marker **drops** on A's map instantly (already works via realtime).
2. **Claim notification**: A posts → B reserves → A gets "reserved 🎉" toast + confetti.
3. **Matching alert**: A sets **"Alert me: coffee table"** → B posts a coffee table →
   A gets a 🎯 match notification. (Cross-user; the killer demo moment.)
4. **Chat + typing**: reserve → both open the thread → type back and forth live.
5. **Presence**: header/map shows "2 browsing now" when both instances are open.
6. **Leaderboard** updates after a claim.

### Small demo-only helpers to add
- A **"demo reset"** affordance is handy: a dev-only button (guarded by `?demo` query param)
  that clears your listings, or re-seeds. Optional.
- Consider a fixed **demo location** override (`?lat=..&lng=..`) so both instances pin to the
  same tidy neighbourhood regardless of real geolocation. ~15 lines in `App.tsx` init.

### Demo script (≈3 min, two windows: LEFT = Ava, RIGHT = Ben)
1. **0:00** Intro: "Two neighbours, one map." Show both windows on the same street.
2. **0:20** LEFT posts a photo → AI names it + CO₂ → it **drops onto RIGHT's map live**.
3. **0:45** RIGHT: search **"something to sit on"** → semantic result. Then set
   **"Alert me: desk lamp."**
4. **1:05** LEFT posts a desk lamp → **RIGHT gets a 🎯 match notification** instantly.
5. **1:25** RIGHT reserves it → **LEFT gets "reserved 🎉" + confetti**; impact counter ticks.
6. **1:45** Both open the thread → **type back and forth, typing indicator** shows live.
7. **2:15** Show **Leaderboard** + **badges** + the **impact heatmap**.
8. **2:40** Close on the mission + the live URL. Mention PostGIS/pgvector/realtime under the hood.

---

## P3 — Stretch (only if P1+P2 are solid)

| Feature | Value | Effort | Notes |
|---|---|---|---|
| **Web push notifications** | High realism | Med-High | Service worker push + VAPID keys (Supabase secret) + a `send-push` edge function. Less critical for the demo since both instances are open (in-app realtime already notifies). |
| **Marker clustering** | Med (scale) | Med | `leaflet.markercluster` via a `useMap` effect (react-leaflet-cluster is shaky on v5). Only matters with many items. |
| **Ratings after pickup** | Med (trust) | Med | `ratings(item_id, rater_id, stars)`; prompt after "mark collected"; show avg on profile. Needs a `collected` status. |
| **Impact-over-time chart** | Med (polish) | Low-Med | SQL `date_trunc('week', created_at)` aggregate + a tiny sparkline (or a 30-line SVG). Nice in the impact bar. |

---

## Prep checklist (before Thursday)
- [ ] 🔑 **Rotate keys** (shared in plaintext): OpenAI (revoke + `supabase secrets set OPENAI_API_KEY=…`) and the Supabase PAT (delete in dashboard/account/tokens).
- [ ] Apply P1 migration; redeploy frontend (`npx vercel --prod`).
- [ ] Rehearse with **two windows** (normal + incognito), same location, pre-seeded items.
- [ ] Record the 3-min video against the live URL.
- [ ] Sanity-check RLS: a third user can't read someone else's conversation.

---

## File map (where things live)
- `src/App.tsx` — orchestration, tabs, realtime wiring, handlers.
- `src/lib/api.ts` — all Supabase calls (add conversation/inbox/typing fns here).
- `src/lib/types.ts` — add `Conversation`, update `ChatMessage`.
- `src/components/ChatPanel.tsx` — switch to `conversationId`; add typing.
- `src/components/Inbox.tsx` — NEW: conversation list.
- `src/components/ItemDrawer.tsx` — add "Message giver" (pre-claim) button.
- `supabase/migrations/` — new conversations migration.
