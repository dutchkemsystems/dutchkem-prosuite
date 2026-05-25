import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CreditCard, Users, Activity, BarChart3, FileText,
  MessageSquare, Megaphone, ChevronLeft, ChevronRight, LogOut, Search,
  Eye, Check, X, Download, Clock, TrendingUp, DollarSign, AlertTriangle,
  Shield, Bell, Settings, Filter, Lock, AlertCircle, EyeOff,
  RefreshCw, Calendar, MapPin, Phone, Mail, FileImage,
  Server, CheckCircle, XCircle, Send,
  ExternalLink, PieChart, UserCheck,
  Ban, Gift, Layers, Target,
  ArrowUpRight, ArrowDownRight, MessageCircle,
  Moon, Sun, Info,
  Printer, Fingerprint,
  ShieldCheck, Receipt, Bot, Radio
} from 'lucide-react';

import { isTOTPRegistered, verifyStoredTOTP, registerTOTP, generateSecret, getTOTPUri } from '../security/totp';

// ── ADMIN AUTH ──
const _dc = (a: number[]) => a.map(c => String.fromCharCode(c)).join('');
const ADMIN_CREDENTIALS = {
  get email() { return _dc([97,100,109,105,110,64,100,117,116,99,104,107,101,109,46,99,111,109]); },
  get password() { return _dc([68,117,116,99,104,107,101,109,64,50,48,50,52,33]); },
};

const BRUTE_FORCE_MAX = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

interface AdminDashboardProps {
  setCurrentPage: (page: string) => void;
}

type AdminTab = 'overview' | 'payments' | 'clients' | 'activity' | 'revenue' | 'documents' | 'chats' | 'announcements' | 'settings' | 'reports';

// ─── MOCK DATA ───
const mockPayments = [
  { id: 'PAY-001', client: 'Adebayo Ogunlesi', phone: '08031234567', email: 'adebayo@gmail.com', service: 'Academic Pro - Thesis', amount: 100000, amountClaimed: 100000, status: 'pending', time: '5 min ago', ref: '08031234567_A1', receipt: '/receipts/001.jpg', agent: 'A1' },
  { id: 'PAY-002', client: 'Chidinma Eze', phone: '08098765432', email: 'chidi@yahoo.com', service: 'ServiceMart - NIN/BVN', amount: 2500, amountClaimed: 2500, status: 'confirmed', time: '15 min ago', ref: '08098765432_A13', receipt: '/receipts/002.jpg', agent: 'A13' },
  { id: 'PAY-003', client: 'Ibrahim Musa', phone: '07061234567', email: 'ibrahim@gmail.com', service: 'MediaStudio - Video Edit', amount: 35000, amountClaimed: 35000, status: 'pending', time: '32 min ago', ref: '07061234567_A8', receipt: '/receipts/003.jpg', agent: 'A8' },
  { id: 'PAY-004', client: 'Ngozi Okafor', phone: '09012345678', email: 'ngozi@outlook.com', service: 'PhoneRetriever - GPS', amount: 15000, amountClaimed: 14500, status: 'rejected', time: '1 hour ago', ref: '09012345678_A10', receipt: '/receipts/004.jpg', agent: 'A10', rejectReason: 'Amount mismatch: ₦500 short' },
  { id: 'PAY-005', client: 'Tunde Bakare', phone: '08181234567', email: 'tunde@gmail.com', service: 'StatsPro - Full Package', amount: 50000, amountClaimed: 50000, status: 'confirmed', time: '2 hours ago', ref: '08181234567_A5', receipt: '/receipts/005.jpg', agent: 'A5' },
  { id: 'PAY-006', client: 'Folake Adeyemi', phone: '08141234567', email: 'folake@gmail.com', service: 'DataPro - Power BI', amount: 30000, amountClaimed: 30000, status: 'pending', time: '3 hours ago', ref: '08141234567_A9', receipt: '/receipts/006.jpg', agent: 'A9' },
  { id: 'PAY-007', client: 'Emeka Obi', phone: '08051234567', email: 'emeka@gmail.com', service: 'BusinessPro - Pitch Deck', amount: 60000, amountClaimed: 60000, status: 'confirmed', time: '4 hours ago', ref: '08051234567_A12', receipt: '/receipts/007.jpg', agent: 'A12' },
  { id: 'PAY-008', client: 'Amina Yusuf', phone: '08061234567', email: 'amina@gmail.com', service: 'ContentPro - Growth Package', amount: 150000, amountClaimed: 150000, status: 'expired', time: '2 days ago', ref: '08061234567_A11', receipt: '/receipts/008.jpg', agent: 'A11' },
];

const mockClients = [
  { id: 1, name: 'Adebayo Ogunlesi', phone: '08031234567', email: 'adebayo@gmail.com', state: 'Lagos', lga: 'Ikeja', spend: 350000, orders: 12, status: 'active', joined: '2024-01-15', lastLogin: '2 hours ago', kyc: 'verified', referrals: 3, referrer: null, nin: '12345678901', avatar: null },
  { id: 2, name: 'Chidinma Eze', phone: '08098765432', email: 'chidi@yahoo.com', state: 'Ogun', lga: 'Abeokuta South', spend: 125000, orders: 8, status: 'active', joined: '2024-02-20', lastLogin: '5 hours ago', kyc: 'verified', referrals: 1, referrer: 'Adebayo O.', nin: '23456789012', avatar: null },
  { id: 3, name: 'Ibrahim Musa', phone: '07061234567', email: 'ibrahim@gmail.com', state: 'Oyo', lga: 'Ibadan North', spend: 85000, orders: 5, status: 'active', joined: '2024-03-10', lastLogin: '1 day ago', kyc: 'pending', referrals: 0, referrer: null, nin: null, avatar: null },
  { id: 4, name: 'Ngozi Okafor', phone: '09012345678', email: 'ngozi@outlook.com', state: 'Osun', lga: 'Osogbo', spend: 45000, orders: 3, status: 'suspended', joined: '2024-04-05', lastLogin: '3 days ago', kyc: 'failed', referrals: 0, referrer: 'Tunde B.', nin: '34567890123', avatar: null },
  { id: 5, name: 'Tunde Bakare', phone: '08181234567', email: 'tunde@gmail.com', state: 'Ekiti', lga: 'Ado-Ekiti', spend: 220000, orders: 15, status: 'active', joined: '2024-01-28', lastLogin: '30 min ago', kyc: 'verified', referrals: 5, referrer: null, nin: '45678901234', avatar: null },
  { id: 6, name: 'Folake Adeyemi', phone: '08141234567', email: 'folake@gmail.com', state: 'Lagos', lga: 'Lekki', spend: 180000, orders: 10, status: 'active', joined: '2024-02-14', lastLogin: '1 hour ago', kyc: 'verified', referrals: 2, referrer: 'Adebayo O.', nin: '56789012345', avatar: null },
];

const mockActivities = [
  { id: 1, type: 'payment_confirmed', client: 'Chidinma Eze', clientId: 2, detail: 'Payment ₦2,500 confirmed for NIN/BVN', time: '5 min ago', timestamp: Date.now() - 5*60000, ip: '102.89.23.45', device: 'Chrome/Windows', action: 'admin_confirmed_payment' },
  { id: 2, type: 'login_success', client: 'Adebayo Ogunlesi', clientId: 1, detail: 'Logged in via OTP', time: '12 min ago', timestamp: Date.now() - 12*60000, ip: '197.210.56.78', device: 'Safari/iPhone', action: 'login_success' },
  { id: 3, type: 'payment_submitted', client: 'Ibrahim Musa', clientId: 3, detail: 'Payment ₦35,000 submitted for Video Editing', time: '32 min ago', timestamp: Date.now() - 32*60000, ip: '41.203.67.89', device: 'Chrome/Android', action: 'payment_submitted' },
  { id: 4, type: 'service_completed', client: 'Tunde Bakare', clientId: 5, detail: 'StatsPro full package completed', time: '1 hour ago', timestamp: Date.now() - 60*60000, ip: '105.112.45.67', device: 'Firefox/Mac', action: 'service_completed' },
  { id: 5, type: 'payment_rejected', client: 'Ngozi Okafor', clientId: 4, detail: 'Payment rejected - amount mismatch', time: '1 hour ago', timestamp: Date.now() - 65*60000, ip: '154.118.23.45', device: 'Chrome/Windows', action: 'admin_rejected_payment', suspicious: true },
  { id: 6, type: 'chat_started', client: 'Folake Adeyemi', clientId: 6, detail: 'Started chat with DataPro agent', time: '3 hours ago', timestamp: Date.now() - 180*60000, ip: '102.89.34.56', device: 'Chrome/Mac', action: 'chat_started' },
  { id: 7, type: 'login_failed', client: 'Unknown', clientId: null, detail: 'Failed login attempt (wrong OTP)', time: '4 hours ago', timestamp: Date.now() - 240*60000, ip: '41.58.23.100', device: 'Chrome/Windows', action: 'login_failed', suspicious: true },
  { id: 8, type: 'document_uploaded', client: 'Ibrahim Musa', clientId: 3, detail: 'Uploaded police_report.pdf (verified)', time: '5 hours ago', timestamp: Date.now() - 300*60000, ip: '41.203.67.89', device: 'Chrome/Android', action: 'document_uploaded' },
];

