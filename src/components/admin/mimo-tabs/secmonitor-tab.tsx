import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

interface SecMonitorTabProps {
  adminToken: string
  securityDashboard: any
  isDark: boolean
  setCommandOutput: (v: string | null) => void
  setBlockIPModal: (v: { ip: string; reason: string } | null) => void
}

export function SecMonitorTab({ adminToken, securityDashboard, isDark, setCommandOutput, setBlockIPModal }: SecMonitorTabProps) {
  const securityScan = useMutation(api.mimo_core.securityScan)
  const selfUpdate = useMutation(api.mimo_core.selfUpdate)
  const runSecurityScan = async () => { setCommandOutput('Running security scan...'); try { const r = await securityScan({ adminToken }); setCommandOutput(JSON.stringify(r, null, 2)); } catch (e: any) { setCommandOutput('Error: ' + e.message); } }
  const runSelfUpdate = async () => { setCommandOutput('Running self-update...'); try { const r = await selfUpdate({ adminToken }); setCommandOutput(JSON.stringify(r, null, 2)); } catch (e: any) { setCommandOutput('Error: ' + e.message); } }
  const statusColor = (s: string) => { switch (s) { case 'critical': return 'text-red-500'; case 'high': return 'text-orange-400'; case 'medium': return 'text-amber-400'; default: return 'text-emerald-400'; } };

  return (
          <div className="space-y-4 md:space-y-6">
            {/* Threat Level Banner */}
            <div className={`border rounded-2xl p-4 md:p-6 ${
              securityDashboard?.threatLevel === 'critical' ? 'bg-red-500/10 border-red-500/30' :
              securityDashboard?.threatLevel === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
              securityDashboard?.threatLevel === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Security Status</h3>
                  <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Real-time threat monitoring across all components</p>
                </div>
                <span className={`self-start md:self-auto px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-black uppercase ${
                  securityDashboard?.threatLevel === 'critical' ? 'bg-red-500 text-white' :
                  securityDashboard?.threatLevel === 'high' ? 'bg-orange-500 text-white' :
                  securityDashboard?.threatLevel === 'medium' ? 'bg-amber-500 text-white' :
                  'bg-emerald-500 text-white'
                }`}>
                  {securityDashboard?.threatLevel || 'low'}
                </span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Events (24h)', value: securityDashboard?.summary?.totalEvents24h ?? 0, icon: '📊', color: 'from-blue-500/20 to-blue-600/10' },
                { label: 'Critical', value: securityDashboard?.summary?.criticalEvents ?? 0, icon: '🔴', color: 'from-red-500/20 to-red-600/10' },
                { label: 'Blocked IPs', value: securityDashboard?.summary?.blockedIps ?? 0, icon: '🚫', color: 'from-purple-500/20 to-purple-600/10' },
                { label: 'Failed Logins (1h)', value: securityDashboard?.summary?.failedLogins1h ?? 0, icon: '🔑', color: 'from-amber-500/20 to-amber-600/10' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-5`}>
                  <div className="text-xl md:text-2xl mb-2">{card.icon}</div>
                  <div className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.value}</div>
                  <div className="text-[10px] md:text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Component Breakdown */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Threats by Component</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { name: 'Frontend', key: 'frontend', icon: '🌐' },
                  { name: 'Backend', key: 'backend', icon: '⚙️' },
                  { name: 'Agents', key: 'agents', icon: '🤖' },
                  { name: 'Dashboard', key: 'dashboard', icon: '📊' },
                ].map((comp) => {
                  const data = securityDashboard?.byComponent?.[comp.key];
                  return (
                    <div key={comp.key} className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} border rounded-xl p-3 md:p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg md:text-xl">{comp.icon}</span>
                        <span className={`text-xs md:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{comp.name}</span>
                      </div>
                      <div className={`text-xl md:text-2xl font-black ${data?.threats > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {data?.threats ?? 0}
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-400">threats detected</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attack Type Breakdown */}
            {securityDashboard?.attackTypes && Object.keys(securityDashboard.attackTypes).length > 0 && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Attack Types</h3>
                <div className="space-y-2">
                  {Object.entries(securityDashboard.attackTypes)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([type, count]) => (
                      <div key={type} className={`flex items-center justify-between p-2 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-lg`}>
                        <span className={`text-xs md:text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{type.replace(/_/g, ' ')}</span>
                        <span className={`text-xs md:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{count as number}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Rate Limited IPs */}
            {securityDashboard?.rateLimitedIps && securityDashboard.rateLimitedIps.length > 0 && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Rate Limited IPs</h3>
                <div className="space-y-2">
                  {securityDashboard.rateLimitedIps.map((item: any) => (
                    <div key={item.ip} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{item.ip}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] md:text-xs text-red-400">{item.count} attempts</span>
                        <button
                          onClick={() => setBlockIPModal({ ip: item.ip, reason: 'Rate limit exceeded' })}
                          className="px-2 md:px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-red-600/40"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active IP Blocks */}
            {securityDashboard?.activeBlocks && securityDashboard.activeBlocks.length > 0 && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Active IP Blocks</h3>
                <div className="space-y-2 max-h-[25vh] md:max-h-[30vh] overflow-y-auto">
                  {securityDashboard.activeBlocks.map((block: any) => (
                    <div key={block._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <div>
                          <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{block.ip}</span>
                          <div className="text-[10px] md:text-xs text-slate-400">{block.reason}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] md:text-xs text-slate-500">{new Date(block.blockedAt).toLocaleString()}</span>
                        <button
                          onClick={async () => {
                            try {
                              await unblockIPMutation({ adminToken, ip: block.ip })
                              setCommandOutput(`Unblocked ${block.ip}`)
                            } catch (err) {
                              setCommandOutput(`Error unblocking IP: ${err instanceof Error ? err.message : String(err)}`)
                            }
                          }}
                          className="px-2 md:px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-emerald-600/40"
                        >
                          Unblock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Security Events */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Recent Security Events</h3>
              <div className="space-y-2 max-h-[30vh] md:max-h-[40vh] overflow-y-auto">
                {securityDashboard?.recentEvents?.map((event: any, idx: number) => (
                  <div key={event._id || idx} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.blocked ? 'bg-red-400' : event.severity === 'critical' ? 'bg-red-500' : event.severity === 'high' ? 'bg-orange-400' : 'bg-amber-400'}`} />
                      <div>
                        <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{(event.eventType || event.category || 'unknown').replace(/_/g, ' ')}</span>
                        <div className="text-[10px] md:text-xs text-slate-400 truncate max-w-[200px] md:max-w-none">{event.description || event.details}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] md:text-xs font-bold ${statusColor(event.severity)}`}>{event.severity}</span>
                      <div className="text-[10px] md:text-xs text-slate-500">{new Date(event.timestamp || event.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {(!securityDashboard?.recentEvents || securityDashboard.recentEvents.length === 0) && (
                  <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} text-center py-4`}>No security events in the last 24 hours</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Security Actions</h3>
              <div className="flex gap-2 md:gap-3 flex-wrap">
                <button onClick={runSecurityScan} className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🛡️ Run Security Scan
                </button>
                <button onClick={runSelfUpdate} className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🔄 Self-Update
                </button>
                <button onClick={() => setBlockIPModal({ ip: '', reason: '' })} className="px-3 md:px-4 py-1.5 md:py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🚫 Block IP
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}