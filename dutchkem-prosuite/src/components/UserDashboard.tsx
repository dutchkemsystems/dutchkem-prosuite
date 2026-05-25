import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, CreditCard, Clock, LogOut, 
  ChevronRight, Star, Shield, Zap, Settings,
  MessageCircle, FileText, Bell, Activity
} from 'lucide-react';

interface UserDashboardProps {
  setCurrentPage: (page: string) => void;
}

interface UserData {
  name: string;
  email: string;
  phone: string;
  plan: string;
  renewsOn: string;
  agentsUsed: number;
  totalAgents: number;
}

export default function UserDashboard({ setCurrentPage }: UserDashboardProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [recentActivity] = useState([
    { type: 'payment', desc: 'ProSuite Basic Plan - Paid', time: '2 hours ago', icon: CreditCard },
    { type: 'chat', desc: 'Started chat with Legal Agent', time: '5 hours ago', icon: MessageCircle },
    { type: 'document', desc: 'Generated contract document', time: '1 day ago', icon: FileText },
  ]);
  const [notifications] = useState(2);

  useEffect(() => {
    // Load user data from localStorage (in production, this comes from backend API)
    const userData = localStorage.getItem('dk_user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser({
        name: parsed.name || 'User',
        email: parsed.email || 'user@example.com',
        phone: parsed.phone || '+234 812 116 1202',
        plan: 'ProSuite Basic',
        renewsOn: 'June 15, 2025',
        agentsUsed: 7,
        totalAgents: 13,
      });
    } else {
      // Demo user for testing
      setUser({
        name: 'Demo User',
        email: 'demo@dutchkem.com',
        phone: '+234 812 116 1202',
        plan: 'ProSuite Basic',
        renewsOn: 'June 15, 2025',
        agentsUsed: 7,
        totalAgents: 13,
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dk_user');
    setCurrentPage('home');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-coral border-t-transparent rounded-full" />
      </div>
    );
  }

  const quickActions = [
    { icon: MessageCircle, label: 'New Chat', color: 'bg-coral', page: 'chat' },
    { icon: FileText, label: 'Documents', color: 'bg-forest', page: 'services' },
    { icon: CreditCard, label: 'Billing', color: 'bg-gold', page: 'pricing' },
    { icon: Settings, label: 'Settings', color: 'bg-navy', page: 'services' },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-navy to-navy-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">Welcome back, {user.name}!</h1>
                <p className="text-white/70 text-sm">Your ProSuite dashboard</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-sm font-medium"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPage(action.page)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer text-center"
            >
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <action.icon size={20} className="text-white" />
              </div>
              <span className="text-sm font-medium text-navy">{action.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Overview Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-display font-bold text-navy mb-4">Account Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-cream rounded-lg text-center">
                  <div className="text-2xl font-bold text-coral mb-1">{user.plan.split(' ')[0]}</div>
                  <div className="text-xs text-navy/60">Current Plan</div>
                </div>
                <div className="p-4 bg-cream rounded-lg text-center">
                  <div className="text-2xl font-bold text-forest mb-1">{user.renewsOn.split(' ')[0]}</div>
                  <div className="text-xs text-navy/60">Renews</div>
                </div>
                <div className="p-4 bg-cream rounded-lg text-center">
                  <div className="text-2xl font-bold text-gold mb-1">{user.agentsUsed}</div>
                  <div className="text-xs text-navy/60">Agents Used</div>
                </div>
                <div className="p-4 bg-cream rounded-lg text-center">
                  <div className="text-2xl font-bold text-navy mb-1">{user.totalAgents}</div>
                  <div className="text-xs text-navy/60">Total Agents</div>
                </div>
              </div>
            </div>

            {/* Subscription Progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-navy">Agent Usage</h2>
                <button className="text-sm text-coral hover:text-coral-dark font-medium cursor-pointer">
                  Upgrade Plan
                </button>
              </div>
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-navy/70">{user.agentsUsed} of {user.totalAgents} agents used</span>
                <span className="font-medium text-navy">{Math.round((user.agentsUsed / user.totalAgents) * 100)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(user.agentsUsed / user.totalAgents) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-coral to-gold rounded-full"
                />
              </div>
              <p className="text-xs text-navy/50 mt-3">
                Upgrade to ProSuite Pro for access to all 13 AI agents
              </p>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-display font-bold text-navy mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-3 bg-cream/50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-coral/10 rounded-lg flex items-center justify-center">
                      <activity.icon size={18} className="text-coral" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy">{activity.desc}</p>
                      <p className="text-xs text-navy/50">{activity.time}</p>
                    </div>
                    <ChevronRight size={16} className="text-navy/30" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center">
                  <Star size={20} className="text-coral" />
                </div>
                <div>
                  <h3 className="font-bold text-navy">{user.plan}</h3>
                  <p className="text-xs text-navy/60">Active</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-navy/40" />
                  <span className="text-navy/70 truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-navy/40" />
                  <span className="text-navy/70">{user.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-navy/40" />
                  <span className="text-navy/70">Renews {user.renewsOn}</span>
                </div>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy">Notifications</h3>
                {notifications > 0 && (
                  <span className="px-2 py-1 bg-coral text-white text-xs rounded-full font-medium">
                    {notifications}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-cream/50 rounded-lg">
                  <Bell size={16} className="text-gold mt-0.5" />
                  <div>
                    <p className="text-sm text-navy">Your subscription renews in 5 days</p>
                    <p className="text-xs text-navy/50">2 days ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-cream/50 rounded-lg">
                  <Activity size={16} className="text-forest mt-0.5" />
                  <div>
                    <p className="text-sm text-navy">New agent available: Finance Advisor</p>
                    <p className="text-xs text-navy/50">1 week ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Card */}
            <div className="bg-gradient-to-br from-coral to-coral-dark rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={20} />
                <h3 className="font-bold">ProSuite Pro</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/90 mb-4">
                <li className="flex items-center gap-2">
                  <Shield size={14} />
                  <span>All 13 AI Agents</span>
                </li>
                <li className="flex items-center gap-2">
                  <Star size={14} />
                  <span>Priority Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap size={14} />
                  <span>Advanced Features</span>
                </li>
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 bg-white text-coral font-semibold rounded-lg hover:bg-white/90 transition-colors cursor-pointer text-sm"
              >
                Upgrade Now
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}