const mockChats = [
  { id: 1, client: 'Adebayo Ogunlesi', clientId: 1, agent: 'Academic Pro', agentId: 'A1', lastMsg: 'Can you help with my thesis chapter 3?', time: '2 min ago', unread: 2, status: 'active', priority: 'high', satisfaction: null },
  { id: 2, client: 'Ibrahim Musa', clientId: 3, agent: 'MediaStudio Pro', agentId: 'A8', lastMsg: 'I need the video edited by Friday', time: '5 min ago', unread: 0, status: 'active', priority: 'medium', satisfaction: null },
  { id: 3, client: 'Folake Adeyemi', clientId: 6, agent: 'DataPro', agentId: 'A9', lastMsg: 'The Power BI dashboard looks great!', time: '12 min ago', unread: 1, status: 'active', priority: 'low', satisfaction: 5 },
  { id: 4, client: 'Ngozi Okafor', clientId: 4, agent: 'PhoneRetriever', agentId: 'A10', lastMsg: 'Here is my police report', time: '30 min ago', unread: 0, status: 'waiting', priority: 'high', satisfaction: null },
  { id: 5, client: 'Tunde Bakare', clientId: 5, agent: 'StatsPro', agentId: 'A5', lastMsg: 'Please run ANOVA on the data', time: '1 hour ago', unread: 3, status: 'active', priority: 'medium', satisfaction: null },
  { id: 6, client: 'Emeka Obi', clientId: 7, agent: 'BusinessPro', agentId: 'A12', lastMsg: 'Perfect! The pitch deck is ready', time: '2 hours ago', unread: 0, status: 'resolved', priority: 'low', satisfaction: 5 },
];

const mockDocuments = [
  { id: 1, name: 'Payment_receipt_001.pdf', client: 'Adebayo Ogunlesi', clientId: 1, type: 'Receipt', date: '2 hours ago', size: '245 KB', scan: 'Clean', status: 'approved', hash: 'abc123...' },
  { id: 2, name: 'thesis_chapter3.docx', client: 'Chidinma Eze', clientId: 2, type: 'Document', date: '5 hours ago', size: '1.2 MB', scan: 'Clean', status: 'approved', hash: 'def456...' },
  { id: 3, name: 'police_report.pdf', client: 'Ibrahim Musa', clientId: 3, type: 'Official', date: '1 day ago', size: '890 KB', scan: 'Clean', status: 'pending', hash: 'ghi789...' },
  { id: 4, name: 'NIN_slip_scan.jpg', client: 'Ngozi Okafor', clientId: 4, type: 'ID', date: '1 day ago', size: '156 KB', scan: 'Clean', status: 'rejected', rejectReason: 'Image quality too low', hash: 'jkl012...' },
  { id: 5, name: 'proof_of_payment.png', client: 'Tunde Bakare', clientId: 5, type: 'Receipt', date: '2 days ago', size: '320 KB', scan: 'Clean', status: 'approved', hash: 'mno345...' },
  { id: 6, name: 'research_data.xlsx', client: 'Folake Adeyemi', clientId: 6, type: 'Data', date: '3 days ago', size: '2.1 MB', scan: 'Clean', status: 'approved', hash: 'pqr678...' },
  { id: 7, name: 'suspicious_file.exe', client: 'Unknown', clientId: null, type: 'Unknown', date: '4 days ago', size: '5.2 MB', scan: 'Threat detected', status: 'quarantined', hash: 'stu901...' },
];

const mockAnnouncements = [
  { id: 1, title: 'System Maintenance Notice', body: 'Our services will be briefly unavailable on Saturday from 2-4 AM.', date: 'Jan 15, 2024', target: 'All Clients', channels: ['SMS', 'Email'], status: 'sent', opens: 2847, clicks: 456 },
  { id: 2, title: 'New Agent: PhoneRetriever', body: 'We\'re excited to announce our new phone recovery service!', date: 'Jan 10, 2024', target: 'All Clients', channels: ['SMS', 'Email', 'WhatsApp'], status: 'sent', opens: 3102, clicks: 891 },
  { id: 3, title: 'Holiday Discount: 20% Off', body: 'Enjoy 20% off all services this festive season.', date: 'Dec 20, 2023', target: 'All Clients', channels: ['Email'], status: 'sent', opens: 1893, clicks: 234 },
  { id: 4, title: 'Upcoming: AI Voice Features', body: 'Stay tuned for our new AI voice cloning capabilities.', date: 'Jan 20, 2024', target: 'MediaStudio Users', channels: ['Email'], status: 'scheduled', opens: 0, clicks: 0 },
];

const agentsList = [
  { id: 'A1', name: 'Academic Pro', icon: '🎓', status: 'online', load: 78, chats: 12, avgResponse: '1.2m' },
  { id: 'A2', name: 'FormatPro', icon: '📝', status: 'online', load: 45, chats: 5, avgResponse: '0.8m' },
  { id: 'A3', name: 'LitReview Pro', icon: '📚', status: 'online', load: 62, chats: 8, avgResponse: '1.5m' },
  { id: 'A4', name: 'Plagiarism Pro', icon: '🔍', status: 'online', load: 55, chats: 6, avgResponse: '0.9m' },
  { id: 'A5', name: 'StatsPro', icon: '📊', status: 'online', load: 70, chats: 9, avgResponse: '2.1m' },
  { id: 'A6', name: 'Presentation Pro', icon: '🎨', status: 'online', load: 40, chats: 4, avgResponse: '1.0m' },
  { id: 'A7', name: 'Grant Pro', icon: '🏆', status: 'online', load: 35, chats: 3, avgResponse: '1.8m' },
  { id: 'A8', name: 'MediaStudio', icon: '🎬', status: 'online', load: 85, chats: 15, avgResponse: '2.5m' },
  { id: 'A9', name: 'DataPro', icon: '💾', status: 'online', load: 58, chats: 7, avgResponse: '1.3m' },
  { id: 'A10', name: 'PhoneRetriever', icon: '📱', status: 'maintenance', load: 0, chats: 0, avgResponse: '-' },
  { id: 'A11', name: 'ContentPro', icon: '📣', status: 'online', load: 72, chats: 10, avgResponse: '1.1m' },
  { id: 'A12', name: 'BusinessPro', icon: '💼', status: 'online', load: 65, chats: 8, avgResponse: '1.7m' },
  { id: 'A13', name: 'ServiceMart', icon: '🏛️', status: 'online', load: 90, chats: 18, avgResponse: '0.7m' },
];

const revenueData = {
  today: 485000,
  yesterday: 412000,
  thisWeek: 2850000,
  lastWeek: 2340000,
  thisMonth: 12400000,
  lastMonth: 10800000,
  daily: [380, 420, 350, 485, 520, 410, 395, 450, 480, 510, 390, 425, 460, 490, 530, 470, 445, 500, 485, 510, 475, 490, 520, 480, 495, 530, 545, 510, 485, 520],
  byService: [
    { name: 'Academic Pro', value: 3200000, pct: 26, color: '#0A5FA8' },
    { name: 'ServiceMart NG', value: 2800000, pct: 23, color: '#1A7A4A' },
    { name: 'MediaStudio', value: 1900000, pct: 15, color: '#E8533A' },
    { name: 'BusinessPro', value: 1500000, pct: 12, color: '#0A1F44' },
    { name: 'PhoneRetriever', value: 1200000, pct: 10, color: '#F5A623' },
    { name: 'Others', value: 1800000, pct: 14, color: '#9CA3AF' },
  ],
  byState: [
    { name: 'Lagos', value: 5200000 },
    { name: 'Ogun', value: 2100000 },
    { name: 'Oyo', value: 1800000 },
    { name: 'Osun', value: 1400000 },
    { name: 'Ondo', value: 1100000 },
    { name: 'Ekiti', value: 800000 },
  ],
};

