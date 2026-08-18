export const MIMO_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', category: 'core' },
  { id: 'cronjobs', label: 'Cron Jobs', icon: '⏰', category: 'core' },
  { id: 'agenttest', label: 'Agent Test', icon: '🧪', category: 'core' },
  { id: 'performance', label: 'Performance', icon: '⚡', category: 'monitoring' },
  { id: 'database', label: 'Database', icon: '🗄️', category: 'monitoring' },
  { id: 'config', label: 'Config', icon: '⚙️', category: 'monitoring' },
  { id: 'logs', label: 'Logs', icon: '📝', category: 'monitoring' },
  { id: 'notifications', label: 'Alerts', icon: '🔔', category: 'monitoring' },
  { id: 'apihealth', label: 'API Health', icon: '🌐', category: 'monitoring' },
  { id: 'diagnose', label: 'Diagnose', icon: '🔍', category: 'maintenance' },
  { id: 'healing', label: 'Healing', icon: '🩹', category: 'maintenance' },
  { id: 'security', label: 'Security', icon: '🛡️', category: 'maintenance' },
  { id: 'autoheal', label: 'Auto-Heal Reports', icon: '📋', category: 'maintenance' },
  { id: 'secmonitor', label: 'Security Monitor', icon: '👁️', category: 'maintenance' },
  { id: 'deployment', label: 'Deployment', icon: '🚀', category: 'maintenance' },
  { id: 'agents', label: 'Agents', icon: '🤖', category: 'maintenance' },
  { id: 'history', label: 'History', icon: '📜', category: 'maintenance' },
] as const

export const TAB_CATEGORIES = [
  { id: 'core', label: 'Core', icon: '🏠' },
  { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
] as const

export type MimoTabId = typeof MIMO_TABS[number]['id']
export type TabCategory = typeof TAB_CATEGORIES[number]['id']