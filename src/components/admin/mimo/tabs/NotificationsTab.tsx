import type { MimoData } from '../useMimoData'

export function NotificationsTab({ mimo }: { mimo: MimoData }) {
  const { notifications, notificationPrefs } = mimo

  return (
    <div className="space-y-6">
      {/* Alert Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-red-400">{notifications?.alertCount ?? 0}</div>
          <div className="text-xs text-slate-400">Alerts</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-amber-400">{notifications?.warningCount ?? 0}</div>
          <div className="text-xs text-slate-400">Warnings</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-blue-400">{notifications?.unreadCount ?? 0}</div>
          <div className="text-xs text-slate-400">Unread</div>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Notifications</h3>
        <div className="space-y-2">
          {notifications?.notifications?.map((notif: any) => (
            <div key={notif.id} className={`flex items-start gap-3 p-4 rounded-xl ${
              notif.type === 'alert' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <span className="text-xl">{notif.type === 'alert' ? '🚨' : '⚠️'}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{notif.title}</span>
                  {notif.actionRequired && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold">Action Required</span>
                  )}
                </div>
                <div className="text-sm text-slate-400 mt-1">{notif.message}</div>
                <div className="text-xs text-slate-500 mt-2">{new Date(notif.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {(!notifications?.notifications || notifications.notifications.length === 0) && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-4xl mb-2">🔔</p>
              <p className="font-bold">No notifications</p>
              <p className="text-sm mt-1">All systems operating normally</p>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Alert Thresholds</h3>
        <div className="grid grid-cols-2 gap-4">
          {notificationPrefs?.thresholds && Object.entries(notificationPrefs.thresholds).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-sm text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-sm font-bold text-slate-400">{value}{key.includes('Percent') ? '%' : key.includes('Ms') ? 'ms' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}