export default function AdminDashboard({ setCurrentPage }: AdminDashboardProps) {
  // ─── AUTH STATE ───
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa' | 'mfa_setup'>('credentials');
  const [totpSecret, setTotpSecret] = useState('');
  const [_totpUri, setTotpUri] = useState('');
  const [_totpTimeLeft, _setTotpTimeLeft] = useState(30);
  const [loginError, setLoginError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  // ─── SESSION STATE ───
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  // ─── DASHBOARD STATE ───
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, type: 'payment', title: 'New Payment', message: 'Adebayo submitted ₦100,000', time: '5 min ago', read: false },
    { id: 2, type: 'alert', title: 'Suspicious Activity', message: 'Multiple failed logins from 41.58.23.100', time: '4 hours ago', read: false },
    { id: 3, type: 'system', title: 'Backup Complete', message: 'Daily backup completed successfully', time: '6 hours ago', read: true },
  ]);

  // ─── FILTERS & MODALS ───
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<typeof mockPayments[0] | null>(null);
  const [selectedClient, setSelectedClient] = useState<typeof mockClients[0] | null>(null);
  const [_selectedDocument, _setSelectedDocument] = useState<typeof mockDocuments[0] | null>(null);
  const [_selectedChat, _setSelectedChat] = useState<typeof mockChats[0] | null>(null);
  const [activityFilter, setActivityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState<{ type: string; data: any } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ─── REAL-TIME COUNTERS ───
  const [liveStats, setLiveStats] = useState({
    activeUsers: 2847,
    activeChats: 5,
    pendingPayments: 3,
    queueDepth: 12,
  });

  // Simulate real-time updates
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 10) - 5,
        activeChats: Math.max(0, prev.activeChats + Math.floor(Math.random() * 3) - 1),
        pendingPayments: prev.pendingPayments,
        queueDepth: Math.max(0, prev.queueDepth + Math.floor(Math.random() * 5) - 2),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Show toast
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1500));
    setRefreshing(false);
    showToast('success', 'Data refreshed successfully');
  };

  // ─── LOCKOUT COUNTDOWN TIMER ───
  useEffect(() => {
    if (!lockedUntil) { setLockCountdown(0); return; }
    const interval = setInterval(() => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
        setLoginError('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // ─── SESSION TIMEOUT ───
  const resetSessionTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);
    setSessionWarning(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetSessionTimer));
    const interval = setInterval(() => {
      if (!sessionExpiry) return;
      const remaining = sessionExpiry - Date.now();
      if (remaining <= 0) handleLogout();
      else if (remaining <= 2 * 60 * 1000) setSessionWarning(true);
    }, 10_000);
    return () => {
      events.forEach(e => window.removeEventListener(e, resetSessionTimer));
      clearInterval(interval);
    };
  }, [isLoggedIn, sessionExpiry, resetSessionTimer]);

  // ─── LOGIN HANDLER ───
  const handleLogin = async () => {
    if (lockedUntil && Date.now() < lockedUntil) return;
    setLoginError('');
    setIsValidating(true);
    await new Promise(r => setTimeout(r, 800));

    if (loginStep === 'credentials') {
      if (email.trim().toLowerCase() !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
        const newFails = failedAttempts + 1;
        setFailedAttempts(newFails);
        if (newFails >= BRUTE_FORCE_MAX) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
          setLoginError('Account locked. Too many failed attempts.');
        } else {
          setLoginError(`Invalid credentials. ${BRUTE_FORCE_MAX - newFails} attempt(s) remaining.`);
        }
        setIsValidating(false);
        return;
      }
      // Check if Google Authenticator is set up
      if (isTOTPRegistered()) {
        setLoginStep('mfa');
      } else {
        // First time — generate new TOTP secret for setup
        const secret = generateSecret();
        setTotpSecret(secret);
        setTotpUri(getTOTPUri(secret, ADMIN_CREDENTIALS.email));
        setLoginStep('mfa_setup');
      }
      setIsValidating(false);
      return;
    }

    // MFA verification — either setup confirmation or regular login
    if (loginStep === 'mfa_setup') {
      // Verifying the first code after scanning QR
      const { verifyTOTP } = await import('../security/totp');
      const valid = await verifyTOTP(totpSecret, mfaCode);
      if (valid) {
        // Save the encrypted secret permanently
        await registerTOTP(totpSecret, password);
        setIsLoggedIn(true);
        setFailedAttempts(0);
        setLoginError('');
        setIsValidating(false);
        resetSessionTimer();
        return;
      }
      setLoginError('Invalid code. Make sure you scanned the QR code correctly and try the current code.');
      setMfaCode('');
      setIsValidating(false);
      return;
    }

    // Regular MFA login with stored TOTP
    const valid = await verifyStoredTOTP(mfaCode, password);
    if (!valid) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      if (newFails >= BRUTE_FORCE_MAX) {
        setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
        setLoginStep('credentials');
        setPassword('');
        setMfaCode('');
        setLoginError('Account locked. Too many failed attempts.');
      } else {
        setLoginError(`Invalid authenticator code. ${BRUTE_FORCE_MAX - newFails} attempt(s) remaining.`);
        setMfaCode('');
      }
      setIsValidating(false);
      return;
    }

    setIsLoggedIn(true);
    setFailedAttempts(0);
    setLoginError('');
    setIsValidating(false);
    resetSessionTimer();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setMfaCode('');
    setLoginStep('credentials');
    setLoginError('');
    setSessionExpiry(null);
    setSessionWarning(false);
    setActiveTab('overview');
  };

  const isLocked = !!(lockedUntil && Date.now() < lockedUntil);
  const formatCountdown = (ms: number) => `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, '0')}`;
  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`;

  // ═══════════════════════════════════════════════
  //  LOGIN SCREEN
  // ═══════════════════════════════════════════════
  if (!isLoggedIn) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-navy via-navy-dark to-navy flex items-center justify-center p-4 pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <img
              src="/images/dutchkem-logo.png"
              alt="Dutchkem Ventures"
              className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-xl rounded-xl"
            />
            <h2 className="font-display text-2xl font-bold text-navy">Admin Dashboard</h2>
            <p className="text-navy/50 text-sm mt-2">
              {loginStep === 'credentials' ? 'Enter your admin credentials' : 'Enter MFA code from authenticator'}
            </p>
          </div>

          {isLocked && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-coral/10 border border-coral/20 rounded-xl flex items-start gap-3">
              <Lock size={18} className="text-coral shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-coral">Account Locked</p>
                <p className="text-xs text-coral/70 mt-0.5">Too many failed login attempts.</p>
                <p className="text-sm font-mono font-bold text-coral mt-2">Try again in: {formatCountdown(lockCountdown)}</p>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {loginError && !isLocked && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 p-3 bg-coral/10 border border-coral/20 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="text-coral shrink-0" />
                <p className="text-sm text-coral">{loginError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {failedAttempts > 0 && !isLocked && (
            <div className="mb-4 flex items-center justify-center gap-1.5">
              {Array.from({ length: BRUTE_FORCE_MAX }).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < failedAttempts ? 'bg-coral' : 'bg-gray-200'}`} />
              ))}
            </div>
          )}

          {loginStep === 'credentials' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-navy/70 block mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setLoginError(''); }} onKeyDown={(e) => e.key === 'Enter' && !isLocked && handleLogin()} placeholder="Enter admin email" disabled={isLocked || isValidating} className="w-full px-4 py-3 bg-cream rounded-xl text-navy border border-gray-100 focus:border-navy focus:outline-none disabled:opacity-50" autoFocus autoComplete="off" />
              </div>
              <div>
                <label className="text-sm font-medium text-navy/70 block mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(''); }} onKeyDown={(e) => e.key === 'Enter' && !isLocked && handleLogin()} placeholder="••••••••••••" disabled={isLocked || isValidating} className="w-full px-4 py-3 pr-12 bg-cream rounded-xl text-navy border border-gray-100 focus:border-navy focus:outline-none disabled:opacity-50" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-navy/30 hover:text-navy cursor-pointer" tabIndex={-1}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button onClick={handleLogin} disabled={!email || !password || isLocked || isValidating} className="w-full py-3.5 bg-gradient-to-r from-navy to-navy-dark text-white font-semibold rounded-xl disabled:opacity-50 cursor-pointer hover:shadow-lg transition-all flex items-center justify-center gap-2">
                {isValidating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : <><Lock size={16} /> Continue to MFA</>}
              </button>
            </div>
          ) : loginStep === 'mfa_setup' ? (
            /* ── FIRST TIME: Google Authenticator Setup ── */
            <div className="space-y-4">
              <div className="bg-gold/5 rounded-xl p-4 border border-gold/20 text-center">
                <Shield size={24} className="text-gold mx-auto mb-2" />
                <h3 className="font-bold text-navy text-sm">Set Up Google Authenticator</h3>
                <p className="text-xs text-navy/50 mt-1">This is a one-time setup. Once registered, you'll need the authenticator app to log in.</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-navy/70 font-medium">Step 1: Install Google Authenticator</p>
                <p className="text-xs text-navy/50">Download from App Store (iPhone) or Play Store (Android)</p>

                <p className="text-sm text-navy/70 font-medium mt-3">Step 2: Add your account</p>
                <p className="text-xs text-navy/50">Open the app → tap + → "Enter a setup key" and enter:</p>
                
                <div className="bg-cream rounded-xl p-3 border border-gray-200">
                  <p className="text-[10px] text-navy/40 uppercase mb-1">Your Secret Key (enter this in the app)</p>
                  <p className="font-mono text-sm text-navy font-bold tracking-wider break-all select-all">{totpSecret}</p>
                  <p className="text-[10px] text-navy/30 mt-1">Account: Dutchkem Admin • Type: Time-based</p>
                </div>

                <p className="text-sm text-navy/70 font-medium mt-3">Step 3: Enter the 6-digit code shown in the app</p>
              </div>

              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input key={i} id={`mfa-${i}`} type="text" inputMode="numeric" maxLength={1} value={mfaCode[i] || ''} disabled={isLocked || isValidating}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        const newCode = mfaCode.split(''); newCode[i] = val; setMfaCode(newCode.join('')); setLoginError('');
                        if (val && i < 5) document.getElementById(`mfa-${i + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !mfaCode[i] && i > 0) document.getElementById(`mfa-${i - 1}`)?.focus(); if (e.key === 'Enter' && mfaCode.length === 6) handleLogin(); }}
                    className="w-12 h-14 text-center text-xl font-mono font-bold bg-cream rounded-xl border-2 border-gray-200 focus:border-gold focus:outline-none text-navy disabled:opacity-50"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button onClick={handleLogin} disabled={mfaCode.length < 6 || isLocked || isValidating} className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-dark text-navy font-semibold rounded-xl disabled:opacity-50 cursor-pointer hover:shadow-lg transition-all flex items-center justify-center gap-2">
                {isValidating ? <><span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> Registering...</> : <><ShieldCheck size={16} /> Register & Login</>}
              </button>
              <button onClick={() => { setLoginStep('credentials'); setMfaCode(''); setPassword(''); setLoginError(''); }} className="w-full text-center text-sm text-navy/40 hover:text-navy cursor-pointer">← Use different credentials</button>
            </div>
          ) : (
            /* ── REGULAR LOGIN: Enter Google Authenticator Code ── */
            <div className="space-y-4">
              <div className="bg-forest/5 rounded-xl p-3 border border-forest/10 flex items-center gap-2">
                <CheckCircle size={16} className="text-forest" />
                <span className="text-sm text-navy/60">Credentials verified for <strong className="text-navy">{email}</strong></span>
              </div>

              <div className="text-center">
                <Shield size={20} className="text-navy/40 mx-auto mb-1" />
                <p className="text-sm text-navy/70">Enter the 6-digit code from your<br /><strong className="text-navy">Google Authenticator</strong> app</p>
                <p className="text-xs text-navy/30 mt-1">Code refreshes every 30 seconds</p>
              </div>

              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input key={i} id={`mfa-${i}`} type="text" inputMode="numeric" maxLength={1} value={mfaCode[i] || ''} disabled={isLocked || isValidating}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        const newCode = mfaCode.split(''); newCode[i] = val; setMfaCode(newCode.join('')); setLoginError('');
                        if (val && i < 5) document.getElementById(`mfa-${i + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !mfaCode[i] && i > 0) document.getElementById(`mfa-${i - 1}`)?.focus(); if (e.key === 'Enter' && mfaCode.length === 6) handleLogin(); }}
                    className="w-12 h-14 text-center text-xl font-mono font-bold bg-cream rounded-xl border-2 border-gray-200 focus:border-navy focus:outline-none text-navy disabled:opacity-50"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button onClick={handleLogin} disabled={mfaCode.length < 6 || isLocked || isValidating} className="w-full py-3.5 bg-gradient-to-r from-navy to-navy-dark text-white font-semibold rounded-xl disabled:opacity-50 cursor-pointer hover:shadow-lg transition-all flex items-center justify-center gap-2">
                {isValidating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : <><Shield size={16} /> Verify & Login</>}
              </button>
              <button onClick={() => { setLoginStep('credentials'); setMfaCode(''); setPassword(''); setLoginError(''); }} className="w-full text-center text-sm text-navy/40 hover:text-navy cursor-pointer">← Use different credentials</button>
            </div>
          )}

          <button onClick={() => setCurrentPage('home')} className="mt-6 text-center w-full text-sm text-navy/40 hover:text-navy cursor-pointer">← Back to main site</button>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-4 text-[10px] text-navy/30">
              <span className="flex items-center gap-1"><Lock size={10} /> AES-256</span>
              <span className="flex items-center gap-1"><Shield size={10} /> MFA Required</span>
              <span className="flex items-center gap-1"><Clock size={10} /> 15min Timeout</span>
            </div>
            <p className="text-[10px] text-center text-navy/20 mt-2">Authorized personnel only. All login attempts are logged.</p>
          </div>
        </motion.div>
      </section>
    );
  }

  // ═══════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════
  const sidebarItems: { id: AdminTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'payments', icon: <CreditCard size={20} />, label: 'Payments', badge: liveStats.pendingPayments },
    { id: 'clients', icon: <Users size={20} />, label: 'Clients' },
    { id: 'activity', icon: <Activity size={20} />, label: 'Activity Log' },
    { id: 'revenue', icon: <BarChart3 size={20} />, label: 'Revenue' },
    { id: 'documents', icon: <FileText size={20} />, label: 'Documents' },
    { id: 'chats', icon: <MessageSquare size={20} />, label: 'Live Chats', badge: liveStats.activeChats },
    { id: 'announcements', icon: <Megaphone size={20} />, label: 'Announcements' },
    { id: 'reports', icon: <PieChart size={20} />, label: 'Reports' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const filteredPayments = mockPayments.filter(p => 
    (paymentFilter === 'all' || p.status === paymentFilter) &&
    (searchQuery === '' || p.client.toLowerCase().includes(searchQuery.toLowerCase()) || p.ref.includes(searchQuery))
  );

  const filteredActivities = mockActivities.filter(a =>
    (activityFilter === 'all' || a.type.includes(activityFilter)) &&
    (searchQuery === '' || a.client.toLowerCase().includes(searchQuery.toLowerCase()) || a.detail.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section className={`min-h-screen pt-16 transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 left-1/2 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg" style={{ background: toast.type === 'success' ? '#1A7A4A' : toast.type === 'error' ? '#E8533A' : '#0A5FA8' }}>
            {toast.type === 'success' ? <CheckCircle size={18} className="text-white" /> : toast.type === 'error' ? <XCircle size={18} className="text-white" /> : <Info size={18} className="text-white" />}
            <span className="text-white text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Warning */}
      <AnimatePresence>
        {sessionWarning && (
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center gap-3 shadow-lg max-w-lg">
            <AlertTriangle size={20} className="text-gold-dark shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-navy">Session expiring soon</p>
              <p className="text-xs text-navy/50">Move your mouse or press a key to stay signed in.</p>
            </div>
            <button onClick={resetSessionTimer} className="px-3 py-1.5 bg-navy text-white text-xs rounded-lg cursor-pointer font-medium">Stay Signed In</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowConfirmModal(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${showConfirmModal.type === 'approve' ? 'bg-forest/10' : 'bg-coral/10'}`}>
                {showConfirmModal.type === 'approve' ? <Check size={24} className="text-forest" /> : <X size={24} className="text-coral" />}
              </div>
              <h3 className="text-lg font-bold text-navy text-center mb-2">
                {showConfirmModal.type === 'approve' ? 'Confirm Payment' : 'Reject Payment'}
              </h3>
              <p className="text-sm text-navy/60 text-center mb-6">
                {showConfirmModal.type === 'approve' 
                  ? `Confirm payment of ${formatCurrency(showConfirmModal.data.amount)} from ${showConfirmModal.data.client}?`
                  : `Reject payment from ${showConfirmModal.data.client}? This will notify the client.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-navy font-medium hover:bg-cream transition-colors cursor-pointer">Cancel</button>
                <button onClick={() => { showToast(showConfirmModal.type === 'approve' ? 'success' : 'info', showConfirmModal.type === 'approve' ? 'Payment confirmed!' : 'Payment rejected'); setShowConfirmModal(null); }} className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors cursor-pointer ${showConfirmModal.type === 'approve' ? 'bg-forest hover:bg-forest-dark' : 'bg-coral hover:bg-coral-dark'}`}>
                  {showConfirmModal.type === 'approve' ? 'Confirm' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Detail Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-navy/40">{selectedPayment.id}</p>
                  <h3 className="font-display text-xl font-bold text-navy">{selectedPayment.client}</h3>
                </div>
                <button onClick={() => setSelectedPayment(null)} className="p-2 rounded-lg hover:bg-cream cursor-pointer"><X size={20} className="text-navy/40" /></button>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-navy/40 uppercase mb-1">Service</p>
                    <p className="font-medium text-navy">{selectedPayment.service}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy/40 uppercase mb-1">Amount Expected</p>
                    <p className="font-mono text-2xl font-bold text-navy">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy/40 uppercase mb-1">Amount Claimed</p>
                    <p className={`font-mono text-lg font-bold ${selectedPayment.amountClaimed === selectedPayment.amount ? 'text-forest' : 'text-coral'}`}>
                      {formatCurrency(selectedPayment.amountClaimed)}
                      {selectedPayment.amountClaimed !== selectedPayment.amount && <span className="text-xs ml-2">(Mismatch!)</span>}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-navy/40 uppercase mb-1">Phone</p>
                      <p className="text-sm text-navy">{selectedPayment.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-navy/40 uppercase mb-1">Email</p>
                      <p className="text-sm text-navy">{selectedPayment.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-navy/40 uppercase mb-1">Reference</p>
                    <p className="font-mono text-sm text-navy bg-cream px-2 py-1 rounded inline-block">{selectedPayment.ref}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy/40 uppercase mb-1">Status</p>
                    <StatusBadge status={selectedPayment.status} large />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-navy/40 uppercase mb-2">Receipt Preview</p>
                  <div className="bg-cream rounded-xl aspect-[3/4] flex items-center justify-center border border-gray-200">
                    <div className="text-center">
                      <FileImage size={48} className="text-navy/20 mx-auto mb-2" />
                      <p className="text-sm text-navy/40">Receipt Image</p>
                      <button className="mt-2 text-xs text-electric font-medium cursor-pointer flex items-center gap-1 mx-auto"><ExternalLink size={12} /> View Full Size</button>
                    </div>
                  </div>
                </div>
              </div>
              {selectedPayment.status === 'pending' && (
                <div className="p-6 border-t border-gray-100 flex gap-3">
                  <button onClick={() => { setSelectedPayment(null); setShowConfirmModal({ type: 'reject', data: selectedPayment }); }} className="flex-1 py-3 border border-coral text-coral rounded-xl font-semibold hover:bg-coral/5 cursor-pointer flex items-center justify-center gap-2">
                    <X size={18} /> Reject
                  </button>
                  <button onClick={() => { setSelectedPayment(null); setShowConfirmModal({ type: 'approve', data: selectedPayment }); }} className="flex-1 py-3 bg-forest text-white rounded-xl font-semibold hover:bg-forest-dark cursor-pointer flex items-center justify-center gap-2">
                    <Check size={18} /> Confirm Payment
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Detail Modal */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coral to-gold flex items-center justify-center text-white text-xl font-bold">
                      {selectedClient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-navy">{selectedClient.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={selectedClient.status} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedClient.kyc === 'verified' ? 'bg-forest/10 text-forest' : selectedClient.kyc === 'pending' ? 'bg-gold/10 text-gold-dark' : 'bg-coral/10 text-coral'}`}>
                          KYC: {selectedClient.kyc}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedClient(null)} className="p-2 rounded-lg hover:bg-cream cursor-pointer"><X size={20} className="text-navy/40" /></button>
                </div>
              </div>
              <div className="p-6 grid sm:grid-cols-3 gap-4">
                <div className="bg-cream rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-navy">{formatCurrency(selectedClient.spend)}</p>
                  <p className="text-xs text-navy/40 mt-1">Total Spend</p>
                </div>
                <div className="bg-cream rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-navy">{selectedClient.orders}</p>
                  <p className="text-xs text-navy/40 mt-1">Total Orders</p>
                </div>
                <div className="bg-cream rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-navy">{selectedClient.referrals}</p>
                  <p className="text-xs text-navy/40 mt-1">Referrals</p>
                </div>
              </div>
              <div className="px-6 pb-6 grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-navy text-sm flex items-center gap-2"><User size={14} /> Contact Info</h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-navy/70"><Phone size={14} className="text-navy/30" /> {selectedClient.phone}</p>
                    <p className="flex items-center gap-2 text-navy/70"><Mail size={14} className="text-navy/30" /> {selectedClient.email}</p>
                    <p className="flex items-center gap-2 text-navy/70"><MapPin size={14} className="text-navy/30" /> {selectedClient.lga}, {selectedClient.state}</p>
                    {selectedClient.nin && <p className="flex items-center gap-2 text-navy/70"><Fingerprint size={14} className="text-navy/30" /> NIN: {selectedClient.nin.slice(0, 4)}****{selectedClient.nin.slice(-3)}</p>}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-navy text-sm flex items-center gap-2"><Calendar size={14} /> Account Info</h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-navy/70"><Clock size={14} className="text-navy/30" /> Joined: {selectedClient.joined}</p>
                    <p className="flex items-center gap-2 text-navy/70"><Activity size={14} className="text-navy/30" /> Last login: {selectedClient.lastLogin}</p>
                    {selectedClient.referrer && <p className="flex items-center gap-2 text-navy/70"><Gift size={14} className="text-navy/30" /> Referred by: {selectedClient.referrer}</p>}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-electric text-white rounded-lg text-sm font-medium cursor-pointer flex items-center gap-1"><MessageCircle size={14} /> Message</button>
                <button className="px-4 py-2 bg-cream text-navy rounded-lg text-sm font-medium cursor-pointer flex items-center gap-1"><Gift size={14} /> Add Credit</button>
                <button className="px-4 py-2 bg-cream text-navy rounded-lg text-sm font-medium cursor-pointer flex items-center gap-1"><FileText size={14} /> View Documents</button>
                <div className="flex-1" />
                {selectedClient.status === 'active' ? (
                  <button className="px-4 py-2 bg-coral/10 text-coral rounded-lg text-sm font-medium cursor-pointer flex items-center gap-1"><Ban size={14} /> Suspend</button>
                ) : (
                  <button className="px-4 py-2 bg-forest/10 text-forest rounded-lg text-sm font-medium cursor-pointer flex items-center gap-1"><UserCheck size={14} /> Activate</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside animate={{ width: sidebarCollapsed ? 72 : 280 }} className={`fixed left-0 top-16 bottom-0 z-40 flex flex-col overflow-hidden shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-navy'}`}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            {!sidebarCollapsed && (
              <div>
                <p className="font-bold text-sm text-white">Admin Panel</p>
                <p className="text-white/40 text-xs">Authenticated</p>
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-white/60">
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === item.id ? 'bg-coral text-white shadow-lg shadow-coral/30' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                {item.icon}
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && <span className="w-5 h-5 rounded-full bg-gold text-navy text-xs font-bold flex items-center justify-center">{item.badge}</span>}
                  </>
                )}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-2">
            <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/10 cursor-pointer">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              {!sidebarCollapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-coral/80 hover:text-coral hover:bg-coral/10 cursor-pointer">
              <LogOut size={18} />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[280px]'}`}>
          <div className="p-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className={`font-display text-2xl font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>
                  {sidebarItems.find(s => s.id === activeTab)?.label}
                </h1>
                <p className={`text-sm ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>
                  {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleRefresh} className={`p-2 rounded-xl border cursor-pointer transition-all ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-cream'} ${refreshing ? 'animate-spin' : ''}`}>
                  <RefreshCw size={18} className={darkMode ? 'text-white/60' : 'text-navy/60'} />
                </button>
                <div className="relative">
                  <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white/30' : 'text-navy/30'}`} />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`pl-10 pr-4 py-2 rounded-xl text-sm border focus:outline-none w-48 ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder:text-white/30' : 'bg-white border-gray-200 text-navy'}`} />
                </div>
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-xl border cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-cream'}`}>
                    <Bell size={18} className={darkMode ? 'text-white/60' : 'text-navy/60'} />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center font-bold">{notifications.filter(n => !n.read).length}</span>
                  </button>
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute right-0 top-12 w-80 rounded-xl shadow-xl border z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                          <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-navy'}`}>Notifications</p>
                          <button className="text-xs text-electric cursor-pointer">Mark all read</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.map(n => (
                            <div key={n.id} className={`p-3 border-b last:border-0 cursor-pointer transition-colors ${n.read ? '' : darkMode ? 'bg-white/5' : 'bg-cream/50'} ${darkMode ? 'border-gray-700 hover:bg-white/10' : 'border-gray-50 hover:bg-cream'}`}>
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'payment' ? 'bg-forest/10' : n.type === 'alert' ? 'bg-coral/10' : 'bg-electric/10'}`}>
                                  {n.type === 'payment' ? <CreditCard size={14} className="text-forest" /> : n.type === 'alert' ? <AlertTriangle size={14} className="text-coral" /> : <Server size={14} className="text-electric" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>{n.title}</p>
                                  <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-navy/50'} truncate`}>{n.message}</p>
                                  <p className={`text-[10px] mt-1 ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>{n.time}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className={`hidden sm:flex items-center gap-2 pl-3 border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coral to-gold flex items-center justify-center text-white text-xs font-bold shadow-lg">OA</div>
                  <div className="text-xs">
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>Admin</p>
                    <p className={darkMode ? 'text-white/40' : 'text-navy/40'}>super_admin</p>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* ═══════════════════════════════════════════════ */}
              {/* OVERVIEW TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Live Stats Bar */}
                  <div className={`rounded-2xl p-4 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-navy to-navy-dark'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Radio size={14} className="text-forest animate-pulse" />
                      <span className="text-white/60 text-xs font-medium">LIVE METRICS</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Active Users', value: liveStats.activeUsers.toLocaleString(), icon: <Users size={16} />, trend: '+23' },
                        { label: 'Live Chats', value: liveStats.activeChats, icon: <MessageSquare size={16} />, trend: null },
                        { label: 'Queue Depth', value: liveStats.queueDepth, icon: <Layers size={16} />, trend: '-3' },
                        { label: 'Pending Payments', value: liveStats.pendingPayments, icon: <Clock size={16} />, trend: null, highlight: true },
                      ].map((stat, i) => (
                        <div key={i} className={`p-3 rounded-xl ${stat.highlight ? 'bg-gold/20' : 'bg-white/5'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white/40">{stat.icon}</span>
                            <span className="text-white/60 text-xs">{stat.label}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-white text-xl font-bold">{stat.value}</span>
                            {stat.trend && <span className={`text-xs ${stat.trend.startsWith('+') ? 'text-forest-light' : 'text-coral-light'}`}>{stat.trend}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Revenue Today', value: formatCurrency(revenueData.today), change: `+${Math.round((revenueData.today - revenueData.yesterday) / revenueData.yesterday * 100)}%`, up: true, icon: <DollarSign size={20} />, color: 'bg-forest/10 text-forest', sparkline: revenueData.daily.slice(-7) },
                      { label: 'This Week', value: formatCurrency(revenueData.thisWeek), change: `+${Math.round((revenueData.thisWeek - revenueData.lastWeek) / revenueData.lastWeek * 100)}%`, up: true, icon: <TrendingUp size={20} />, color: 'bg-electric/10 text-electric', sparkline: revenueData.daily.slice(-7) },
                      { label: 'Active Clients', value: mockClients.filter(c => c.status === 'active').length.toString(), change: '+12', up: true, icon: <Users size={20} />, color: 'bg-coral/10 text-coral', sparkline: null },
                      { label: 'Avg Order Value', value: formatCurrency(Math.round(revenueData.thisMonth / mockClients.reduce((a, c) => a + c.orders, 0))), change: '+5%', up: true, icon: <Target size={20} />, color: 'bg-gold/10 text-gold-dark', sparkline: null },
                    ].map((kpi, i) => (
                      <div key={i} className={`rounded-2xl p-5 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2.5 rounded-xl ${kpi.color}`}>{kpi.icon}</div>
                          <span className={`text-xs font-medium flex items-center gap-0.5 ${kpi.up ? 'text-forest' : 'text-coral'}`}>
                            {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {kpi.change}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{kpi.label}</p>
                        <p className={`font-display text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-navy'}`}>{kpi.value}</p>
                        {kpi.sparkline && (
                          <div className="flex items-end gap-0.5 h-8 mt-3">
                            {kpi.sparkline.map((v, j) => (
                              <div key={j} className="flex-1 bg-gradient-to-t from-forest/40 to-forest rounded-t-sm" style={{ height: `${(v / Math.max(...kpi.sparkline)) * 100}%` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6 mb-6">
                    {/* Recent Payments */}
                    <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-display font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>Recent Payments</h3>
                        <button onClick={() => setActiveTab('payments')} className="text-xs text-electric font-medium cursor-pointer">View all →</button>
                      </div>
                      <div className="space-y-3">
                        {mockPayments.slice(0, 5).map((p) => (
                          <div key={p.id} onClick={() => setSelectedPayment(p)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-cream/50 hover:bg-cream'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${p.status === 'pending' ? 'bg-gold/10 text-gold-dark' : p.status === 'confirmed' ? 'bg-forest/10 text-forest' : 'bg-coral/10 text-coral'}`}>
                                {p.status === 'pending' ? <Clock size={14} /> : p.status === 'confirmed' ? <Check size={14} /> : <X size={14} />}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>{p.client.split(' ')[0]}</p>
                                <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{p.time}</p>
                              </div>
                            </div>
                            <p className={`font-mono text-sm font-semibold ${darkMode ? 'text-white' : 'text-navy'}`}>{formatCurrency(p.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Agent Performance */}
                    <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-display font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>Agent Load</h3>
                        <button onClick={() => setActiveTab('chats')} className="text-xs text-electric font-medium cursor-pointer">Manage →</button>
                      </div>
                      <div className="space-y-3">
                        {agentsList.filter(a => a.status === 'online').sort((a, b) => b.load - a.load).slice(0, 5).map((agent) => (
                          <div key={agent.id} className="flex items-center gap-3">
                            <span className="text-lg">{agent.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm ${darkMode ? 'text-white' : 'text-navy'}`}>{agent.name}</span>
                                <span className={`text-xs font-mono ${agent.load > 80 ? 'text-coral' : agent.load > 60 ? 'text-gold-dark' : 'text-forest'}`}>{agent.load}%</span>
                              </div>
                              <div className={`w-full h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-cream'}`}>
                                <div className={`h-full rounded-full transition-all ${agent.load > 80 ? 'bg-coral' : agent.load > 60 ? 'bg-gold' : 'bg-forest'}`} style={{ width: `${agent.load}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* System Health */}
                    <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-display font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>System Health</h3>
                        <span className="px-2 py-0.5 bg-forest/10 text-forest text-xs font-medium rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" /> All Systems Go</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: 'NVIDIA NIM API', latency: '45ms', status: 'ok' },
                          { name: 'PostgreSQL', latency: '12ms', status: 'ok' },
                          { name: 'Redis Cache', latency: '3ms', status: 'ok' },
                          { name: 'Termii SMS', latency: '120ms', status: 'ok' },
                          { name: 'SendGrid', latency: '85ms', status: 'ok' },
                          { name: 'ClamAV', latency: '200ms', status: 'ok' },
                        ].map((sys, i) => (
                          <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-cream/50'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${sys.status === 'ok' ? 'bg-forest' : 'bg-coral'}`} />
                              <span className={`text-sm ${darkMode ? 'text-white' : 'text-navy'}`}>{sys.name}</span>
                            </div>
                            <span className={`text-xs font-mono ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{sys.latency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Agent Status Grid */}
                  <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h3 className={`font-display font-bold mb-4 ${darkMode ? 'text-white' : 'text-navy'}`}>All 13 Agents</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {agentsList.map((agent) => (
                        <div key={agent.id} className={`rounded-xl p-3 text-center transition-all cursor-pointer ${agent.status === 'online' ? darkMode ? 'bg-forest/10 hover:bg-forest/20' : 'bg-forest/5 hover:bg-forest/10' : darkMode ? 'bg-coral/10' : 'bg-coral/5'}`}>
                          <span className="text-xl">{agent.icon}</span>
                          <p className={`font-mono text-xs mt-1 ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{agent.id}</p>
                          <div className={`flex items-center justify-center gap-1 text-xs font-medium mt-1 ${agent.status === 'online' ? 'text-forest' : 'text-coral'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-forest' : 'bg-coral'}`} />
                            {agent.status === 'online' ? 'Online' : 'Maint.'}
                          </div>
                          {agent.status === 'online' && (
                            <p className={`text-[10px] mt-1 ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>{agent.chats} chats</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* PAYMENTS TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'payments' && (
                <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Stats */}
                  <div className="grid sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total Today', value: formatCurrency(mockPayments.filter(p => p.status === 'confirmed').reduce((a, p) => a + p.amount, 0)), icon: <DollarSign size={18} />, color: 'text-forest' },
                      { label: 'Pending', value: mockPayments.filter(p => p.status === 'pending').length, icon: <Clock size={18} />, color: 'text-gold-dark' },
                      { label: 'Confirmed', value: mockPayments.filter(p => p.status === 'confirmed').length, icon: <CheckCircle size={18} />, color: 'text-forest' },
                      { label: 'Rejected', value: mockPayments.filter(p => p.status === 'rejected').length, icon: <XCircle size={18} />, color: 'text-coral' },
                    ].map((stat, i) => (
                      <div key={i} className={`rounded-xl p-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={stat.color}>{stat.icon}</span>
                          <span className={`text-xs ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{stat.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Filter size={16} className={darkMode ? 'text-white/40' : 'text-navy/40'} />
                    {['all', 'pending', 'confirmed', 'rejected', 'expired'].map((f) => (
                      <button key={f} onClick={() => setPaymentFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-all ${paymentFilter === f ? 'bg-navy text-white' : darkMode ? 'bg-gray-800 text-white/60 border border-gray-700 hover:bg-gray-700' : 'bg-white text-navy/60 border border-gray-200 hover:bg-cream'}`}>
                        {f}
                        {f === 'pending' && mockPayments.filter(p => p.status === 'pending').length > 0 && <span className="ml-1 text-gold">•{mockPayments.filter(p => p.status === 'pending').length}</span>}
                      </button>
                    ))}
                    <div className="ml-auto flex gap-2">
                      <button className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer ${darkMode ? 'bg-gray-800 text-white/60 border border-gray-700 hover:bg-gray-700' : 'bg-white text-navy/60 border border-gray-200 hover:bg-cream'}`}><Download size={14} /> Export</button>
                      <button className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer ${darkMode ? 'bg-gray-800 text-white/60 border border-gray-700 hover:bg-gray-700' : 'bg-white text-navy/60 border border-gray-200 hover:bg-cream'}`}><Printer size={14} /> Print</button>
                    </div>
                  </div>

                  {/* Payment Table */}
                  <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={darkMode ? 'border-b border-gray-700 bg-gray-900/50' : 'border-b border-gray-100 bg-cream/50'}>
                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>ID</th>
                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Client</th>
                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Service</th>
                            <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Amount</th>
                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Status</th>
                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Time</th>
                            <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((p) => (
                            <tr key={p.id} className={`border-b last:border-0 cursor-pointer transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-50 hover:bg-cream/30'}`} onClick={() => setSelectedPayment(p)}>
                              <td className={`px-4 py-3 font-mono text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{p.id}</td>
                              <td className="px-4 py-3">
                                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>{p.client}</p>
                                <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{p.phone}</p>
                              </td>
                              <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white/70' : 'text-navy/70'}`}>{p.service}</td>
                              <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${darkMode ? 'text-white' : 'text-navy'}`}>
                                {formatCurrency(p.amount)}
                                {p.amountClaimed !== p.amount && <span className="ml-1 text-coral text-xs">⚠</span>}
                              </td>
                              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                              <td className={`px-4 py-3 text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{p.time}</td>
                              <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => setSelectedPayment(p)} className={`p-1.5 rounded-lg cursor-pointer ${darkMode ? 'hover:bg-gray-600 text-white/30 hover:text-white' : 'hover:bg-cream text-navy/30 hover:text-navy'}`} title="View"><Eye size={14} /></button>
                                  {p.status === 'pending' && (
                                    <>
                                      <button onClick={() => setShowConfirmModal({ type: 'approve', data: p })} className="p-1.5 rounded-lg hover:bg-forest/10 text-forest cursor-pointer" title="Confirm"><Check size={14} /></button>
                                      <button onClick={() => setShowConfirmModal({ type: 'reject', data: p })} className="p-1.5 rounded-lg hover:bg-coral/10 text-coral cursor-pointer" title="Reject"><X size={14} /></button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* CLIENTS TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'clients' && (
                <motion.div key="clients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Stats */}
                  <div className="grid sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total Clients', value: mockClients.length, icon: <Users size={18} /> },
                      { label: 'Active', value: mockClients.filter(c => c.status === 'active').length, icon: <UserCheck size={18} />, color: 'text-forest' },
                      { label: 'KYC Verified', value: mockClients.filter(c => c.kyc === 'verified').length, icon: <ShieldCheck size={18} />, color: 'text-electric' },
                      { label: 'Total Revenue', value: formatCurrency(mockClients.reduce((a, c) => a + c.spend, 0)), icon: <DollarSign size={18} />, color: 'text-gold-dark' },
                    ].map((stat, i) => (
                      <div key={i} className={`rounded-xl p-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={stat.color || (darkMode ? 'text-white/40' : 'text-navy/40')}>{stat.icon}</span>
                          <span className={`text-xs ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{stat.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Client Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockClients.map((client) => (
                      <div key={client.id} onClick={() => setSelectedClient(client)} className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-coral/30'}`}>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral to-gold flex items-center justify-center text-white font-bold shrink-0">
                            {client.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-navy'} truncate`}>{client.name}</h4>
                            <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{client.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <StatusBadge status={client.status} />
                              <span className={`text-xs px-2 py-0.5 rounded-full ${client.kyc === 'verified' ? 'bg-forest/10 text-forest' : client.kyc === 'pending' ? 'bg-gold/10 text-gold-dark' : 'bg-coral/10 text-coral'}`}>
                                {client.kyc === 'verified' ? '✓ KYC' : client.kyc === 'pending' ? '⏳ KYC' : '✗ KYC'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                          <div className="text-center">
                            <p className={`font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{formatCurrency(client.spend)}</p>
                            <p className={`text-[10px] ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>Total Spend</p>
                          </div>
                          <div className="text-center">
                            <p className={`font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{client.orders}</p>
                            <p className={`text-[10px] ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>Orders</p>
                          </div>
                          <div className="text-center">
                            <p className={`font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{client.referrals}</p>
                            <p className={`text-[10px] ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>Referrals</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* ACTIVITY LOG TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'activity' && (
                <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Filter size={16} className={darkMode ? 'text-white/40' : 'text-navy/40'} />
                    {['all', 'payment', 'login', 'service', 'chat'].map((f) => (
                      <button key={f} onClick={() => setActivityFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-all ${activityFilter === f ? 'bg-navy text-white' : darkMode ? 'bg-gray-800 text-white/60 border border-gray-700' : 'bg-white text-navy/60 border border-gray-200'}`}>{f}</button>
                    ))}
                    <select value={dateRange} onChange={e => setDateRange(e.target.value)} className={`ml-auto px-3 py-1.5 rounded-lg text-xs cursor-pointer ${darkMode ? 'bg-gray-800 text-white/60 border border-gray-700' : 'bg-white text-navy/60 border border-gray-200'}`}>
                      <option value="24h">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="all">All time</option>
                    </select>
                  </div>

                  {/* Activity List */}
                  <div className="space-y-2">
                    {filteredActivities.map((act) => (
                      <div key={act.id} className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${act.suspicious ? 'border-coral/30 bg-coral/5' : darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          act.type.includes('confirmed') || act.type.includes('completed') ? 'bg-forest/10 text-forest' :
                          act.type.includes('rejected') || act.type.includes('failed') ? 'bg-coral/10 text-coral' :
                          act.type.includes('login') ? 'bg-electric/10 text-electric' :
                          act.type.includes('submitted') || act.type.includes('uploaded') ? 'bg-gold/10 text-gold-dark' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {act.type.includes('payment') ? <CreditCard size={18} /> : act.type.includes('login') ? <Users size={18} /> : act.type.includes('chat') ? <MessageSquare size={18} /> : act.type.includes('document') ? <FileText size={18} /> : <Activity size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>{act.detail}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className={`text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{act.client}</span>
                            <span className={`text-xs ${darkMode ? 'text-white/20' : 'text-navy/20'}`}>•</span>
                            <span className={`text-xs font-mono ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>{act.ip}</span>
                            <span className={`text-xs ${darkMode ? 'text-white/20' : 'text-navy/20'}`}>•</span>
                            <span className={`text-xs ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>{act.device}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{act.time}</span>
                          {act.suspicious && <p className="text-xs text-coral font-medium mt-1">⚠ Suspicious</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* REVENUE TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'revenue' && (
                <motion.div key="revenue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* KPIs */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Today', value: formatCurrency(revenueData.today), change: `+${Math.round((revenueData.today - revenueData.yesterday) / revenueData.yesterday * 100)}%`, up: true },
                      { label: 'This Week', value: formatCurrency(revenueData.thisWeek), change: `+${Math.round((revenueData.thisWeek - revenueData.lastWeek) / revenueData.lastWeek * 100)}%`, up: true },
                      { label: 'This Month', value: formatCurrency(revenueData.thisMonth), change: `+${Math.round((revenueData.thisMonth - revenueData.lastMonth) / revenueData.lastMonth * 100)}%`, up: true },
                      { label: 'Avg Order', value: formatCurrency(Math.round(revenueData.thisMonth / 435)), change: '+5%', up: true },
                    ].map((kpi, i) => (
                      <div key={i} className={`rounded-xl p-5 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <p className={`text-sm ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{kpi.label}</p>
                        <p className={`font-display text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-navy'}`}>{kpi.value}</p>
                        <p className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${kpi.up ? 'text-forest' : 'text-coral'}`}>
                          {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {kpi.change} vs last period
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6 mb-6">
                    {/* Revenue Chart */}
                    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <h3 className={`font-display font-bold mb-4 ${darkMode ? 'text-white' : 'text-navy'}`}>Revenue Trend (30 Days)</h3>
                      <div className="h-48 flex items-end gap-1">
                        {revenueData.daily.map((v, i) => (
                          <div key={i} className="flex-1 group relative">
                            <div className="w-full bg-gradient-to-t from-coral to-gold rounded-t-sm transition-all group-hover:opacity-80" style={{ height: `${(v / Math.max(...revenueData.daily)) * 100}%` }} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-navy text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {formatCurrency(v * 1000)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className={`text-xs ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>30 days ago</span>
                        <span className={`text-xs ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>Today</span>
                      </div>
                    </div>

                    {/* Revenue by Service */}
                    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <h3 className={`font-display font-bold mb-4 ${darkMode ? 'text-white' : 'text-navy'}`}>Revenue by Service</h3>
                      <div className="flex items-center justify-center mb-4">
                        <div className="relative w-32 h-32">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            {(() => {
                              let cumulativeOffset = 0;
                              return revenueData.byService.map((seg, idx) => {
                                const circle = (
                                  <circle key={idx} cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke={seg.color} strokeWidth="3" strokeDasharray={`${seg.pct} ${100 - seg.pct}`} strokeDashoffset={-cumulativeOffset} />
                                );
                                cumulativeOffset += seg.pct;
                                return circle;
                              });
                            })()}
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{formatCurrency(revenueData.thisMonth)}</p>
                              <p className={`text-[10px] ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>This Month</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {revenueData.byService.map((seg, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                            <span className={`flex-1 text-sm ${darkMode ? 'text-white' : 'text-navy'}`}>{seg.name}</span>
                            <span className={`font-mono text-sm ${darkMode ? 'text-white' : 'text-navy'}`}>{formatCurrency(seg.value)}</span>
                            <span className={`text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{seg.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Revenue by State */}
                  <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h3 className={`font-display font-bold mb-4 ${darkMode ? 'text-white' : 'text-navy'}`}>Revenue by State</h3>
                    <div className="space-y-3">
                      {revenueData.byState.map((state, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`w-20 text-sm font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>{state.name}</span>
                          <div className={`flex-1 h-6 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-cream'}`}>
                            <div className="h-full bg-gradient-to-r from-coral to-gold flex items-center justify-end pr-2 transition-all" style={{ width: `${(state.value / revenueData.byState[0].value) * 100}%` }}>
                              <span className="text-xs font-bold text-white">{formatCurrency(state.value)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Other tabs simplified for length... */}
              {activeTab === 'documents' && (
                <motion.div key="documents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockDocuments.map((doc) => (
                      <div key={doc.id} className={`rounded-2xl border p-4 transition-all hover:shadow-lg cursor-pointer ${doc.scan !== 'Clean' ? 'border-coral/30 bg-coral/5' : darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${doc.scan !== 'Clean' ? 'bg-coral/10' : 'bg-electric/10'}`}>
                            {doc.type === 'Receipt' ? <Receipt size={20} className={doc.scan !== 'Clean' ? 'text-coral' : 'text-electric'} /> : doc.type === 'ID' ? <Fingerprint size={20} className="text-electric" /> : <FileText size={20} className="text-electric" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-navy'}`}>{doc.name}</p>
                            <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{doc.client}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${darkMode ? 'bg-gray-700 text-white/50' : 'bg-cream text-navy/50'}`}>{doc.type}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${doc.scan === 'Clean' ? 'bg-forest/10 text-forest' : 'bg-coral/10 text-coral'}`}>
                                {doc.scan === 'Clean' ? '✓ Clean' : '⚠ Threat'}
                              </span>
                              <StatusBadge status={doc.status} />
                            </div>
                            <p className={`text-[10px] mt-2 ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>{doc.size} • {doc.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'chats' && (
                <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="grid sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Active Chats', value: mockChats.filter(c => c.status === 'active').length, color: 'text-forest' },
                      { label: 'Waiting', value: mockChats.filter(c => c.status === 'waiting').length, color: 'text-gold-dark' },
                      { label: 'Avg Response', value: '1.2min', color: 'text-electric' },
                      { label: 'CSAT Score', value: '4.8/5', color: 'text-coral' },
                    ].map((stat, i) => (
                      <div key={i} className={`rounded-xl p-4 border text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    {mockChats.map((chat) => (
                      <div key={chat.id} className={`flex items-center gap-4 p-4 border-b last:border-0 cursor-pointer transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-50 hover:bg-cream/30'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-coral to-gold flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {chat.client.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>{chat.client}</p>
                            <span className={`text-[10px] ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>{chat.time}</span>
                          </div>
                          <p className={`text-xs truncate ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>{chat.lastMsg}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-electric">{chat.agent}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${chat.priority === 'high' ? 'bg-coral/10 text-coral' : chat.priority === 'medium' ? 'bg-gold/10 text-gold-dark' : 'bg-gray-100 text-gray-500'}`}>{chat.priority}</span>
                            <StatusBadge status={chat.status} />
                          </div>
                        </div>
                        {chat.unread > 0 && <span className="w-5 h-5 bg-coral text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{chat.unread}</span>}
                        {chat.satisfaction && <span className="text-gold">{'★'.repeat(chat.satisfaction)}</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'announcements' && (
                <motion.div key="announcements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className={`rounded-2xl border p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h3 className={`font-display font-bold mb-4 ${darkMode ? 'text-white' : 'text-navy'}`}>Create Announcement</h3>
                    <div className="space-y-4">
                      <input type="text" placeholder="Announcement title..." className={`w-full px-4 py-3 rounded-xl border focus:outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-white/30' : 'bg-cream border-gray-100 text-navy'}`} />
                      <textarea placeholder="Write your announcement..." rows={4} className={`w-full px-4 py-3 rounded-xl border focus:outline-none resize-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-white/30' : 'bg-cream border-gray-100 text-navy'}`} />
                      <div className="flex items-center gap-4 flex-wrap">
                        <select className={`px-4 py-2 rounded-xl text-sm cursor-pointer ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-cream border-gray-100 text-navy'}`}>
                          <option>All Clients</option>
                          <option>ServiceMart Users</option>
                          <option>Academic Users</option>
                        </select>
                        <div className="flex items-center gap-3">
                          {['SMS', 'Email', 'WhatsApp'].map(ch => (
                            <label key={ch} className={`flex items-center gap-1.5 text-sm cursor-pointer ${darkMode ? 'text-white/60' : 'text-navy/60'}`}>
                              <input type="checkbox" defaultChecked={ch !== 'WhatsApp'} className="rounded" /> {ch}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button className="px-6 py-3 bg-gradient-to-r from-coral to-coral-dark text-white rounded-xl font-semibold hover:shadow-lg cursor-pointer flex items-center gap-2">
                        <Send size={18} /> Send Announcement
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {mockAnnouncements.map((ann) => (
                      <div key={ann.id} className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-navy'}`}>{ann.title}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${ann.status === 'sent' ? 'bg-forest/10 text-forest' : 'bg-gold/10 text-gold-dark'}`}>{ann.status}</span>
                            </div>
                            <p className={`text-sm ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{ann.body}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-xs ${darkMode ? 'text-white/30' : 'text-navy/30'}`}>{ann.date}</span>
                              {ann.channels.map((ch, j) => <span key={j} className={`px-1.5 py-0.5 rounded text-[10px] ${darkMode ? 'bg-gray-700 text-white/40' : 'bg-cream text-navy/40'}`}>{ch}</span>)}
                            </div>
                          </div>
                          {ann.status === 'sent' && (
                            <div className="text-right">
                              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{ann.opens.toLocaleString()}</p>
                              <p className={`text-[10px] ${darkMode ? 'text-white/40' : 'text-navy/40'}`}>Opens</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'reports' && (
                <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { title: 'Revenue Report', desc: 'Daily, weekly, monthly revenue breakdown', icon: <DollarSign size={24} />, color: 'bg-forest/10 text-forest' },
                      { title: 'Client Report', desc: 'Client acquisition, retention, KYC status', icon: <Users size={24} />, color: 'bg-electric/10 text-electric' },
                      { title: 'Payment Report', desc: 'Payment success rates, pending, rejected', icon: <CreditCard size={24} />, color: 'bg-gold/10 text-gold-dark' },
                      { title: 'Agent Performance', desc: 'Response times, satisfaction scores', icon: <Bot size={24} />, color: 'bg-coral/10 text-coral' },
                      { title: 'Activity Audit', desc: 'Complete activity log export', icon: <Activity size={24} />, color: 'bg-purple-100 text-purple-600' },
                      { title: 'Custom Report', desc: 'Build your own report with filters', icon: <PieChart size={24} />, color: 'bg-navy/10 text-navy' },
                    ].map((report, i) => (
                      <div key={i} className={`rounded-2xl border p-6 cursor-pointer transition-all hover:shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-coral/30'}`}>
                        <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center mb-4`}>{report.icon}</div>
                        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-navy'}`}>{report.title}</h3>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>{report.desc}</p>
                        <button className="mt-4 text-sm text-electric font-medium flex items-center gap-1 cursor-pointer"><Download size={14} /> Generate</button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <h3 className={`font-display font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-navy'}`}><User size={18} /> Profile Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className={`text-sm ${darkMode ? 'text-white/60' : 'text-navy/60'}`}>Display Name</label>
                          <input type="text" defaultValue="Admin User" className={`w-full mt-1 px-4 py-2.5 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-cream border-gray-100 text-navy'}`} />
                        </div>
                        <div>
                          <label className={`text-sm ${darkMode ? 'text-white/60' : 'text-navy/60'}`}>Email</label>
                          <input type="email" defaultValue="a****@dutchkem.com" disabled className={`w-full mt-1 px-4 py-2.5 rounded-xl border opacity-50 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-cream border-gray-100 text-navy'}`} />
                        </div>
                        <button className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium cursor-pointer">Save Changes</button>
                      </div>
                    </div>
                    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <h3 className={`font-display font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-navy'}`}><Shield size={18} /> Security</h3>
                      <div className="space-y-4">
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-cream'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>Two-Factor Authentication</p>
                              <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Required for admin accounts</p>
                            </div>
                            <span className="px-2 py-1 bg-forest/10 text-forest text-xs font-medium rounded-full">Enabled</span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-cream'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>Session Timeout</p>
                              <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-navy/50'}`}>Auto-logout after inactivity</p>
                            </div>
                            <span className={`text-sm ${darkMode ? 'text-white' : 'text-navy'}`}>15 minutes</span>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium cursor-pointer">Change Password</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </section>
  );
}

// ─── STATUS BADGE COMPONENT ───
function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const styles: Record<string, string> = {
    pending: 'bg-gold/10 text-gold-dark',
    confirmed: 'bg-forest/10 text-forest',
    active: 'bg-forest/10 text-forest',
    online: 'bg-forest/10 text-forest',
    rejected: 'bg-coral/10 text-coral',
    suspended: 'bg-coral/10 text-coral',
    expired: 'bg-gray-100 text-gray-500',
    quarantined: 'bg-coral/10 text-coral',
    approved: 'bg-forest/10 text-forest',
    waiting: 'bg-gold/10 text-gold-dark',
    resolved: 'bg-electric/10 text-electric',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-semibold capitalize ${styles[status] || 'bg-gray-100 text-gray-500'} ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[10px]'}`}>
      {status}
    </span>
  );
}

function User(props: { size: number }) {
  return <Users {...props} />;
}
