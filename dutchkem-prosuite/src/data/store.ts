// ═══════════════════════════════════════════════════════════════════════════
// DUTCHKEM VENTURES PROSUITE NG+ - DATA STORE
// This simulates a backend database with localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════

export interface Payment {
  id: string;
  client: string;
  clientId: number;
  phone: string;
  email: string;
  service: string;
  agent: string;
  amount: number;
  amountClaimed: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  time: string;
  timestamp: number;
  ref: string;
  receipt: string;
  rejectReason?: string;
  confirmedBy?: string;
  confirmedAt?: number;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  state: string;
  lga: string;
  spend: number;
  orders: number;
  status: 'active' | 'suspended' | 'pending';
  joined: string;
  lastLogin: string;
  kyc: 'verified' | 'pending' | 'failed';
  referrals: number;
  referrer: string | null;
  nin: string | null;
  credits: number;
  notes: string[];
}

export interface ActivityLog {
  id: number;
  type: string;
  client: string;
  clientId: number | null;
  detail: string;
  time: string;
  timestamp: number;
  ip: string;
  device: string;
  action: string;
  suspicious?: boolean;
  adminActor?: string;
}

export interface ChatSession {
  id: number;
  client: string;
  clientId: number;
  agent: string;
  agentId: string;
  lastMsg: string;
  time: string;
  timestamp: number;
  unread: number;
  status: 'active' | 'waiting' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  satisfaction: number | null;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  sender: 'client' | 'agent' | 'admin';
  content: string;
  timestamp: number;
  read: boolean;
}

export interface Document {
  id: number;
  name: string;
  client: string;
  clientId: number | null;
  type: string;
  date: string;
  timestamp: number;
  size: string;
  scan: 'Clean' | 'Threat detected';
  status: 'approved' | 'pending' | 'rejected' | 'quarantined';
  rejectReason?: string;
  hash: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  date: string;
  timestamp: number;
  target: string;
  channels: string[];
  status: 'sent' | 'scheduled' | 'draft';
  opens: number;
  clicks: number;
}

