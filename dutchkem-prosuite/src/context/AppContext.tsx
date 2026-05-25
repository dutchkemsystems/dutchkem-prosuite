import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Payment, Client, ActivityLog, ChatSession, Document, Announcement,
  initialPayments, initialClients, initialActivities, initialChats, initialDocuments, initialAnnouncements,
  generateActivityId, formatTimeAgo
} from '../data/store';

interface Notification {
  id: number;
  type: 'payment' | 'alert' | 'system' | 'success' | 'chat';
  title: string;
  message: string;
  time: string;
  timestamp: number;
  read: boolean;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppState {
  // Data
  payments: Payment[];
  clients: Client[];
  activities: ActivityLog[];
  chats: ChatSession[];
  documents: Document[];
  announcements: Announcement[];
  notifications: Notification[];
  
  // UI State
  toasts: Toast[];
  darkMode: boolean;
  isLoading: boolean;
  
  // Live Stats
  liveStats: {
    activeUsers: number;
    activeChats: number;
    pendingPayments: number;
    queueDepth: number;
    todayRevenue: number;
  };
}

interface AppActions {
  // Payment Actions
  confirmPayment: (paymentId: string, adminEmail: string) => void;
  rejectPayment: (paymentId: string, reason: string, adminEmail: string) => void;
  
  // Client Actions
  updateClientStatus: (clientId: number, status: 'active' | 'suspended') => void;
  addClientCredit: (clientId: number, amount: number) => void;
  addClientNote: (clientId: number, note: string) => void;
  updateClientKYC: (clientId: number, kyc: 'verified' | 'pending' | 'failed') => void;
  
  // Document Actions
  approveDocument: (docId: number) => void;
  rejectDocument: (docId: number, reason: string) => void;
  
  // Chat Actions
  resolveChat: (chatId: number, satisfaction?: number) => void;
  sendAdminMessage: (chatId: number, message: string) => void;
  assignChatPriority: (chatId: number, priority: 'high' | 'medium' | 'low') => void;
  
  // Announcement Actions
  createAnnouncement: (title: string, body: string, target: string, channels: string[]) => void;
  
  // Notification Actions
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
  
  // Toast Actions
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: number) => void;
  
  // UI Actions
  toggleDarkMode: () => void;
  refreshData: () => Promise<void>;
  
