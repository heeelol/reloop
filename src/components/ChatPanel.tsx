import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import type { ChatMessage } from '../lib/types'
import { fetchMessages, sendMessage, subscribeMessages } from '../lib/api'

interface Props {
  itemId: string
  userId: string | null
}

// Realtime pickup chat between an item's giver and its claimer.
export default function ChatPanel({ itemId, userId }: Props) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetchMessages(itemId).then((m) => active && setMsgs(m))
    const unsub = subscribeMessages(itemId, (m) =>
      setMsgs((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m])),
    )
    return () => {
      active = false
      unsub()
    }
  }, [itemId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [msgs])

  async function send() {
    const body = text.trim()
    if (!body || !userId) return
    setText('')
    await sendMessage(itemId, userId, body)
  }

  return (
    <div className="flex flex-col rounded-xl border border-loop-200 bg-loop-50/50">
      <div className="flex items-center gap-1.5 border-b border-loop-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-loop-700">
        <MessageCircle size={14} /> Arrange pickup
      </div>
      <div className="max-h-48 min-h-[64px] space-y-1.5 overflow-y-auto p-3">
        {msgs.length === 0 && (
          <p className="py-3 text-center text-xs text-gray-400">
            Say hi and agree a time & place to hand it over.
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.senderId === userId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <span
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                  mine
                    ? 'rounded-br-sm bg-loop-500 text-white'
                    : 'rounded-bl-sm bg-white text-gray-800 shadow-sm'
                }`}
              >
                {m.body}
              </span>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t border-loop-100 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message…"
          className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-loop-400"
        />
        <button
          onClick={send}
          className="rounded-full bg-loop-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-loop-600"
        >
          Send
        </button>
      </div>
    </div>
  )
}