export interface ServiceRequest {
  id: string;
  clientId: number;
  client: string;
  agent: string;
  agentId: string;
  service: string;
  status: 'pending_payment' | 'in_progress' | 'completed' | 'cancelled';
  amount: number;
  createdAt: number;
  completedAt?: number;
  documents: string[];
  notes: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIAL DATA
// ═══════════════════════════════════════════════════════════════════════════

export const initialPayments: Payment[] = [
  { id: 'PAY-001', client: 'Adebayo Ogunlesi', clientId: 1, phone: '08031234567', email: 'adebayo@gmail.com', service: 'Academic Pro - Thesis', amount: 100000, amountClaimed: 100000, status: 'pending', time: '5 min ago', timestamp: Date.now() - 5*60000, ref: '08031234567_A1', receipt: '/receipts/001.jpg', agent: 'A1' },
  { id: 'PAY-002', client: 'Chidinma Eze', clientId: 2, phone: '08098765432', email: 'chidi@yahoo.com', service: 'ServiceMart - NIN/BVN', amount: 2500, amountClaimed: 2500, status: 'confirmed', time: '15 min ago', timestamp: Date.now() - 15*60000, ref: '08098765432_A13', receipt: '/receipts/002.jpg', agent: 'A13', confirmedBy: 'admin@dutchkem.com', confirmedAt: Date.now() - 10*60000 },
  { id: 'PAY-003', client: 'Ibrahim Musa', clientId: 3, phone: '07061234567', email: 'ibrahim@gmail.com', service: 'MediaStudio - Video Edit', amount: 35000, amountClaimed: 35000, status: 'pending', time: '32 min ago', timestamp: Date.now() - 32*60000, ref: '07061234567_A8', receipt: '/receipts/003.jpg', agent: 'A8' },
  { id: 'PAY-004', client: 'Ngozi Okafor', clientId: 4, phone: '09012345678', email: 'ngozi@outlook.com', service: 'PhoneRetriever - GPS', amount: 15000, amountClaimed: 14500, status: 'rejected', time: '1 hour ago', timestamp: Date.now() - 60*60000, ref: '09012345678_A10', receipt: '/receipts/004.jpg', agent: 'A10', rejectReason: 'Amount mismatch: ₦500 short' },
  { id: 'PAY-005', client: 'Tunde Bakare', clientId: 5, phone: '08181234567', email: 'tunde@gmail.com', service: 'StatsPro - Full Package', amount: 50000, amountClaimed: 50000, status: 'confirmed', time: '2 hours ago', timestamp: Date.now() - 120*60000, ref: '08181234567_A5', receipt: '/receipts/005.jpg', agent: 'A5', confirmedBy: 'admin@dutchkem.com', confirmedAt: Date.now() - 115*60000 },
  { id: 'PAY-006', client: 'Folake Adeyemi', clientId: 6, phone: '08141234567', email: 'folake@gmail.com', service: 'DataPro - Power BI', amount: 30000, amountClaimed: 30000, status: 'pending', time: '3 hours ago', timestamp: Date.now() - 180*60000, ref: '08141234567_A9', receipt: '/receipts/006.jpg', agent: 'A9' },
];

export const initialClients: Client[] = [
  { id: 1, name: 'Adebayo Ogunlesi', phone: '08031234567', email: 'adebayo@gmail.com', state: 'Lagos', lga: 'Ikeja', spend: 350000, orders: 12, status: 'active', joined: '2024-01-15', lastLogin: '2 hours ago', kyc: 'verified', referrals: 3, referrer: null, nin: '12345678901', credits: 5000, notes: [] },
  { id: 2, name: 'Chidinma Eze', phone: '08098765432', email: 'chidi@yahoo.com', state: 'Ogun', lga: 'Abeokuta South', spend: 125000, orders: 8, status: 'active', joined: '2024-02-20', lastLogin: '5 hours ago', kyc: 'verified', referrals: 1, referrer: 'Adebayo O.', nin: '23456789012', credits: 0, notes: [] },
  { id: 3, name: 'Ibrahim Musa', phone: '07061234567', email: 'ibrahim@gmail.com', state: 'Oyo', lga: 'Ibadan North', spend: 85000, orders: 5, status: 'active', joined: '2024-03-10', lastLogin: '1 day ago', kyc: 'pending', referrals: 0, referrer: null, nin: null, credits: 2000, notes: [] },
  { id: 4, name: 'Ngozi Okafor', phone: '09012345678', email: 'ngozi@outlook.com', state: 'Osun', lga: 'Osogbo', spend: 45000, orders: 3, status: 'suspended', joined: '2024-04-05', lastLogin: '3 days ago', kyc: 'failed', referrals: 0, referrer: 'Tunde B.', nin: '34567890123', credits: 0, notes: ['Payment dispute - under review'] },
  { id: 5, name: 'Tunde Bakare', phone: '08181234567', email: 'tunde@gmail.com', state: 'Ekiti', lga: 'Ado-Ekiti', spend: 220000, orders: 15, status: 'active', joined: '2024-01-28', lastLogin: '30 min ago', kyc: 'verified', referrals: 5, referrer: null, nin: '45678901234', credits: 10000, notes: [] },
  { id: 6, name: 'Folake Adeyemi', phone: '08141234567', email: 'folake@gmail.com', state: 'Lagos', lga: 'Lekki', spend: 180000, orders: 10, status: 'active', joined: '2024-02-14', lastLogin: '1 hour ago', kyc: 'verified', referrals: 2, referrer: 'Adebayo O.', nin: '56789012345', credits: 3000, notes: [] },
];

export const initialActivities: ActivityLog[] = [
  { id: 1, type: 'payment_confirmed', client: 'Chidinma Eze', clientId: 2, detail: 'Payment ₦2,500 confirmed for NIN/BVN', time: '5 min ago', timestamp: Date.now() - 5*60000, ip: '102.89.23.45', device: 'Chrome/Windows', action: 'admin_confirmed_payment', adminActor: 'admin@dutchkem.com' },
  { id: 2, type: 'login_success', client: 'Adebayo Ogunlesi', clientId: 1, detail: 'Logged in via OTP', time: '12 min ago', timestamp: Date.now() - 12*60000, ip: '197.210.56.78', device: 'Safari/iPhone', action: 'login_success' },
  { id: 3, type: 'payment_submitted', client: 'Ibrahim Musa', clientId: 3, detail: 'Payment ₦35,000 submitted for Video Editing', time: '32 min ago', timestamp: Date.now() - 32*60000, ip: '41.203.67.89', device: 'Chrome/Android', action: 'payment_submitted' },
  { id: 4, type: 'service_completed', client: 'Tunde Bakare', clientId: 5, detail: 'StatsPro full package completed', time: '1 hour ago', timestamp: Date.now() - 60*60000, ip: '105.112.45.67', device: 'Firefox/Mac', action: 'service_completed' },
  { id: 5, type: 'payment_rejected', client: 'Ngozi Okafor', clientId: 4, detail: 'Payment rejected - amount mismatch', time: '1 hour ago', timestamp: Date.now() - 65*60000, ip: '154.118.23.45', device: 'Chrome/Windows', action: 'admin_rejected_payment', suspicious: true, adminActor: 'admin@dutchkem.com' },
  { id: 6, type: 'chat_started', client: 'Folake Adeyemi', clientId: 6, detail: 'Started chat with DataPro agent', time: '3 hours ago', timestamp: Date.now() - 180*60000, ip: '102.89.34.56', device: 'Chrome/Mac', action: 'chat_started' },
  { id: 7, type: 'login_failed', client: 'Unknown', clientId: null, detail: 'Failed login attempt (wrong OTP)', time: '4 hours ago', timestamp: Date.now() - 240*60000, ip: '41.58.23.100', device: 'Chrome/Windows', action: 'login_failed', suspicious: true },
];

export const initialChats: ChatSession[] = [
  { id: 1, client: 'Adebayo Ogunlesi', clientId: 1, agent: 'Academic Pro', agentId: 'A1', lastMsg: 'Can you help with my thesis chapter 3?', time: '2 min ago', timestamp: Date.now() - 2*60000, unread: 2, status: 'active', priority: 'high', satisfaction: null, messages: [
    { id: 1, sender: 'client', content: 'Hello, I need help with my thesis', timestamp: Date.now() - 10*60000, read: true },
    { id: 2, sender: 'agent', content: 'Hello! I\'d be happy to help. What topic is your thesis on?', timestamp: Date.now() - 8*60000, read: true },
    { id: 3, sender: 'client', content: 'It\'s about renewable energy in Nigeria', timestamp: Date.now() - 5*60000, read: true },
    { id: 4, sender: 'client', content: 'Can you help with my thesis chapter 3?', timestamp: Date.now() - 2*60000, read: false },
  ]},
  { id: 2, client: 'Ibrahim Musa', clientId: 3, agent: 'MediaStudio Pro', agentId: 'A8', lastMsg: 'I need the video edited by Friday', time: '5 min ago', timestamp: Date.now() - 5*60000, unread: 0, status: 'active', priority: 'medium', satisfaction: null, messages: [] },
  { id: 3, client: 'Folake Adeyemi', clientId: 6, agent: 'DataPro', agentId: 'A9', lastMsg: 'The Power BI dashboard looks great!', time: '12 min ago', timestamp: Date.now() - 12*60000, unread: 1, status: 'active', priority: 'low', satisfaction: 5, messages: [] },
  { id: 4, client: 'Ngozi Okafor', clientId: 4, agent: 'PhoneRetriever', agentId: 'A10', lastMsg: 'Here is my police report', time: '30 min ago', timestamp: Date.now() - 30*60000, unread: 0, status: 'waiting', priority: 'high', satisfaction: null, messages: [] },
  { id: 5, client: 'Tunde Bakare', clientId: 5, agent: 'StatsPro', agentId: 'A5', lastMsg: 'Please run ANOVA on the data', time: '1 hour ago', timestamp: Date.now() - 60*60000, unread: 3, status: 'active', priority: 'medium', satisfaction: null, messages: [] },
];

export const initialDocuments: Document[] = [
  { id: 1, name: 'Payment_receipt_001.pdf', client: 'Adebayo Ogunlesi', clientId: 1, type: 'Receipt', date: '2 hours ago', timestamp: Date.now() - 2*60*60000, size: '245 KB', scan: 'Clean', status: 'approved', hash: 'abc123...' },
  { id: 2, name: 'thesis_chapter3.docx', client: 'Chidinma Eze', clientId: 2, type: 'Document', date: '5 hours ago', timestamp: Date.now() - 5*60*60000, size: '1.2 MB', scan: 'Clean', status: 'approved', hash: 'def456...' },
  { id: 3, name: 'police_report.pdf', client: 'Ibrahim Musa', clientId: 3, type: 'Official', date: '1 day ago', timestamp: Date.now() - 24*60*60000, size: '890 KB', scan: 'Clean', status: 'pending', hash: 'ghi789...' },
  { id: 4, name: 'NIN_slip_scan.jpg', client: 'Ngozi Okafor', clientId: 4, type: 'ID', date: '1 day ago', timestamp: Date.now() - 24*60*60000, size: '156 KB', scan: 'Clean', status: 'rejected', rejectReason: 'Image quality too low', hash: 'jkl012...' },
  { id: 5, name: 'proof_of_payment.png', client: 'Tunde Bakare', clientId: 5, type: 'Receipt', date: '2 days ago', timestamp: Date.now() - 48*60*60000, size: '320 KB', scan: 'Clean', status: 'approved', hash: 'mno345...' },
];

export const initialAnnouncements: Announcement[] = [
  { id: 1, title: 'System Maintenance Notice', body: 'Our services will be briefly unavailable on Saturday from 2-4 AM.', date: 'Jan 15, 2024', timestamp: Date.now() - 5*24*60*60000, target: 'All Clients', channels: ['SMS', 'Email'], status: 'sent', opens: 2847, clicks: 456 },
  { id: 2, title: 'New Agent: PhoneRetriever', body: 'We\'re excited to announce our new phone recovery service!', date: 'Jan 10, 2024', timestamp: Date.now() - 10*24*60*60000, target: 'All Clients', channels: ['SMS', 'Email', 'WhatsApp'], status: 'sent', opens: 3102, clicks: 891 },
  { id: 3, title: 'Holiday Discount: 20% Off', body: 'Enjoy 20% off all services this festive season.', date: 'Dec 20, 2023', timestamp: Date.now() - 30*24*60*60000, target: 'All Clients', channels: ['Email'], status: 'sent', opens: 1893, clicks: 234 },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function generatePaymentId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `PAY-${num}`;
}

export function generateActivityId(activities: ActivityLog[]): number {
  return Math.max(0, ...activities.map(a => a.id)) + 1;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

export const agentsList = [
  { id: 'A1', name: 'Academic Pro', icon: '🎓', status: 'online' as const, load: 78, chats: 12, avgResponse: '1.2m' },
  { id: 'A2', name: 'FormatPro', icon: '📝', status: 'online' as const, load: 45, chats: 5, avgResponse: '0.8m' },
  { id: 'A3', name: 'LitReview Pro', icon: '📚', status: 'online' as const, load: 62, chats: 8, avgResponse: '1.5m' },
  { id: 'A4', name: 'Plagiarism Pro', icon: '🔍', status: 'online' as const, load: 55, chats: 6, avgResponse: '0.9m' },
  { id: 'A5', name: 'StatsPro', icon: '📊', status: 'online' as const, load: 70, chats: 9, avgResponse: '2.1m' },
  { id: 'A6', name: 'Presentation Pro', icon: '🎨', status: 'online' as const, load: 40, chats: 4, avgResponse: '1.0m' },
  { id: 'A7', name: 'Grant Pro', icon: '🏆', status: 'online' as const, load: 35, chats: 3, avgResponse: '1.8m' },
  { id: 'A8', name: 'MediaStudio', icon: '🎬', status: 'online' as const, load: 85, chats: 15, avgResponse: '2.5m' },
  { id: 'A9', name: 'DataPro', icon: '💾', status: 'online' as const, load: 58, chats: 7, avgResponse: '1.3m' },
  { id: 'A10', name: 'PhoneRetriever', icon: '📱', status: 'maintenance' as const, load: 0, chats: 0, avgResponse: '-' },
  { id: 'A11', name: 'ContentPro', icon: '📣', status: 'online' as const, load: 72, chats: 10, avgResponse: '1.1m' },
  { id: 'A12', name: 'BusinessPro', icon: '💼', status: 'online' as const, load: 65, chats: 8, avgResponse: '1.7m' },
  { id: 'A13', name: 'ServiceMart', icon: '🏛️', status: 'online' as const, load: 90, chats: 18, avgResponse: '0.7m' },
];

export const revenueData = {
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