  // Activity Logging
  logActivity: (type: string, detail: string, clientId?: number, clientName?: string, adminActor?: string, suspicious?: boolean) => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or defaults
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('dutchkem_payments');
    return saved ? JSON.parse(saved) : initialPayments;
  });
  
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('dutchkem_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });
  
  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('dutchkem_activities');
    return saved ? JSON.parse(saved) : initialActivities;
  });
  
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('dutchkem_chats');
    return saved ? JSON.parse(saved) : initialChats;
  });
  
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('dutchkem_documents');
    return saved ? JSON.parse(saved) : initialDocuments;
  });
  
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('dutchkem_announcements');
    return saved ? JSON.parse(saved) : initialAnnouncements;
  });
  
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: 'payment', title: 'New Payment', message: 'Adebayo submitted ₦100,000', time: '5 min ago', timestamp: Date.now() - 5*60000, read: false },
    { id: 2, type: 'alert', title: 'Suspicious Activity', message: 'Multiple failed logins from 41.58.23.100', time: '4 hours ago', timestamp: Date.now() - 4*60*60000, read: false },
    { id: 3, type: 'system', title: 'Backup Complete', message: 'Daily backup completed successfully', time: '6 hours ago', timestamp: Date.now() - 6*60*60000, read: true },
  ]);
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('dutchkem_darkMode');
    return saved === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const [liveStats, setLiveStats] = useState({
    activeUsers: 2847,
    activeChats: 5,
    pendingPayments: 3,
    queueDepth: 12,
    todayRevenue: 485000,
  });
  
  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('dutchkem_payments', JSON.stringify(payments));
  }, [payments]);
  
  useEffect(() => {
    localStorage.setItem('dutchkem_clients', JSON.stringify(clients));
  }, [clients]);
  
  useEffect(() => {
    localStorage.setItem('dutchkem_activities', JSON.stringify(activities));
  }, [activities]);
  
  useEffect(() => {
    localStorage.setItem('dutchkem_chats', JSON.stringify(chats));
  }, [chats]);
  
  useEffect(() => {
    localStorage.setItem('dutchkem_documents', JSON.stringify(documents));
  }, [documents]);
  
  useEffect(() => {
    localStorage.setItem('dutchkem_announcements', JSON.stringify(announcements));
  }, [announcements]);
  
  useEffect(() => {
    localStorage.setItem('dutchkem_darkMode', String(darkMode));
  }, [darkMode]);
  
  // Update live stats
  useEffect(() => {
    setLiveStats(prev => ({
      ...prev,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      activeChats: chats.filter(c => c.status === 'active').length,
      todayRevenue: payments.filter(p => p.status === 'confirmed').reduce((a, p) => a + p.amount, 0),
    }));
  }, [payments, chats]);
  
  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        activeUsers: Math.max(100, prev.activeUsers + Math.floor(Math.random() * 20) - 10),
        queueDepth: Math.max(0, prev.queueDepth + Math.floor(Math.random() * 5) - 2),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Toast helper
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);
  
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  // Activity logging
  const logActivity = useCallback((
    type: string,
    detail: string,
    clientId?: number,
    clientName?: string,
    adminActor?: string,
    suspicious?: boolean
  ) => {
    const newActivity: ActivityLog = {
      id: generateActivityId(activities),
      type,
      client: clientName || 'System',
      clientId: clientId || null,
      detail,
      time: 'Just now',
      timestamp: Date.now(),
      ip: '102.89.23.45', // Simulated
      device: 'Admin Dashboard',
      action: type,
      adminActor,
      suspicious,
    };
    setActivities(prev => [newActivity, ...prev]);
  }, [activities]);
  
  // Add notification
  const addNotification = useCallback((type: Notification['type'], title: string, message: string) => {
    setNotifications(prev => [{
      id: Date.now(),
      type,
      title,
      message,
      time: 'Just now',
      timestamp: Date.now(),
      read: false,
    }, ...prev]);
  }, []);
  
  // Payment Actions
  const confirmPayment = useCallback((paymentId: string, adminEmail: string) => {
    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        const updated = { ...p, status: 'confirmed' as const, confirmedBy: adminEmail, confirmedAt: Date.now(), time: formatTimeAgo(p.timestamp) };
        
        // Update client spend
        setClients(clients => clients.map(c => 
          c.id === p.clientId ? { ...c, spend: c.spend + p.amount, orders: c.orders + 1 } : c
        ));
        
        // Log activity
        logActivity('payment_confirmed', `Payment ₦${p.amount.toLocaleString()} confirmed for ${p.service}`, p.clientId, p.client, adminEmail);
        
        // Add notification
        addNotification('success', 'Payment Confirmed', `₦${p.amount.toLocaleString()} from ${p.client}`);
        
        showToast('success', `Payment ₦${p.amount.toLocaleString()} confirmed!`);
        
        return updated;
      }
      return p;
    }));
  }, [logActivity, addNotification, showToast]);
  
  const rejectPayment = useCallback((paymentId: string, reason: string, adminEmail: string) => {
    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        logActivity('payment_rejected', `Payment ₦${p.amount.toLocaleString()} rejected: ${reason}`, p.clientId, p.client, adminEmail, true);
        addNotification('alert', 'Payment Rejected', `${p.client}: ${reason}`);
        showToast('info', 'Payment rejected. Client notified.');
        return { ...p, status: 'rejected' as const, rejectReason: reason, time: formatTimeAgo(p.timestamp) };
      }
      return p;
    }));
  }, [logActivity, addNotification, showToast]);
  
  // Client Actions
  const updateClientStatus = useCallback((clientId: number, status: 'active' | 'suspended') => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        logActivity(status === 'active' ? 'client_activated' : 'client_suspended', `Client ${c.name} ${status === 'active' ? 'activated' : 'suspended'}`, clientId, c.name, 'admin@dutchkem.com');
        showToast('success', `Client ${status === 'active' ? 'activated' : 'suspended'} successfully`);
        return { ...c, status };
      }
      return c;
    }));
  }, [logActivity, showToast]);
  
  const addClientCredit = useCallback((clientId: number, amount: number) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        logActivity('credit_added', `₦${amount.toLocaleString()} credit added to ${c.name}`, clientId, c.name, 'admin@dutchkem.com');
        showToast('success', `₦${amount.toLocaleString()} credit added`);
        return { ...c, credits: c.credits + amount };
      }
      return c;
    }));
  }, [logActivity, showToast]);
  
  const addClientNote = useCallback((clientId: number, note: string) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return { ...c, notes: [...c.notes, `[${new Date().toLocaleDateString()}] ${note}`] };
      }
      return c;
    }));
    showToast('success', 'Note added');
  }, [showToast]);
  
  const updateClientKYC = useCallback((clientId: number, kyc: 'verified' | 'pending' | 'failed') => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        logActivity('kyc_updated', `KYC status for ${c.name} changed to ${kyc}`, clientId, c.name, 'admin@dutchkem.com');
        showToast('success', `KYC status updated to ${kyc}`);
        return { ...c, kyc };
      }
      return c;
    }));
  }, [logActivity, showToast]);
  
  // Document Actions
  const approveDocument = useCallback((docId: number) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        logActivity('document_approved', `Document "${d.name}" approved`, d.clientId ?? undefined, d.client, 'admin@dutchkem.com');
        showToast('success', 'Document approved');
        return { ...d, status: 'approved' as const };
      }
      return d;
    }));
  }, [logActivity, showToast]);
  
  const rejectDocument = useCallback((docId: number, reason: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        logActivity('document_rejected', `Document "${d.name}" rejected: ${reason}`, d.clientId ?? undefined, d.client, 'admin@dutchkem.com');
        showToast('info', 'Document rejected');
        return { ...d, status: 'rejected' as const, rejectReason: reason };
      }
      return d;
    }));
  }, [logActivity, showToast]);
  
  // Chat Actions
  const resolveChat = useCallback((chatId: number, satisfaction?: number) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        logActivity('chat_resolved', `Chat with ${c.client} resolved`, c.clientId, c.client, 'admin@dutchkem.com');
        showToast('success', 'Chat resolved');
        return { ...c, status: 'resolved' as const, satisfaction: satisfaction || c.satisfaction };
      }
      return c;
    }));
  }, [logActivity, showToast]);
  
  const sendAdminMessage = useCallback((chatId: number, message: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        const newMessage = { id: Date.now(), sender: 'admin' as const, content: message, timestamp: Date.now(), read: false };
        return { ...c, messages: [...c.messages, newMessage], lastMsg: message, time: 'Just now', timestamp: Date.now() };
      }
      return c;
    }));
    showToast('success', 'Message sent');
  }, [showToast]);
  
  const assignChatPriority = useCallback((chatId: number, priority: 'high' | 'medium' | 'low') => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return { ...c, priority };
      }
      return c;
    }));
    showToast('success', `Priority set to ${priority}`);
  }, [showToast]);
  
  // Announcement Actions
  const createAnnouncement = useCallback((title: string, body: string, target: string, channels: string[]) => {
    const newAnnouncement: Announcement = {
      id: Date.now(),
      title,
      body,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timestamp: Date.now(),
      target,
      channels,
      status: 'sent',
      opens: 0,
      clicks: 0,
    };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    logActivity('announcement_sent', `Announcement "${title}" sent to ${target}`, undefined, undefined, 'admin@dutchkem.com');
    addNotification('system', 'Announcement Sent', `"${title}" sent to ${target}`);
    showToast('success', 'Announcement sent successfully!');
  }, [logActivity, addNotification, showToast]);
  
  // Notification Actions
  const markNotificationRead = useCallback((id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);
  
  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('success', 'All notifications marked as read');
  }, [showToast]);
  
  // UI Actions
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);
  
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate API call
    
    // Update timestamps
    setPayments(prev => prev.map(p => ({ ...p, time: formatTimeAgo(p.timestamp) })));
    setActivities(prev => prev.map(a => ({ ...a, time: formatTimeAgo(a.timestamp) })));
    setChats(prev => prev.map(c => ({ ...c, time: formatTimeAgo(c.timestamp) })));
    
    setIsLoading(false);
    showToast('success', 'Data refreshed successfully');
  }, [showToast]);
  
  const value: AppState & AppActions = {
    // State
    payments,
    clients,
    activities,
    chats,
    documents,
    announcements,
    notifications,
    toasts,
    darkMode,
    isLoading,
    liveStats,
    
    // Actions
    confirmPayment,
    rejectPayment,
    updateClientStatus,
    addClientCredit,
    addClientNote,
    updateClientKYC,
    approveDocument,
    rejectDocument,
    resolveChat,
    sendAdminMessage,
    assignChatPriority,
    createAnnouncement,
    markNotificationRead,
    markAllNotificationsRead,
    showToast,
    dismissToast,
    toggleDarkMode,
    refreshData,
    logActivity,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
