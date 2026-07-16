import { useState } from 'react'
import { Bell } from 'lucide-react'
import type { AppNotification } from '../lib/types'
import { timeAgo } from '../lib/time'
import { NOTIF_ICON } from '../lib/icons'

interface Props {
  notifications: AppNotification[]
  onOpenItem: (itemId: string) => void
  onMarkRead: () => void
}

export default function NotificationsBell({
  notifications,
  onOpenItem,
  onMarkRead,
}: Props) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  function toggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unread) onMarkRead()
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[900]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-[901] mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl">
            <div className="border-b border-gray-100 px-4 py-2 text-sm font-bold text-gray-800">
              Notifications
            </div>
            {notifications.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-400">
                Nothing yet — post an item or set an alert.
              </p>
            )}
            {notifications.map((n) => {
              const NIcon = NOTIF_ICON[n.type]
              return (
              <button
                key={n.id}
                onClick={() => {
                  if (n.itemId) onOpenItem(n.itemId)
                  setOpen(false)
                }}
                className={`flex w-full gap-2 border-b border-gray-50 px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                  !n.read ? 'bg-loop-50/40' : ''
                }`}
              >
                <NIcon size={18} className="mt-0.5 shrink-0 text-loop-600" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-800">
                    {n.title}
                  </span>
                  <span className="block truncate text-xs text-gray-500">{n.body}</span>
                  <span className="text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
