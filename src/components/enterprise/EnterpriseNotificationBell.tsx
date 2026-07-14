import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface EnterpriseNotificationBellProps {
  token: string
}

export function EnterpriseNotificationBell({ token }: EnterpriseNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const data = useQuery(
    api.enterprise_notifications.getEnterpriseNotifications,
    token ? { token, limit: 20 } : 'skip'
  )
  const markRead = useMutation(api.enterprise_notifications.markEnterpriseNotificationRead)
  const markAllRead = useMutation(api.enterprise_notifications.markAllEnterpriseRead)

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  const handleMarkRead = async (id: string) => {
    await markRead({ notificationId: id as any, token })
  }

  const handleMarkAllRead = async () => {
    await markAllRead({ token })
  }

  const typeIcons: Record<string, string> = {
    payment: '💳',
    subscription: '📋',
    agent: '🤖',
    workflow: '🔄',
    security: '🔐',
    system: '📢',
    default: '🔔',
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border relative ${
          isOpen
            ? 'bg-orange-500 border-orange-400 text-white shadow-lg'
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-slate-950 font-black shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-4 w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-widest">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-orange-400 uppercase hover:text-orange-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n._id}
                    onClick={() => !n.read && handleMarkRead(n._id)}
                    className={`p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors cursor-pointer ${
                      !n.read ? 'bg-orange-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {typeIcons[n.type] || typeIcons.default}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black truncate">{n.title}</p>
                          {!n.read && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-1 font-bold uppercase">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <button className="w-full py-3 bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
              View All Notifications
            </button>
          </div>
        </>
      )}
    </div>
  )
}
