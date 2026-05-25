import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Smile, ArrowLeft, Mic, MicOff,
  User, CheckCheck, Image, FileText, ChevronRight, Search
} from 'lucide-react';
import { agents, categories, type Agent } from '../data/agents';
import { sendOtp, verifyOtp, getClient, registerClient, updateClientSession, type RegisteredClient } from '../services/termii';
import { sendAgentMessage } from '../services/ai';
import { isLoggedInElsewhere, createSession, validateSession, logout, logoutAllDevices, getCurrentSession, startSessionHeartbeat, getUser } from '../security/session';
import { initiatePayment, checkPaymentStatus, updateLocalPayment } from '../services/payment';

interface ChatPageProps {
  setCurrentPage?: (page: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  read: boolean;
  suggestions?: string[];
}

// Per-agent saved session
interface AgentSession {
  messages: Message[];
  context: Record<string, string>;
  files: { name: string; size: string }[];
  lastActive: number;
}

export default function ChatPage({ setCurrentPage }: ChatPageProps) {
  const [step, setStep] = useState<'auth' | 'agents' | 'chat'>('auth');
  const [email, setEmail] = useState(''); // stores phone number
  const [displayName, setDisplayName] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpPinId, setOtpPinId] = useState('');
  const [otpError, setOtpError] = useState('');
  const [clientProfile, setClientProfile] = useState<RegisteredClient | null>(null);
  const [isReturningClient, setIsReturningClient] = useState(false);
  const [deviceBlocked, setDeviceBlocked] = useState<{ blocked: boolean; deviceInfo?: string }>({ blocked: false });
  const [showForceLogout, setShowForceLogout] = useState(false);
  const [sessionInvalidated, setSessionInvalidated] = useState(false);
  // Keep phone for backward compat with session storage
  const phone = email;
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [agentCategory, setAgentCategory] = useState('all');
  const [context, setContext] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);

  // ── MULTI-AGENT SESSION MEMORY ──
  const [agentSessions, setAgentSessions] = useState<Record<string, AgentSession>>({});
  const [agentHistory, setAgentHistory] = useState<string[]>([]); // stack of visited agent IDs
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [pendingAgent, setPendingAgent] = useState<Agent | null>(null); // agent user wants to switch to
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── CHECK EXISTING SESSION ON MOUNT ──
  useEffect(() => {
    const existingSession = getCurrentSession();
    if (existingSession) {
      const validation = validateSession();
      if (validation.valid) {
        // Already logged in on THIS device — skip auth
        setEmail(existingSession.email);
        const user = getUser(existingSession.email);
        if (user) setDisplayName(user.name);
        setStep('agents');
      } else if (validation.reason === 'logged_in_elsewhere') {
        setSessionInvalidated(true);
        logout();
      }
    }

    // Start heartbeat to keep session alive + detect kicks
    const stopHeartbeat = startSessionHeartbeat();
    const handleInvalidation = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.reason === 'logged_in_elsewhere') {
        setSessionInvalidated(true);
        setStep('auth');
      }
    };
    window.addEventListener('session_invalidated', handleInvalidation);
    return () => {
      stopHeartbeat();
      window.removeEventListener('session_invalidated', handleInvalidation);
    };
  }, []);

  // Check for payment return and clean URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const paymentRef = params.get('ref');

    if (paymentStatus === 'success' && paymentRef) {
      // User returned from Kora Pay checkout
      updateLocalPayment(paymentRef, 'success');
      // The polling in handlePayNow will also detect this
    }

    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const isPhoneValid = email.replace(/^0+/, '').length >= 10 || email.length >= 10;

  // Check for returning client on phone change
  useEffect(() => {
    if (isPhoneValid) {
      const existing = getClient(email);
      if (existing && existing.visitCount > 0) {
        setIsReturningClient(true);
        setClientProfile(existing);
      } else {
        setIsReturningClient(false);
        setClientProfile(null);
      }
    }
  }, [email, isPhoneValid]);

  const handleSendOtp = async () => {
    if (!isPhoneValid) return;
    setSendingOtp(true);
    setOtpError('');
    setDeviceBlocked({ blocked: false });

    // Check if this email is already logged in on another device
    const blockCheck = isLoggedInElsewhere(email);
    if (blockCheck.blocked) {
      setDeviceBlocked(blockCheck);
      setShowForceLogout(true);
      setSendingOtp(false);
      return;
    }

    try {
      const result = await sendOtp(email);
      if (result.success) {
        setOtpPinId(result.pinId || '');
        setOtpSent(true);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setOtpError(result.message || 'Could not send OTP. Check your phone number and try again.');
      }
    } catch {
      setOtpError('Network error. Check your internet connection and try again.');
    }
    setSendingOtp(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && newDigits.every(d => d !== '')) handleVerifyOtp(newDigits.join(''));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const nd = [...otpDigits]; nd[index - 1] = ''; setOtpDigits(nd);
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otpDigits.every(d => d !== '')) handleVerifyOtp(otpDigits.join(''));
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted.length) return;
    const nd = ['','','','','',''];
    for (let i = 0; i < 6; i++) nd[i] = pasted[i] || '';
    setOtpDigits(nd);
    if (pasted.length === 6) handleVerifyOtp(pasted);
  };

  const handleVerifyOtp = async (code?: string) => {
    const fullCode = code || otpDigits.join('');
    if (fullCode.length < 6) return;
    setVerifying(true);
    setOtpError('');
    try {
      const result = await verifyOtp(otpPinId, fullCode);
      if (result.verified) {
        // Register / update client
        const profile = registerClient(phone);
        setClientProfile(profile);
        setIsReturningClient(profile.visitCount > 1);
        // Create locked session — prevents login on other devices
        createSession(email, displayName);
        setStep('agents');
      } else {
        setOtpError('Invalid or expired code. Please try again.');
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setOtpError('Verification failed. Please try again.');
    }
    setVerifying(false);
  };

  const handleResendOtp = async () => {
    setOtpDigits(['','','','','','']);
    setSendingOtp(true);
    await new Promise(r => setTimeout(r, 1000));
    setSendingOtp(false);
    otpRefs.current[0]?.focus();
  };

  const otpFilled = otpDigits.every(d => d !== '');

  // ── FILE UPLOAD HANDLER ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedAgent) return;
    const file = files[0];
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > 10 * 1024 * 1024) {
      const errMsg: Message = { id: Date.now().toString(), sender: 'bot', content: `⚠️ File too large. Maximum upload size is 10MB.\n\nYour file "${file.name}" is ${sizeMB}MB. Please compress it or choose a smaller file.`, timestamp: new Date(), read: true, suggestions: ['Try again', 'Compress my file'] };
      setMessages(prev => [...prev, errMsg]);
      return;
    }

    setUploadedFiles(prev => [...prev, { name: file.name, size: `${sizeMB} MB` }]);

    // Show user upload message
    const icon = type === 'image' ? '🖼️' : '📄';
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', content: `${icon} ${file.name} (${sizeMB} MB)`, timestamp: new Date(), read: true };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const isReceipt = file.name.toLowerCase().includes('receipt') || file.name.toLowerCase().includes('payment') || file.name.toLowerCase().includes('proof') || type === 'image';
      const botReply: Message = {
        id: (Date.now() + 1).toString(), sender: 'bot', timestamp: new Date(), read: false,
        content: isReceipt
          ? `✅ File received: "${file.name}"\n\nI can see your upload. Here's what happens next:\n\n1️⃣ Your receipt has been forwarded to our admin team\n2️⃣ They'll verify the payment against our OPay records\n3️⃣ You'll receive confirmation via SMS & email within 2 hours\n4️⃣ Once confirmed, your ${selectedAgent.name} service will be activated immediately\n\n📞 If it takes longer than 2 hours, contact support on WhatsApp: +234 913 393 5256\n\nIs there anything else you need while you wait?`
          : `✅ File received: "${file.name}" (${sizeMB} MB)\n\n🔒 File scanned — no threats detected.\n\nI'm reviewing your document now. Based on what I can see, here's what I'll do:\n\n📋 Analyze the content and structure\n🎯 Identify exactly what you need\n💡 Provide my recommendation\n\nGive me a moment to process this. In the meantime, could you tell me any specific instructions or requirements?`,
        suggestions: isReceipt ? ['Check payment status', 'Contact support', 'Start another task'] : ['Here are my instructions', 'How long will it take?', 'Show pricing'],
      };
      setMessages(prev => [...prev, botReply]);
    }, 1500);

    // Reset the input so same file can be selected again
    e.target.value = '';
  };

  // ── SAVE CURRENT SESSION before leaving ──
  const saveCurrentSession = () => {
    if (selectedAgent && messages.length > 0) {
      setAgentSessions(prev => ({
        ...prev,
        [selectedAgent.id]: { messages, context, files: uploadedFiles, lastActive: Date.now() },
      }));
      // Also persist to client registry
      if (phone) {
        updateClientSession(phone, selectedAgent.id, messages.length);
      }
    }
  };

  // ── AGENT SELECTION (with resume/discard logic) ──
  const handleSelectAgent = (agent: Agent) => {
    // Check if this agent has a saved session
    const existing = agentSessions[agent.id];
    if (existing && existing.messages.length > 1) {
      // Agent has history — ask resume or start fresh
      setPendingAgent(agent);
      setShowResumePrompt(true);
      return;
    }
    // No existing session — start fresh
    startFreshSession(agent);
  };

  const startFreshSession = (agent: Agent) => {
    setSelectedAgent(agent);
    setContext({});
    setUploadedFiles([]);
    setShowResumePrompt(false);
    setPendingAgent(null);
    setStep('chat');
    // Track in navigation history
    setAgentHistory(prev => [...prev.filter(id => id !== agent.id), agent.id]);
    const welcome = getWelcomeMessage(agent);
    const msgs: Message[] = [{
      id: Date.now().toString(),
      sender: 'bot',
      content: welcome.text,
      timestamp: new Date(),
      read: true,
      suggestions: welcome.suggestions,
    }];
    setMessages(msgs);
    // Save immediately
    setAgentSessions(prev => ({
      ...prev,
      [agent.id]: { messages: msgs, context: {}, files: [], lastActive: Date.now() },
    }));
  };

  const resumeSession = (agent: Agent) => {
    const session = agentSessions[agent.id];
    if (!session) return startFreshSession(agent);
    setSelectedAgent(agent);
    setMessages(session.messages);
    setContext(session.context);
    setUploadedFiles(session.files);
    setShowResumePrompt(false);
    setPendingAgent(null);
    setStep('chat');
    setAgentHistory(prev => [...prev.filter(id => id !== agent.id), agent.id]);
    // Add a "welcome back" message
    const wb: Message = {
      id: Date.now().toString(), sender: 'bot', timestamp: new Date(), read: true,
      content: `Welcome back! 😊 I remember our conversation.\n\nWe were discussing: "${session.messages.filter(m => m.sender === 'user').slice(-1)[0]?.content || 'your project'}"\n\nWould you like to continue where we left off, or start something new?`,
      suggestions: ['Continue where we left off', 'Start something new', 'Show my history'],
    };
    setMessages(prev => [...prev, wb]);
  };

  // ── SWITCH AGENT (from chat header) ──
  const handleSwitchAgent = () => {
    saveCurrentSession();
    setShowSwitchModal(true);
  };

  const confirmSwitchTo = (agent: Agent) => {
    setShowSwitchModal(false);
    handleSelectAgent(agent);
  };

  // ── GO BACK to agent list ──
  const handleBackToAgents = () => {
    saveCurrentSession();
    setStep('agents');
  };

  // ── GO BACK to previous agent ──
  const handleGoBackAgent = () => {
    if (agentHistory.length < 2) {
      handleBackToAgents();
      return;
    }
    saveCurrentSession();
    const prevId = agentHistory[agentHistory.length - 2];
    const prevAgent = agents.find(a => a.id === prevId);
    if (prevAgent) {
      setAgentHistory(prev => prev.slice(0, -1));
      const session = agentSessions[prevId];
      if (session) {
        setSelectedAgent(prevAgent);
        setMessages(session.messages);
        setContext(session.context);
        setUploadedFiles(session.files);
      } else {
        startFreshSession(prevAgent);
      }
    } else {
      handleBackToAgents();
    }
  };

  // ── CLOSE CHAT (with confirmation) ──
  const handleCloseChat = () => {
    if (messages.length > 1) {
      setShowCloseConfirm(true);
    } else {
      doCloseChat();
    }
  };

  const doCloseChat = () => {
    saveCurrentSession();
    setShowCloseConfirm(false);
    if (setCurrentPage) setCurrentPage('home');
    else setStep('agents');
  };

  const handleFullLogout = () => {
    saveCurrentSession();
    logout();
    setStep('auth');
    setEmail('');
    setDisplayName('');
    setOtpSent(false);
    setOtpDigits(['','','','','','']);
    setMessages([]);
    setSelectedAgent(null);
    setAgentSessions({});
  };

  // Count agents with active sessions
  const activeSessionCount = Object.values(agentSessions).filter(s => s.messages.length > 1).length;

  // ── SEND MESSAGE ──
  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) return;

    // Intercept payment intent
    const lower = input.toLowerCase();
    if (lower.includes('pay now') || lower === 'pay' || lower.includes('make payment') || lower.includes('i want to pay')) {
      setInput('');
      handlePayNow();
      return;
    }
    const userMsg: Message = {
      id: Date.now().toString(), sender: 'user', content: input, timestamp: new Date(), read: true,
    };
    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    // Build chat history for AI context
    const history = messages
      .filter(m => m.content)
      .map(m => ({ role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content }));

    // 1. Try real AI backend
    const aiResult = await sendAgentMessage({
      agentId: selectedAgent.id,
      message: userInput,
      history,
    });

    if (aiResult.success && aiResult.source === 'nvidia-nim' && aiResult.message) {
      // Real AI response
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        content: aiResult.message,
        timestamp: new Date(),
        read: false,
        suggestions: aiResult.suggestions || ['Tell me more', 'Show pricing', 'How to pay'],
      }]);
      return;
    }

    // 2. Fallback: local pattern matching (when backend not available)
    const delay = 800 + Math.min(userInput.length * 15, 2000) + Math.random() * 500;
    setTimeout(() => {
      setIsTyping(false);
      const response = getAgentResponse(userInput, selectedAgent, context, setContext);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        content: response.text,
        timestamp: new Date(),
        read: false,
        suggestions: response.suggestions,
      }]);
    }, delay);
  };

  // ── HANDLE PAYMENT ──
  const handlePayNow = async (amount?: number) => {
    if (!selectedAgent) return;

    const payAmount = amount || (selectedAgent.services[0] ? parseInt(selectedAgent.services[0].price.replace(/[^\d]/g, '')) || 5000 : 5000);

    // Show processing message
    setMessages(prev => [...prev, {
      id: Date.now().toString(), sender: 'bot', timestamp: new Date(), read: true,
      content: `💳 Opening secure payment checkout for ₦${payAmount.toLocaleString()}...\n\nYou'll be redirected to Kora Pay's secure checkout. After payment, your service starts automatically.`,
    }]);

    const result = await initiatePayment({
      amount: payAmount,
      customerEmail: `${email}@dutchkem.ng`,
      customerPhone: email,
      customerName: displayName || 'Client',
      agentId: selectedAgent.id,
      serviceName: selectedAgent.services[0]?.name || selectedAgent.name,
    });

    if (result.success && result.checkoutUrl) {
      // Open Kora Pay checkout
      window.open(result.checkoutUrl, '_blank');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot', timestamp: new Date(), read: true,
        content: `✅ Payment page opened in a new tab!\n\n📋 Reference: ${result.reference}\n💰 Amount: ₦${payAmount.toLocaleString()}\n\nComplete the payment there, then come back here. I'll detect it automatically and start working on your task.\n\n⏳ Waiting for payment confirmation...`,
        suggestions: ['I\'ve completed payment', 'Payment failed', 'Cancel'],
      }]);

      // Poll for payment confirmation every 10 seconds for 5 minutes
      if (result.reference) {
        const ref = result.reference;
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          if (attempts > 30) { clearInterval(pollInterval); return; } // Stop after 5 min

          const status = await checkPaymentStatus(ref);
          if (status.status === 'success') {
            clearInterval(pollInterval);
            updateLocalPayment(ref, 'success');
            setMessages(prev => [...prev, {
              id: (Date.now() + 2).toString(), sender: 'bot', timestamp: new Date(), read: true,
              content: `🎉 PAYMENT CONFIRMED! ₦${payAmount.toLocaleString()} received.\n\nReference: ${ref}\n\nI'm now starting work on your task. Tell me exactly what you need and I'll deliver it with excellence! 🚀`,
              suggestions: ['Start my task', 'Show what\'s included', 'I have specific instructions'],
            }]);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            updateLocalPayment(ref, 'failed');
            setMessages(prev => [...prev, {
              id: (Date.now() + 2).toString(), sender: 'bot', timestamp: new Date(), read: true,
              content: `❌ Payment was not successful.\n\nDon't worry — no money was charged. This can happen due to insufficient funds, network issues, or bank decline.\n\nWould you like to try again?`,
              suggestions: ['Try again', 'Use different payment method', 'Contact support'],
            }]);
          } else if (status.status === 'reversed') {
            clearInterval(pollInterval);
            updateLocalPayment(ref, 'reversed');
            setMessages(prev => [...prev, {
              id: (Date.now() + 2).toString(), sender: 'bot', timestamp: new Date(), read: true,
              content: `🚨 Payment reversal detected.\n\nYour payment for ₦${payAmount.toLocaleString()} was reversed. Access has been suspended.\n\nPlease contact support at +234 913 393 5256 to resolve this.`,
              suggestions: ['Contact support'],
            }]);
          }
        }, 10000);
      }
    } else {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot', timestamp: new Date(), read: true,
        content: `⚠️ ${result.message}\n\nThis usually happens when:\n• Your internet connection is slow\n• The payment server is starting up (wait 30 seconds and try again)\n• There's a temporary network issue\n\n💡 Tip: If this is your first time, the server may take up to 60 seconds to wake up. Please try again.\n\n📞 Need help? Contact us: +234 913 393 5256`,
        suggestions: ['🔄 Try again now', 'Contact support'],
      }]);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Intercept payment-related suggestions
    if (suggestion.includes('Pay Now') || suggestion.includes('pay now')) {
      handlePayNow();
      return;
    }
    if (suggestion === 'Try again' || suggestion === '🔄 Try again now' || suggestion.includes('Try again')) {
      handlePayNow();
      return;
    }
    if (suggestion === 'I\'ve completed payment') {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), sender: 'user', content: suggestion, timestamp: new Date(), read: true,
      }, {
        id: (Date.now() + 1).toString(), sender: 'bot', content: '⏳ Checking your payment status... Please wait a moment while I verify.', timestamp: new Date(), read: true,
      }]);
      return;
    }

    setInput('');
    const userMsg: Message = {
      id: Date.now().toString(), sender: 'user', content: suggestion, timestamp: new Date(), read: true,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    if (!selectedAgent) return;

    // Build history
    const history = messages
      .filter(m => m.content)
      .map(m => ({ role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content }));

    // Try real AI
    const aiResult = await sendAgentMessage({ agentId: selectedAgent.id, message: suggestion, history });
    if (aiResult.success && aiResult.source === 'nvidia-nim' && aiResult.message) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot', content: aiResult.message, timestamp: new Date(), read: false,
        suggestions: aiResult.suggestions || ['Continue', 'Show pricing', 'How to pay'],
      }]);
      return;
    }

    // Fallback
    setTimeout(() => {
      setIsTyping(false);
      if (!selectedAgent) return;
      const response = getAgentResponse(suggestion, selectedAgent, context, setContext);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot', content: response.text, timestamp: new Date(), read: false,
        suggestions: response.suggestions,
      }]);
    }, 1000 + Math.random() * 800);
  };

  const filteredAgents = agents.filter(a => {
    const q = agentSearch.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.services.some(s => s.name.toLowerCase().includes(q));
    const matchCat = agentCategory === 'all' || a.category === agentCategory;
    return matchSearch && matchCat;
  });

  return (
    <section className="pt-16 min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
        <AnimatePresence mode="wait">
          {/* ═══ SESSION KICKED MODAL ═══ */}
          {sessionInvalidated && step === 'auth' && (
            <motion.div key="session-kicked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                <div className="w-14 h-14 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🔒</span></div>
                <h3 className="font-display text-lg font-bold text-navy mb-2">Session Ended</h3>
                <p className="text-sm text-navy/60 mb-6">You've been logged out because your account was accessed from another device. For your security, only one active session is allowed at a time.</p>
                <button onClick={() => setSessionInvalidated(false)} className="w-full py-3 bg-navy text-white rounded-xl font-semibold cursor-pointer hover:bg-navy-light">Sign In Again</button>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ LOGGED IN ELSEWHERE MODAL ═══ */}
          {showForceLogout && deviceBlocked.blocked && (
            <motion.div key="device-blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
                <h3 className="font-display text-lg font-bold text-navy mb-2">Already Logged In</h3>
                <p className="text-sm text-navy/60 mb-2">Your account <strong className="text-navy">{email}</strong> is currently active on <strong className="text-navy">{deviceBlocked.deviceInfo || 'another device'}</strong>.</p>
                <p className="text-xs text-navy/40 mb-6">For security, each account can only be used on one device at a time. Log out from the other device first, or force logout below.</p>
                <div className="space-y-2">
                  <button onClick={() => {
                    logoutAllDevices(email);
                    setShowForceLogout(false);
                    setDeviceBlocked({ blocked: false });
                    setOtpError('');
                    // Now retry the login
                    handleSendOtp();
                  }} className="w-full py-3 bg-coral text-white rounded-xl font-semibold cursor-pointer hover:bg-coral-dark">🔓 Force Logout Other Device & Continue</button>
                  <button onClick={() => { setShowForceLogout(false); setDeviceBlocked({ blocked: false }); }} className="w-full py-3 bg-cream text-navy rounded-xl font-semibold cursor-pointer hover:bg-cream-dark border border-gray-200">Cancel</button>
                </div>
                <p className="text-[10px] text-navy/30 mt-4">If this wasn't you, someone may have your login. Change your password immediately.</p>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ AUTH — Google/Email Login + OTP ═══ */}
          {step === 'auth' && (
            <motion.div key="auth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex items-center justify-center h-full p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl border border-gray-100 relative overflow-hidden">
                {/* Logo watermark background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img src="/images/dutchkem-logo.png" alt="" className="w-64 h-64 object-contain opacity-[0.03]" />
                </div>

                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <img src="/images/dutchkem-logo.png" alt="Dutchkem Ventures" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-lg rounded-lg" />
                    <h2 className="font-display text-2xl font-bold text-navy">{otpSent ? 'Enter OTP Code' : 'Verify Your Phone'}</h2>
                    <p className="text-navy/50 text-sm mt-2">
                      {otpSent ? 'Enter the 6-digit code sent to your phone' : 'Enter your phone number to access 13 AI agents'}
                    </p>
                  </div>

                  {!otpSent ? (
                    <div className="space-y-4">
                      {/* Returning Client */}
                      {isReturningClient && clientProfile && (
                        <div className="bg-forest/5 border border-forest/10 rounded-xl p-3 flex items-center gap-2">
                          <span className="text-lg">👋</span>
                          <div>
                            <p className="text-sm font-medium text-navy">Welcome back!</p>
                            <p className="text-xs text-navy/50">
                              Visit #{clientProfile.visitCount + 1} • Last seen {new Date(clientProfile.lastSeen).toLocaleDateString()}
                              {clientProfile.lastAgent && ` • Last agent: ${agents.find(a => a.id === clientProfile.lastAgent)?.name || clientProfile.lastAgent}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Phone Number Input */}
                      <div>
                        <label className="text-sm font-medium text-navy/70 block mb-1.5">Phone Number</label>
                        <div className="flex gap-2">
                          <div className="flex items-center px-3 bg-cream rounded-xl text-sm font-mono text-navy/60 border border-gray-100 shrink-0">🇳🇬 +234</div>
                          <input
                            type="tel"
                            value={email}
                            onChange={(e) => setEmail(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && isPhoneValid && handleSendOtp()}
                            placeholder="8031234567"
                            className="flex-1 px-4 py-3 bg-cream rounded-xl text-navy font-mono border border-gray-100 focus:border-coral focus:outline-none"
                            maxLength={11}
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Your Name */}
                      <div>
                        <label className="text-sm font-medium text-navy/70 block mb-1.5">Your Name <span className="text-navy/30">(optional)</span></label>
                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should we call you?" className="w-full px-4 py-3 bg-cream rounded-xl text-navy border border-gray-100 focus:border-coral focus:outline-none" />
                      </div>

                      {otpError && (
                        <div className="bg-coral/5 border border-coral/10 rounded-xl p-3 flex items-center gap-2">
                          <span className="text-coral text-sm">⚠️</span>
                          <p className="text-sm text-coral">{otpError}</p>
                        </div>
                      )}

                      <button onClick={handleSendOtp} disabled={!isPhoneValid || sendingOtp} className="w-full py-3.5 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:shadow-lg hover:shadow-coral/30 flex items-center justify-center gap-2">
                        {sendingOtp ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending OTP...</> : '📱 Send Verification Code'}
                      </button>
                      <p className="text-center text-xs text-navy/30">
                        A 6-digit OTP will be sent to your phone via SMS
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-forest/5 border border-forest/10 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-forest text-sm">✓</span>
                          <p className="text-sm text-navy/60">OTP sent to <span className="font-mono font-bold text-navy">+234{email}</span></p>
                        </div>
                        <p className="text-xs text-navy/30 mt-1 ml-6">Check your phone for the SMS</p>
                      </div>

                      {otpError && (
                        <div className="bg-coral/5 border border-coral/10 rounded-xl p-3 flex items-center gap-2">
                          <span className="text-coral text-sm">⚠️</span>
                          <p className="text-sm text-coral">{otpError}</p>
                        </div>
                      )}

                      <p className="text-sm text-navy/60 text-center font-medium">Enter the 6-digit code from your SMS</p>

                      <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, i) => (
                          <input key={i} ref={(el) => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} disabled={verifying} className={`w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border-2 focus:outline-none transition-all ${digit ? 'bg-coral/5 border-coral text-navy' : 'bg-cream border-gray-200 focus:border-coral text-navy'} disabled:opacity-50`} />
                        ))}
                      </div>
                      <button onClick={() => handleVerifyOtp()} disabled={!otpFilled || verifying} className="w-full py-3.5 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:shadow-lg hover:shadow-coral/30 flex items-center justify-center gap-2">
                        {verifying ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</> : '✅ Verify & Access Agents'}
                      </button>
                      <div className="flex items-center justify-between">
                      <button onClick={() => { setOtpSent(false); setOtpDigits(['','','','','','']); setOtpError(''); }} className="text-xs text-navy/40 hover:text-navy cursor-pointer">← Change number</button>
                      <button onClick={handleResendOtp} disabled={sendingOtp} className="text-xs text-coral font-medium cursor-pointer disabled:opacity-50">{sendingOtp ? 'Sending...' : 'Resend OTP'}</button>
                      </div>
                    </div>
                  )}

                  {/* Security footer */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-3 text-[10px] text-navy/25">
                      <span>🔒 AES-256 Encrypted</span>
                      <span>•</span>
                      <span>🛡️ NDPR Compliant</span>
                      <span>•</span>
                      <span>📧 No spam, ever</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ AGENT SELECTION ═══ */}
          {step === 'agents' && (
            <motion.div key="agents" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full overflow-y-auto">
              <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-md border-b border-gray-100 px-4 pt-6 pb-4">
                <div className="text-center mb-4">
                  <h2 className="font-display text-2xl font-bold text-navy">
                    {isReturningClient ? `Welcome back! 👋` : 'Choose Your AI Agent'}
                  </h2>
                  <p className="text-navy/50 text-sm mt-1">
                    {isReturningClient && clientProfile
                      ? `Visit #${clientProfile.visitCount} • ${Object.keys(clientProfile.sessions).length} previous session(s) saved`
                      : 'All 13 agents are available for everyone — pick the one that fits your task'}
                  </p>
                  {isReturningClient && clientProfile && Object.keys(clientProfile.sessions).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                      <span className="text-xs text-navy/40">Your recent agents:</span>
                      {Object.entries(clientProfile.sessions).sort((a, b) => b[1].lastActive - a[1].lastActive).slice(0, 4).map(([agentId]) => {
                        const a = agents.find(ag => ag.id === agentId);
                        if (!a) return null;
                        return (
                          <button key={agentId} onClick={() => handleSelectAgent(a)} className="inline-flex items-center gap-1 px-2 py-1 bg-coral/10 text-coral rounded-lg text-xs font-medium cursor-pointer hover:bg-coral/20 transition-colors">
                            <span>{a.icon}</span>{a.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="relative max-w-md mx-auto mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30" />
                  <input type="text" value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Search by name, service, or role..." className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl text-sm text-navy border border-gray-100 focus:border-coral focus:outline-none" />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-2xl mx-auto justify-center flex-wrap">
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setAgentCategory(cat.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap flex items-center gap-1 ${agentCategory === cat.id ? 'bg-navy text-white' : 'bg-white text-navy/60 hover:text-navy border border-gray-100'}`}>
                      <span>{cat.icon}</span>{cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-4 pb-8 relative">
                {/* Centered watermark logo */}
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
                  <img src="/images/dutchkem-logo.png" alt="" className="w-56 h-56 object-contain opacity-[0.025]" />
                </div>
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">🔍</p><p className="font-bold text-navy">No agents found</p>
                    <button onClick={() => { setAgentSearch(''); setAgentCategory('all'); }} className="mt-3 text-sm text-coral font-medium cursor-pointer">Clear filters</button>
                  </div>
                ) : (
                  <div className="grid gap-3 max-w-2xl mx-auto">
                    {filteredAgents.map((agent, i) => (
                      <motion.button key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => handleSelectAgent(agent)} className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-coral/30 hover:shadow-lg transition-all cursor-pointer text-left flex items-center gap-4 group w-full">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform" style={{ background: `${agent.color}12` }}>{agent.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] text-navy/30 bg-cream px-1.5 py-0.5 rounded">{agent.id}</span>
                            <h3 className="font-bold text-navy">{agent.name}</h3>
                          </div>
                          <p className="text-xs text-navy/50 mb-2">{agent.role}</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.services.slice(0, 2).map((s, j) => (<span key={j} className="px-2 py-0.5 bg-cream rounded-md text-[10px] text-navy/50 truncate max-w-[140px]">{s.name}</span>))}
                            {agent.services.length > 2 && <span className="px-2 py-0.5 bg-cream rounded-md text-[10px] text-navy/40">+{agent.services.length - 2} more</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-xs text-coral font-semibold">{agent.services[0]?.price?.split(' ')[0]}</p>
                          <ChevronRight size={18} className="text-navy/20 group-hover:text-coral group-hover:translate-x-1 transition-all mt-1 ml-auto" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
                <p className="text-center text-[11px] text-navy/30 mt-6 max-w-md mx-auto">💡 Each agent is powered by NVIDIA NIM AI. You can switch agents anytime.</p>
              </div>
            </motion.div>
          )}

          {/* ═══ RESUME PROMPT MODAL ═══ */}
          {showResumePrompt && pendingAgent && (
            <motion.div key="resume-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowResumePrompt(false); setPendingAgent(null); }}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mx-auto mb-3" style={{ background: `${pendingAgent.color}12` }}>{pendingAgent.icon}</div>
                  <h3 className="font-display text-lg font-bold text-navy">{pendingAgent.name}</h3>
                  <p className="text-sm text-navy/50 mt-1">You have a previous conversation with this agent</p>
                </div>
                <div className="bg-cream rounded-xl p-3 mb-5">
                  <p className="text-xs text-navy/40 mb-1">Last message:</p>
                  <p className="text-sm text-navy italic">"{agentSessions[pendingAgent.id]?.messages.filter(m => m.sender === 'user').slice(-1)[0]?.content?.slice(0, 80) || '...'}"</p>
                </div>
                <div className="space-y-2">
                  <button onClick={() => resumeSession(pendingAgent)} className="w-full py-3 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl cursor-pointer hover:shadow-lg transition-all">📂 Continue Previous Chat</button>
                  <button onClick={() => { setShowResumePrompt(false); startFreshSession(pendingAgent); }} className="w-full py-3 bg-cream text-navy font-semibold rounded-xl cursor-pointer hover:bg-cream-dark transition-all border border-gray-200">🆕 Start Fresh Conversation</button>
                  <button onClick={() => { setShowResumePrompt(false); setPendingAgent(null); }} className="w-full py-2 text-navy/40 text-sm cursor-pointer hover:text-navy">Cancel</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ SWITCH AGENT MODAL ═══ */}
          {showSwitchModal && (
            <motion.div key="switch-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowSwitchModal(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-display font-bold text-navy">Switch Agent</h3>
                  <button onClick={() => setShowSwitchModal(false)} className="p-1.5 rounded-lg hover:bg-cream cursor-pointer text-navy/40">✕</button>
                </div>
                {activeSessionCount > 0 && (
                  <div className="px-4 pt-3">
                    <p className="text-xs text-navy/40 font-medium uppercase tracking-wider mb-2">Active Sessions ({activeSessionCount})</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {Object.entries(agentSessions).filter(([, s]) => s.messages.length > 1).map(([id]) => {
                        const a = agents.find(ag => ag.id === id);
                        if (!a) return null;
                        return (
                          <button key={id} onClick={() => confirmSwitchTo(a)} className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${selectedAgent?.id === id ? 'border-coral bg-coral/5' : 'border-gray-100 hover:border-coral/30 hover:bg-cream'}`}>
                            <span className="text-lg">{a.icon}</span>
                            <span className="text-xs font-medium text-navy">{a.name}</span>
                            {selectedAgent?.id === id && <span className="text-[9px] text-coral font-bold">(current)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="p-4 max-h-[50vh] overflow-y-auto">
                  <p className="text-xs text-navy/40 font-medium uppercase tracking-wider mb-2">All Agents</p>
                  <div className="space-y-1.5">
                    {agents.map(a => (
                      <button key={a.id} onClick={() => confirmSwitchTo(a)} disabled={a.id === selectedAgent?.id} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${a.id === selectedAgent?.id ? 'bg-coral/5 border border-coral/20' : 'hover:bg-cream border border-transparent'} disabled:cursor-default`}>
                        <span className="text-xl">{a.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-navy">{a.name}</span>
                            {agentSessions[a.id]?.messages.length > 1 && <span className="w-2 h-2 rounded-full bg-forest" title="Active session" />}
                          </div>
                          <p className="text-xs text-navy/40 truncate">{a.role}</p>
                        </div>
                        {a.id === selectedAgent?.id ? <span className="text-xs text-coral font-medium">Current</span> : <ChevronRight size={14} className="text-navy/20" />}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ CLOSE CONFIRM MODAL ═══ */}
          {showCloseConfirm && (
            <motion.div key="close-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCloseConfirm(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💬</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-navy">Leave this chat?</h3>
                  <p className="text-sm text-navy/50 mt-2">Don't worry — your conversation is saved. You can come back and continue anytime.</p>
                </div>
                <div className="space-y-2">
                  <button onClick={doCloseChat} className="w-full py-3 bg-navy text-white font-semibold rounded-xl cursor-pointer hover:bg-navy-light transition-all">Yes, save & close</button>
                  <button onClick={() => setShowCloseConfirm(false)} className="w-full py-3 bg-cream text-navy font-semibold rounded-xl cursor-pointer hover:bg-cream-dark border border-gray-200">Stay in chat</button>
                  <button onClick={() => { setShowCloseConfirm(false); handleFullLogout(); }} className="w-full py-2 text-coral text-sm font-medium cursor-pointer hover:text-coral-dark">🔒 Sign out completely</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ CHAT ═══ */}
          {step === 'chat' && selectedAgent && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
              {/* Header — full navigation bar */}
              <div className="bg-white border-b border-gray-100 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {/* Back Button */}
                  <button onClick={handleGoBackAgent} className="p-1.5 rounded-lg hover:bg-cream cursor-pointer group" title={agentHistory.length >= 2 ? `Back to ${agents.find(a => a.id === agentHistory[agentHistory.length - 2])?.name}` : 'Back to agents'}>
                    <ArrowLeft size={20} className="text-navy/60 group-hover:text-navy" />
                  </button>

                  {/* Agent Avatar + Info */}
                  <button onClick={handleSwitchAgent} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group" title="Switch agent">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform" style={{ background: `${selectedAgent.color}15` }}>{selectedAgent.icon}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-navy truncate">{selectedAgent.name}</h3>
                        <svg width="10" height="10" viewBox="0 0 10 10" className="text-navy/30 shrink-0"><path d="M3 4l2 2 2-2" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                        <span className="text-[10px] text-navy/40">Online</span>
                        {activeSessionCount > 1 && <span className="text-[10px] text-electric font-medium">• {activeSessionCount} chats open</span>}
                      </div>
                    </div>
                  </button>

                  {/* Agent ID */}
                  <span className="text-[10px] font-mono text-navy/25 bg-cream px-1.5 py-0.5 rounded hidden sm:block">{selectedAgent.id}</span>

                  {/* Switch Agent Quick Button */}
                  <button onClick={handleSwitchAgent} className="p-1.5 rounded-lg hover:bg-cream cursor-pointer text-navy/40 hover:text-navy" title="Switch agent">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 3l4 4-4 4" /><path d="M20 7H8a4 4 0 000 8h1" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h12a4 4 0 000-8h-1" /></svg>
                  </button>

                  {/* Close Chat */}
                  <button onClick={handleCloseChat} className="p-1.5 rounded-lg hover:bg-coral/10 cursor-pointer text-navy/40 hover:text-coral" title="Close chat">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Active Sessions Strip */}
                {activeSessionCount > 1 && (
                  <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {Object.entries(agentSessions).filter(([, s]) => s.messages.length > 1).map(([id]) => {
                      const a = agents.find(ag => ag.id === id);
                      if (!a) return null;
                      return (
                        <button key={id} onClick={() => confirmSwitchTo(a)} className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all ${id === selectedAgent.id ? 'bg-coral/10 text-coral border border-coral/20' : 'bg-cream text-navy/50 hover:bg-cream-dark border border-transparent'}`}>
                          <span className="text-sm">{a.icon}</span>
                          {a.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messages — with centered logo watermark */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
                {/* Centered watermark logo */}
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0" style={{ top: '64px' }}>
                  <img src="/images/dutchkem-logo.png" alt="" className="w-48 h-48 object-contain opacity-[0.025]" />
                </div>
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%]`}>
                      <div className="flex items-end gap-2">
                        {msg.sender === 'bot' && <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm" style={{ background: `${selectedAgent.color}15` }}>{selectedAgent.icon}</div>}
                        <div className={`px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-coral text-white rounded-br-md' : 'bg-white text-navy border border-gray-100 rounded-bl-md'}`}>
                          <p className="text-sm whitespace-pre-line">{msg.content}</p>
                        </div>
                        {msg.sender === 'user' && <div className="w-7 h-7 rounded-full bg-coral/10 flex items-center justify-center shrink-0"><User size={14} className="text-coral" /></div>}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'user' ? 'justify-end mr-9' : 'ml-9'}`}>
                        <span className="text-[10px] text-navy/30">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.sender === 'user' && <CheckCheck size={12} className={msg.read ? 'text-electric' : 'text-navy/20'} />}
                      </div>
                      {msg.suggestions && msg.sender === 'bot' && (
                        <div className="flex flex-wrap gap-2 mt-3 ml-9">
                          {msg.suggestions.map((s, i) => (
                            <button key={i} onClick={() => handleSuggestionClick(s)} className="px-3 py-1.5 bg-cream border border-gray-200 rounded-full text-xs text-navy font-medium hover:bg-coral hover:text-white hover:border-coral transition-all cursor-pointer">{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm" style={{ background: `${selectedAgent.color}15` }}>{selectedAgent.icon}</div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-navy/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-navy/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-navy/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-100 p-3">
                {/* Hidden file inputs */}
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.csv,.pptx,.txt,.zip" className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
                <input ref={imageInputRef} type="file" accept="image/*,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />

                {/* Uploaded files indicator */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 px-1">
                    {uploadedFiles.slice(-3).map((f, i) => (
                      <span key={i} className="px-2 py-1 bg-forest/10 text-forest text-[10px] rounded-lg flex items-center gap-1">📎 {f.name.length > 20 ? f.name.slice(0, 20) + '...' : f.name}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl hover:bg-cream cursor-pointer text-navy/40 hover:text-navy transition-colors" title="Upload document (PDF, DOCX, Excel)"><Paperclip size={20} /></button>
                  <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-xl hover:bg-cream cursor-pointer text-navy/40 hover:text-navy transition-colors" title="Upload image (receipt, screenshot)"><Image size={20} /></button>
                  <div className="flex-1 relative">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={`Message ${selectedAgent.name}...`} className="w-full px-4 py-3 bg-cream rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-coral/20 border border-gray-100" />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-navy/30 hover:text-navy cursor-pointer"><Smile size={18} /></button>
                  </div>
                  <button onClick={() => setIsRecording(!isRecording)} className={`p-2.5 rounded-xl cursor-pointer ${isRecording ? 'bg-coral text-white animate-pulse' : 'hover:bg-cream text-navy/40 hover:text-navy'}`}>
                    {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button onClick={handleSend} disabled={!input.trim()} className="p-2.5 bg-coral rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-coral-dark"><Send size={20} /></button>
                </div>
                <p className="text-center text-[10px] text-navy/30 mt-2 flex items-center justify-center gap-1">
                  <FileText size={10} /> Powered by Dutchkem AI
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AGENT-SPECIFIC RESPONSE ENGINE
// Each agent responds in-character with domain expertise
// ═══════════════════════════════════════════════════════════════════════

interface BotReply {
  text: string;
  suggestions: string[];
}

function getWelcomeMessage(agent: Agent): BotReply {
  const w: Record<string, BotReply> = {
    A1: { text: `Welcome to Academic Pro! 🎓\n\nI'm not just an AI — I'm your personal academic writer, researcher, and publishing partner. I handle everything from a 5-page assignment to a 400-page PhD dissertation.\n\n📚 ACADEMIC WRITING (Any Level):\n• Assignments & Essays — from ₦2,000\n• Undergraduate Project (50-100 pages) — ₦50,000\n• PGD/PGDE Thesis (80-150 pages) — ₦70,000\n• Master's / MBA Thesis (100-200 pages) — ₦100,000\n• PhD Dissertation (200-400 pages) — ₦200,000\n• Individual Chapters — from ₦15,000\n\n🔬 WHAT I DO DIFFERENTLY:\n✅ Search 330M+ papers across 6 databases for your research\n✅ Follow YOUR university's EXACT format requirements\n✅ Write with human reasoning — reads like a professor wrote it\n✅ Guarantee it passes Turnitin — every time\n✅ Deliver in DOCX, PDF, LaTeX, or slides\n\n📖 E-BOOK PUBLISHING:\n• Full e-book writing (Amazon KDP ready) — from ₦30,000\n• Fiction, non-fiction, children's books, comics\n• Color or B&W, Kindle/ePub/PDF formats\n\nWhat level are you, and what do you need?`, suggestions: ['PhD dissertation', 'Master\'s thesis', 'Write an e-book'] },
    A2: { text: `Welcome to FormatPro! 📝\n\nI'm your AI citation & formatting specialist. I support 20,000+ citation styles.\n\nI can:\n📎 Generate citations from ISBN, DOI, or URL\n📄 Format entire documents (APA 7th, MLA 9th, Chicago, etc.)\n📋 Create bibliographies & in-text citations\n💾 Export to Word, PDF, BibTeX, Zotero\n\nWhat do you need formatted?`, suggestions: ['Format a citation', 'APA 7th document', 'Bulk citations'] },
    A3: { text: `Welcome to LitReview Pro! 📚\n\nI'm your AI literature review & research gap specialist.\n\nI search 330M+ papers across Semantic Scholar, Crossref, PubMed & arXiv.\n\nI can:\n📑 Summarize papers\n🔍 Find research gaps\n📊 Build synthesis matrices\n📖 Write full literature review chapters\n\nWhat's your research topic?`, suggestions: ['Summarize a paper', 'Find research gaps', 'Write a lit review'] },
    A4: { text: `Welcome to Plagiarism Pro! 🔍\n\nI'm your AI academic integrity & exam generation tool.\n\nI can:\n🔎 Check plagiarism (Turnitin-style)\n✏️ Suggest paraphrasing fixes\n📝 Generate MCQs, True/False, essay questions\n💡 Create flashcards (Anki/CSV export)\n\nWhat would you like to check or generate?`, suggestions: ['Check plagiarism', 'Generate exam questions', 'Paraphrase text'] },
    A5: { text: `Welcome to StatsPro! 📊\n\nI'm your AI statistical analyst.\n\nI handle:\n📈 Descriptive statistics, T-tests, ANOVA\n📉 Chi-square, correlation, regression\n🧮 Factor analysis & full packages\n📋 APA-formatted tables & charts\n🗣️ Plain English interpretation\n\nWhat data do you need analyzed?`, suggestions: ['Run descriptive stats', 'ANOVA analysis', 'Full statistical package'] },
    A6: { text: `Welcome to Presentation Pro! 🎨\n\nI'm your AI visual design expert.\n\nI create:\n📊 Professional PowerPoint decks (10-30 slides)\n🎙️ Speaker notes & Q&A prep\n🖼️ Academic posters (A0/A1)\n📎 Export to PPTX, PDF, Google Slides\n\nWhat presentation do you need?`, suggestions: ['Create a presentation', 'Academic poster', 'Slide deck with notes'] },
    A7: { text: `Welcome to Feedback & Grant Pro! 🏆\n\nI'm your AI academic career assistant.\n\nI can:\n📋 Parse supervisor feedback & create action plans\n✉️ Draft professional email responses\n🎯 Match you with 5,000+ grants & scholarships\n📄 Write full grant proposals\n\nHow can I boost your academic career?`, suggestions: ['Parse supervisor feedback', 'Find grants for me', 'Write a grant proposal'] },
    A8: { text: `Welcome to MediaStudio Pro! 🎬\n\nI'm your complete AI film studio — I write, produce, edit, and deliver deployment-ready content in 4K.\n\n🎥 FILM PRODUCTION:\n• Screenwriting (comedy, action, thriller, romance, horror, drama, sci-fi)\n• AI actor/actress integration into scenes\n• Full film production: script → storyboard → edit → 4K export\n• Comic book & manga creation\n\n✂️ VIDEO EDITING:\n• Standard editing from ₦10,000\n• Pro 4K editing from ₦30,000\n• Film-grade cinema quality from ₦80,000\n\n🗣️ VOICE & DUBBING:\n• Voice cloning from 30-sec sample — ₦25,000\n• Lip-sync dubbing in ANY language — ₦3,000/min\n• Voice synchronization (frame-perfect)\n\n🎤 TRANSCRIPTION (70+ languages):\n• English (UK, US, AU, Nigerian) — ₦250/min\n• Yoruba, Hausa, Igbo, Pidgin, Tiv, Ijaw, Edo — ₦400/min\n• French, Spanish, Arabic, + 50 more — ₦350/min\n\n🎨 ANIMATION: 2D, 3D, Anime, Motion Graphics\n🎵 AI Music & Sound Design\n\nWhat are you creating today?`, suggestions: ['Write a film script', 'Edit my video in 4K', 'Dub my video in Yoruba'] },
    A9: { text: `Welcome to DataPro! 💾\n\nI'm your AI data analysis & forensics expert.\n\nI can:\n📊 Convert files to Excel (PDF, images, CSV)\n🧹 Clean data (remove duplicates, fix values)\n📈 Build Power BI dashboards\n🔮 Predictive analytics & financial modeling\n🔍 Recover deleted files\n🌐 Dark web monitoring\n\nWhat data challenge can I solve?`, suggestions: ['Convert file to Excel', 'Build a dashboard', 'Clean my dataset'] },
    A10: { text: `Welcome to PhoneGuard Pro! 🛡️\n\nI'm your AI phone security & theft recovery specialist. If your phone was stolen or you want to protect your device, I'm here to help — step by step, right now.\n\n🚨 PHONE STOLEN? Here's my emergency recovery process:\n\n1️⃣ Secure your accounts (I'll walk you through it)\n2️⃣ Track your device (Find My iPhone / Google Find My Device)\n3️⃣ Block your IMEI via NCC (I draft the documents)\n4️⃣ File police report (I write it for you — ready to print)\n5️⃣ Monitor marketplaces for your phone (Jiji, OLX, Facebook)\n6️⃣ Recover your data from cloud backups\n\n🔒 WANT PROTECTION? I also set up:\n• Anti-theft apps & remote lock/wipe\n• SIM swap fraud prevention\n• Device security audit\n• Insurance claim preparation\n\n💰 Recovery Kit: ₦5,000 • Full Protection: ₦25,000\n\nWhat's your situation?`, suggestions: ['My phone was stolen!', 'Protect my phone', 'I need a police report'] },
    A11: { text: `Welcome to ContentPro! 📣\n\nI'm your AI social media & content growth expert.\n\nI help with:\n📱 Viral scripts & hooks\n🖼️ Thumbnail design\n#️⃣ Hashtag research (30 tags)\n📅 30-day content calendars\n📈 Follower growth strategies\n📢 Ad campaign setup (Facebook, TikTok, IG)\n\nWhat platform are you growing?`, suggestions: ['Write a viral script', 'Content calendar', 'Growth strategy'] },
    A12: { text: `Welcome to BusinessPro! 💼\n\nI'm your AI business consultant.\n\nI provide:\n📋 Business plans (20+ pages with financials)\n📊 Pitch decks (investor-ready)\n📄 Legal documents (NDA, contracts, wills)\n🏠 Real estate valuation\n🤖 Virtual assistant services\n🗣️ Voice cloning for business\n\nWhat business challenge can I help with?`, suggestions: ['Write a business plan', 'Create pitch deck', 'Draft a contract'] },
    A13: { text: `Welcome to ServiceMart NG! 🚀\n\nI'm your AI tutor, career coach, and exam prep specialist — all in one. Everything I do is delivered INSTANTLY by AI. No waiting, no middleman.\n\n📚 EXAM PREP (₦3,000 each — AI tutor included):\n• JAMB CBT — 10 years past questions + live tutoring\n• WAEC/SSCE — 10 years past questions + solutions\n• NECO — 10 years past questions + drill exercises\n• Post-UTME — Any university prep\n\n💼 CAREER SERVICES:\n• Professional CV/Resume — ₦5,000 (ready in 2 hours)\n• Cover Letter — ₦3,000 (ready in 1 hour)\n• LinkedIn Profile — ₦5,000\n• Interview Coaching — ₦5,000 (live AI mock interview)\n\n🌍 INTERNATIONAL PREP:\n• IELTS/TOEFL Prep — ₦10,000 (full course + mocks)\n• SOP & Scholarship Essays — ₦10,000\n• Professional Certifications (PMP, ACCA, ICAN) — ₦8,000\n\n🎁 BUNDLES:\n• Exam Bundle (JAMB+WAEC+NECO): ₦7,500\n• Career Bundle (CV+Cover+LinkedIn+Interview): ₦15,000\n• Japa Bundle (IELTS+SOP+CV+Interview): ₦25,000\n\nWhat do you need help with?`, suggestions: ['JAMB preparation', 'Write my CV', 'IELTS prep'] },
  };
  return w[agent.id] || { text: `Welcome to ${agent.name}! ${agent.icon}\n\nI'm your ${agent.role}. How can I help you today?`, suggestions: agent.services.slice(0, 3).map(s => s.name) };
}

function getAgentResponse(input: string, agent: Agent, _ctx: Record<string, string>, setCtx: (fn: (prev: Record<string, string>) => Record<string, string>) => void): BotReply {
  const l = input.toLowerCase();
  const id = agent.id;

  // ── UNIVERSAL INTENTS (persuasive, answer-first) ──

  if (l.includes('price') || l.includes('pricing') || l.includes('cost') || l.includes('how much') || l.includes('rate')) {
    return { text: `Absolutely! Here's a transparent breakdown of ${agent.name} pricing:\n\n${agent.services.map((s, i) => `${i + 1}. ${s.name}\n   💰 ${s.price}${s.description ? ` • ⏱️ ${s.description}` : ''}`).join('\n\n')}\n\n🎯 Every service includes:\n• 2 free revisions\n• Editable download (DOCX/PPTX/XLSX)\n• 24/7 support via this chat\n• Plagiarism-free / professional-grade output\n\n💡 Many clients start with the most affordable option and upgrade once they see the quality. Which one fits your current need?`, suggestions: [agent.services[0].name, 'I\'m ready to pay', 'Any discounts?'] };
  }

  if (l.includes('pay') || l.includes('payment') || l.includes('transfer') || l.includes('opay') || l.includes('account') || l.includes('i\'m ready') || l.includes('ready to pay') || l.includes('proceed')) {
    return { text: `Wonderful! You're one step away. 🎉\n\nPayment is quick, secure, and automatic:\n\n💳 HOW TO PAY:\n1️⃣ Click "Pay Now" below\n2️⃣ Choose your payment method (card, bank transfer, USSD)\n3️⃣ Complete the payment\n4️⃣ Your service starts AUTOMATICALLY — no waiting!\n\n🔒 Secured by Kora Pay — bank-grade encryption\n⚡ Instant activation — no manual confirmation needed\n📧 Receipt sent to your phone immediately\n\n🛡️ Money-back guarantee if you're not satisfied.\n\nReady to pay?`, suggestions: ['💳 Pay Now', 'Show pricing first', 'I have a question'] };
  }

  if (l.includes('hello') || l.includes('hi ') || l === 'hi' || l.includes('hey') || l.includes('good morning') || l.includes('good afternoon') || l.includes('good evening')) {
    return { text: `Hello! 😊 Welcome — you're in great hands.\n\nI'm ${agent.name}, and I specialize in ${agent.role}.\n\nThousands of Nigerians trust me to deliver professional-quality results quickly and affordably. Whether you're a student with a tight deadline, a professional growing your career, or a business owner scaling up — I'm here for you.\n\nTell me what you're working on, and I'll show you exactly how I can help. No obligation, just real answers! 👇`, suggestions: ['I need help with something', 'Show me your services', 'How much does it cost?'] };
  }

  if (l.includes('how does') || l.includes('how do') || l.includes('how it work') || l.includes('process') || l.includes('what happen')) {
    return { text: `Great question! Here's exactly how it works — it's simple and risk-free:\n\n📋 STEP 1: Tell me what you need\nDescribe your task right here in this chat. I'll ask smart follow-up questions to make sure I understand perfectly.\n\n💰 STEP 2: Get your exact price\nNo surprises. I'll quote the exact amount before you pay anything.\n\n💳 STEP 3: Quick payment\nTransfer to our secure OPay account and upload the receipt here. Takes 2 minutes.\n\n⚡ STEP 4: We deliver fast\nOur AI + expert team gets to work immediately. Most projects delivered within 24-48 hours.\n\n✅ STEP 5: Download your results\nGet your deliverables in editable format (Word, PowerPoint, Excel — whatever you need).\n\n🔄 BONUS: 2 free revisions included!\n\n🛡️ Over 10,000 clients served. 4.9/5 satisfaction rating.\n\nReady to tell me what you need?`, suggestions: ['Let\'s start!', 'Show pricing first', 'I have a specific question'] };
  }

  if (l.includes('discount') || l.includes('cheaper') || l.includes('promo') || l.includes('offer') || l.includes('afford')) {
    return { text: `I love helping you save money! 💰 Here are the best deals available right now:\n\n🔥 BUNDLE & SAVE:\n• Starter Bundle (any 3 services) → ₦20,000 flat — saves up to ₦8,000\n• Professional Bundle (any 5 services) → ₦35,000 flat — saves up to ₦15,000\n• Complete Bundle (all 10 services) → ₦60,000 flat — saves up to ₦25,000\n\n🎁 LOYALTY PERKS:\n• 10% off automatically on your 2nd purchase\n• ₦1,000 off for every friend you refer who signs up\n• NIN/BVN verification is FREE inside any bundle\n\n⚡ The most popular choice? The Professional Bundle — our clients say it's the best value.\n\nWant me to help you pick the perfect bundle for your needs?`, suggestions: ['Professional Bundle', 'What can I bundle?', 'Regular pricing'] };
  }

  if (l.includes('feature') || l.includes('what can you') || l.includes('capabilities') || l.includes('what do you')) {
    return { text: `Here's everything I bring to the table — and why clients keep coming back:\n\n${agent.features.map(f => `✅ ${f}`).join('\n')}\n\n📊 ${agent.services.length} service tiers so you only pay for what you need.\n🏆 4.9/5 client satisfaction rating\n🔒 Bank-grade security on all your data\n⏰ Most deliveries within 24-48 hours\n\nWhich of these capabilities interests you most? I'd love to show you how it works in practice.`, suggestions: agent.services.slice(0, 3).map(s => s.name) };
  }

  if (l.includes('thank') || l.includes('thanks') || l.includes('appreciate')) {
    return { text: `You're very welcome! 😊 It was a pleasure.\n\nRemember — you can come back to me anytime, 24/7. Your conversation history is saved, so we'll pick up right where we left off.\n\n💡 Quick tip: Refer a friend and you both get ₦1,000 off your next service!\n\nIs there anything else I can help you with today?`, suggestions: ['Start a new task', 'Refer a friend', 'Switch to another agent'] };
  }

  if (l.includes('switch agent') || l.includes('different agent') || l.includes('other agent') || l.includes('change agent')) {
    return { text: `Of course! All 13 of our AI agents are at your service:\n\n🎓 Academic Pro • 📝 FormatPro • 📚 LitReview Pro\n🔍 Plagiarism Pro • 📊 StatsPro • 🎨 Presentation Pro\n🏆 Grant Pro • 🎬 MediaStudio • 💾 DataPro\n📱 PhoneRetriever • 📣 ContentPro • 💼 BusinessPro\n🏛️ ServiceMart NG\n\nTap the ← arrow in the top-left corner to browse all agents.\n\nBut before you go — is there something I wasn't able to help with? I'd hate to see you leave without getting what you need!`, suggestions: ['Actually, help me with...', 'Go to agent list'] };
  }

  if (l.includes('upload') || l.includes('receipt') || l.includes('proof') || l.includes('screenshot') || l.includes('i\'ve paid') || l.includes('done') || l.includes('uploaded')) {
    return { text: `✅ Payment is now fully automatic!\n\nWith our Kora Pay integration:\n\n💳 Click "Pay Now" → choose card, transfer, or USSD\n⚡ Payment confirms instantly — no receipt upload needed\n🤖 Your agent starts working immediately after payment\n📱 Confirmation SMS sent to your phone\n\n🔒 All transactions are encrypted and secured by Kora Pay.\n\nIf you've already paid and your service hasn't started, it means the payment is still processing. Give it 2-3 minutes.\n\nNeed help?`, suggestions: ['💳 Pay Now', 'Check payment status', 'Contact support'] };
  }

  if (l.includes('revision') || l.includes('modify') || l.includes('update') || l.includes('not satisfied') || l.includes('redo')) {
    return { text: `No problem at all! Your satisfaction is my top priority. 🎯\n\n🔄 Revision Policy:\n✅ 2 FREE revisions included with every service — no questions asked\n📝 Just tell me exactly what you'd like changed\n⏰ Revision turnaround: 24-48 hours\n\nOver 95% of our clients are satisfied on the first delivery, but I want YOU to be 100% happy.\n\nWhat specific changes do you need? The more detail you give me, the faster I can perfect it.`, suggestions: ['Describe my changes', 'My deliverable is great!', 'Speak to support'] };
  }

  // ── AGENT-SPECIFIC RESPONSES ──

  // A1: Academic Pro — Full Academic & E-Book Publishing Agent
  if (id === 'A1') {
    if (l.includes('assignment') || l.includes('homework') || l.includes('coursework')) {
      setCtx(p => ({ ...p, task: 'assignment' }));
      return { text: `Absolutely, I'll handle it! 📝\n\nI've helped over 5,000 students score A's and B's. Here's what you'll get:\n\n✅ Deeply researched, 100% original content\n✅ Passes Turnitin — guaranteed\n✅ Proper formatting & citations in your school's required style\n✅ Step-by-step solutions with clear explanations\n✅ Delivered in DOCX + PDF\n✅ 3 free revisions\n\n💰 Pricing: ₦2,000 - ₦8,000 (1-10 pages)\n⚡ Rush (24hr): +50% • Emergency (12hr): +100%\n\nTell me:\n1️⃣ Subject?\n2️⃣ Number of pages/questions?\n3️⃣ Deadline?\n4️⃣ Any rubric or instructions? (upload via 📎)\n\nDon't stress — I eat assignments for breakfast. 💪`, suggestions: ['Mathematics', 'Sciences', 'Business/Law'] };
    }
    if (l.includes('essay') || l.includes('write')) {
      setCtx(p => ({ ...p, task: 'essay' }));
      return { text: `Essay writing is where I shine. ✍️\n\nMy essays don't read like AI wrote them — they read like a brilliant student who actually understands the topic.\n\n✅ Original, deeply argued content\n✅ ANY citation style (APA 7th, MLA 9th, Chicago 17th, Harvard, IEEE, Vancouver, OSCOLA)\n✅ Tailored to your academic level and grading rubric\n✅ Introduction → Body → Conclusion with logical flow\n✅ Delivered in formatted DOCX + clean PDF\n✅ 3 free revisions\n\n💰 Pricing: ₦3,000 - ₦15,000 (1-20 pages)\n\nTell me:\n1️⃣ Topic or title?\n2️⃣ Word count / pages?\n3️⃣ Citation style?\n4️⃣ Level? (100L, 200L, 300L, 400L, PGD, Masters, PhD)\n5️⃣ Deadline?\n\nEven a vague idea works — I'll shape it into something your lecturer will love.`, suggestions: ['Undergraduate essay', 'Master\'s essay', 'Rush — due tomorrow!'] };
    }
    if (l.includes('phd') || l.includes('doctoral') || l.includes('dissertation')) {
      setCtx(p => ({ ...p, task: 'phd', level: 'phd' }));
      return { text: `PhD Dissertation — up to 400 pages? I've got you. 📖🎓\n\nThis is my highest-tier service. Here's what separates my PhD work from everything else:\n\n🔬 RESEARCH DEPTH:\n• I search across 6 databases: Semantic Scholar, PubMed, Crossref, arXiv, Google Scholar, JSTOR\n• Access to 330M+ academic papers\n• I identify research gaps that haven't been explored yet\n• I cite ONLY peer-reviewed, credible sources\n\n📋 CHAPTER STRUCTURE (Standard PhD):\n1️⃣ Introduction (Background, Problem Statement, Objectives, Hypotheses)\n2️⃣ Literature Review (Theoretical Framework, Empirical Review, Gap)\n3️⃣ Research Methodology (Design, Population, Sampling, Instruments)\n4️⃣ Data Presentation & Analysis (Tables, Figures, Statistical Tests)\n5️⃣ Discussion, Conclusion & Recommendations\n• References + Appendices\n\n✅ QUALITY GUARANTEE:\n• Reads like a human researcher — not AI-generated\n• Follows YOUR university's exact formatting requirements\n• Passes Turnitin with < 15% similarity\n• 3 free revisions per chapter\n• Chapter-by-chapter delivery with progress updates\n\n💰 Pricing:\n• Full PhD Dissertation (200-400 pages): ₦200,000 - ₦350,000\n• Individual Chapter: ₦25,000 - ₦40,000\n• Research Proposal / Synopsis: ₦20,000 - ₦30,000\n\n⏱️ Timeline: 4-8 weeks (full dissertation) | 5-7 days (single chapter)\n\nWhat's your research area, and which university are you at?`, suggestions: ['Start with Research Proposal', 'Literature Review chapter', 'Full dissertation'] };
    }
    if (l.includes('master') || l.includes('mba') || l.includes('msc') || l.includes('m.sc') || l.includes('m.a')) {
      setCtx(p => ({ ...p, task: 'masters', level: 'masters' }));
      return { text: `Master's / MBA Thesis — 100 to 200 pages of excellence. 🎓\n\n📋 WHAT I DELIVER:\n\nChapter 1 — Introduction:\n• Background of Study, Statement of Problem\n• Research Questions & Objectives, Hypotheses\n• Significance, Scope & Limitations, Definition of Terms\n\nChapter 2 — Literature Review:\n• Conceptual Framework, Theoretical Framework\n• Empirical Review (minimum 30-50 recent sources)\n• Summary & Research Gap\n\nChapter 3 — Methodology:\n• Research Design, Study Area, Population & Sampling\n• Data Collection Instruments, Validity & Reliability\n• Method of Data Analysis, Ethical Considerations\n\nChapter 4 — Results & Analysis:\n• Data Presentation (tables, charts, figures)\n• Statistical Analysis (SPSS, ANOVA, Regression — whatever's needed)\n• Hypothesis Testing\n\nChapter 5 — Discussion, Conclusion & Recommendations:\n• Summary of Findings, Implications\n• Contribution to Knowledge, Recommendations\n\n✅ STANDARDS:\n• APA 7th / Harvard / your uni's format\n• Human-quality academic writing\n• Turnitin < 15%\n• 3 free revisions\n\n💰 Master's / MBA (100-200 pages): ₦100,000 - ₦150,000\n💰 Single Chapter: ₦15,000 - ₦30,000\n\nWhat's your topic and university?`, suggestions: ['Full Master\'s thesis', 'MBA project', 'Just one chapter'] };
    }
    if (l.includes('undergraduate') || l.includes('final year') || l.includes('project') || l.includes('bsc') || l.includes('b.sc') || l.includes('hnd')) {
      setCtx(p => ({ ...p, task: 'undergraduate', level: 'undergraduate' }));
      return { text: `Undergraduate / HND Final Year Project — Let's get you that 2:1 or First Class! 🎯\n\n📋 STANDARD STRUCTURE:\nChapter 1: Introduction\nChapter 2: Literature Review\nChapter 3: Methodology\nChapter 4: Data Analysis & Results\nChapter 5: Summary, Conclusion & Recommendations\n+ References + Appendices\n\n✅ WHAT YOU GET:\n• 50-100 pages of well-researched content\n• Your department's EXACT format followed\n• Real data analysis (SPSS, Excel)\n• APA / Harvard / your school's citation style\n• Turnitin report showing < 15% similarity\n• DOCX + PDF delivery\n• 3 free revisions\n\n💰 Pricing:\n• Full Project (50-100 pages): ₦50,000 - ₦80,000\n• Single Chapter: ₦15,000 - ₦20,000\n• Research Proposal: ₦15,000\n\n⏱️ Timeline: 2-4 weeks (full project) | 3-5 days (single chapter)\n\nWhat's your topic and department?`, suggestions: ['Full final year project', 'Just Chapter 2 (Lit Review)', 'Research proposal'] };
    }
    if (l.includes('pgd') || l.includes('pgde') || l.includes('postgraduate diploma')) {
      setCtx(p => ({ ...p, task: 'pgd', level: 'pgd' }));
      return { text: `PGD / PGDE Thesis — 80 to 150 pages, done properly. 📋\n\nI know the PGD format well — it's between undergraduate and master's in depth, but the formatting requirements are just as strict.\n\n✅ WHAT I DELIVER:\n• 80-150 pages following your institution's template\n• 5 chapters (standard academic structure)\n• Minimum 25-40 peer-reviewed sources\n• Data analysis included (SPSS, Excel, or qualitative analysis)\n• Proper citation in your required style\n• Turnitin < 15%\n\n💰 PGD/PGDE Thesis: ₦70,000 - ₦100,000\n💰 Single Chapter: ₦15,000 - ₦25,000\n\nWhat's your field and research topic?`, suggestions: ['Full PGD thesis', 'Education (PGDE)', 'Just methodology chapter'] };
    }
    if (l.includes('thesis') || l.includes('chapter') || l.includes('research')) {
      setCtx(p => ({ ...p, task: 'thesis' }));
      return { text: `I handle ALL thesis levels — Undergraduate to PhD, 50 to 400 pages. 📚\n\nWhich level are you?\n\n🎓 Undergraduate / HND Project (50-100 pages) — ₦50,000 - ₦80,000\n📋 PGD / PGDE Thesis (80-150 pages) — ₦70,000 - ₦100,000\n🎓 Master's / MBA (100-200 pages) — ₦100,000 - ₦150,000\n🏆 PhD Dissertation (200-400 pages) — ₦200,000 - ₦350,000\n📄 Individual Chapter (Any Level) — ₦15,000 - ₦40,000\n📝 Research Proposal / Synopsis — ₦15,000 - ₦30,000\n\n✅ Every level includes:\n• Research across 330M+ papers (6 databases)\n• Your university's EXACT format\n• Turnitin pass guaranteed\n• 3 free revisions\n• DOCX + PDF delivery\n• Chapter-by-chapter progress updates\n\nWhat's your level and topic?`, suggestions: ['Undergraduate', 'Master\'s / MBA', 'PhD'] };
    }
    if (l.includes('e-book') || l.includes('ebook') || l.includes('kindle') || l.includes('amazon') || l.includes('publish') || l.includes('book')) {
      setCtx(p => ({ ...p, task: 'ebook' }));
      return { text: `📖 E-Book Writing & Publishing — Amazon KDP Ready!\n\nI write AND format your book to professional publishing standards:\n\n✍️ E-BOOK WRITING:\n• Fiction (romance, thriller, sci-fi, fantasy, mystery) — ₦30,000 - ₦80,000\n• Non-Fiction (self-help, business, how-to, memoir) — ₦30,000 - ₦70,000\n• Children's Book (illustrated, 20-40 pages) — ₦40,000 - ₦60,000\n• Comic Book / Graphic Novel — ₦50,000 - ₦80,000\n• Academic Textbook — ₦60,000 - ₦100,000\n\n🎨 FORMATTING & DESIGN:\n• Amazon KDP format (ready to upload & sell) — ₦10,000\n• Kindle (.mobi) + ePub + PDF — ₦15,000\n• Full-color interior design — ₦20,000 - ₦25,000\n• Black & white classic layout — ₦10,000\n• Cover design (front + spine + back) — ₦10,000\n\n📦 COMPLETE PUBLISHING PACKAGE:\nWriting + Formatting + Cover + KDP Upload = ₦60,000 - ₦120,000\n\n✅ Includes:\n• ISBN guidance\n• Amazon product description & keywords\n• Author bio\n• Chapter headings with table of contents\n• Multiple format exports (Kindle, ePub, PDF, print-ready)\n• 3 free revisions\n\nWhat kind of book are you writing?`, suggestions: ['Fiction novel', 'Non-fiction / self-help', 'Children\'s book'] };
    }
    if (l.includes('proofread') || l.includes('grammar') || l.includes('check my')) {
      return { text: `🔍 Proofreading & Grammar Perfection — ₦500/page\n\nI don't just fix typos — I elevate your writing:\n\n✅ Grammar, spelling & punctuation\n✅ Sentence structure & clarity\n✅ Academic tone & voice consistency\n✅ Citation format verification\n✅ Logical flow between paragraphs\n✅ Word choice improvement\n✅ Tracked changes so you see every edit\n\n📄 Delivery: Corrected DOCX with comments + clean PDF\n⏱️ Turnaround: 24-48 hours (up to 100 pages)\n🔄 1 free revision after review\n\nUpload your document via the 📎 icon and I'll start immediately.`, suggestions: ['Upload my document', 'How many pages?', 'Plagiarism check too'] };
    }
    if (l.includes('paraphras') || l.includes('rewrite') || l.includes('turnitin') || l.includes('plagiarism') || l.includes('similarity')) {
      return { text: `✏️ Paraphrasing & Plagiarism Reduction\n\nI rewrite your text so it's 100% original while keeping the exact same meaning:\n\n📝 Paraphrasing — ₦1,000 per 500 words\n🔍 Plagiarism Reduction (bring Turnitin below 15%) — ₦5,000 - ₦20,000\n\n✅ What I do:\n• Complete sentence restructuring (not just synonym swapping)\n• Academic tone preserved\n• Citations maintained and properly reformatted\n• Technical terms kept accurate\n• Before & after similarity comparison\n\n🎯 My paraphrased text consistently passes Turnitin with < 10% similarity.\n\nPaste your text here or upload the document via 📎.`, suggestions: ['Paste my text', 'Upload document', 'Full thesis plagiarism fix'] };
    }
    // Subject detection
    const subjects = ['math', 'calculus', 'algebra', 'statistics', 'physics', 'chemistry', 'biology', 'engineering', 'computer', 'programming', 'business', 'management', 'marketing', 'accounting', 'economics', 'law', 'medical', 'nursing', 'pharmacy', 'education', 'sociology', 'psychology', 'philosophy', 'history', 'literature', 'political', 'public admin'];
    if (subjects.some(s => l.includes(s))) {
      const subject = subjects.find(s => l.includes(s)) || 'your subject';
      return { text: `Great! I'm deeply experienced in ${subject}. 📚\n\nFor ${subject}, I can help with:\n📝 Assignments & problem sets\n✍️ Essays & term papers\n📄 Research papers (10-50 pages)\n📖 Full thesis/dissertation (50-400 pages)\n📚 Literature reviews\n📊 Data analysis & interpretation\n📖 E-book writing\n\nI search across Semantic Scholar, PubMed, Crossref, arXiv, Google Scholar, and JSTOR to find the most relevant, recent, and credible sources for your work.\n\nWhat exactly do you need, and what's your deadline?`, suggestions: ['Assignment help', 'Thesis/project', 'Research paper'] };
    }
  }

  // A2: FormatPro
  if (id === 'A2') {
    if (l.includes('apa') || l.includes('mla') || l.includes('chicago') || l.includes('harvard') || l.includes('ieee') || l.includes('vancouver')) {
      const style = l.includes('apa') ? 'APA 7th' : l.includes('mla') ? 'MLA 9th' : l.includes('chicago') ? 'Chicago 17th' : l.includes('harvard') ? 'Harvard' : l.includes('ieee') ? 'IEEE' : 'Vancouver';
      return { text: `📝 ${style} Formatting\n\nI can:\n1️⃣ Format a single citation → ₦1,000\n2️⃣ Format bulk citations (up to 50) → ₦5,000\n3️⃣ Format your entire document → ₦3,000-₦10,000\n\nJust send me:\n• Your DOI, ISBN, URL, or manual entry\n• Or upload your document for full formatting\n\nWhat would you like to format?`, suggestions: ['Format a DOI', 'Format my document', 'Bulk citations'] };
    }
    if (l.includes('doi') || l.includes('isbn') || l.includes('url') || l.includes('citation') || l.includes('cite')) {
      return { text: `📎 Citation Generator\n\nSend me any of these and I'll generate your citation instantly:\n\n🔗 DOI (e.g., 10.1234/example)\n📖 ISBN (e.g., 978-0-123456-78-9)\n🌐 URL (any webpage)\n✍️ Or describe the source manually\n\nIn which style? APA, MLA, Chicago, Harvard, IEEE, or any of 20,000+ styles.`, suggestions: ['APA 7th edition', 'MLA 9th edition', 'Harvard style'] };
    }
  }

  // A5: StatsPro
  if (id === 'A5') {
    if (l.includes('anova') || l.includes('t-test') || l.includes('ttest') || l.includes('regression') || l.includes('chi') || l.includes('correlation')) {
      const test = l.includes('anova') ? 'ANOVA' : l.includes('t-test') || l.includes('ttest') ? 'T-test' : l.includes('regression') ? 'Regression' : l.includes('chi') ? 'Chi-square' : 'Correlation';
      const prices: Record<string, string> = { 'ANOVA': '₦20,000', 'T-test': '₦15,000', 'Regression': '₦25,000', 'Chi-square': '₦15,000', 'Correlation': '₦15,000' };
      return { text: `📊 ${test} Analysis — ${prices[test]}\n\nI'll provide:\n✅ Assumption checks (normality, homogeneity)\n✅ Complete ${test} results\n✅ APA-formatted tables\n✅ Publication-ready charts\n✅ Plain English interpretation\n\nTo get started, I need:\n1️⃣ Your dataset (Excel, CSV, or SPSS)\n2️⃣ Your research question/hypothesis\n3️⃣ Variables (dependent & independent)\n\nUpload your data or describe your study.`, suggestions: ['Upload my data', 'I need the full package', 'Which test should I use?'] };
    }
    if (l.includes('which test') || l.includes('what test') || l.includes('recommend') || l.includes('select')) {
      return { text: `🧮 Let me help you choose the right test!\n\nAnswer these:\n\n1️⃣ What's your research question?\n2️⃣ How many groups are you comparing?\n   • 2 groups → T-test\n   • 3+ groups → ANOVA\n3️⃣ What type of data?\n   • Continuous (numbers) → T-test, ANOVA, Regression\n   • Categorical (yes/no, groups) → Chi-square\n4️⃣ Looking for relationships? → Correlation/Regression\n\nTell me about your study and I'll recommend the perfect test.`, suggestions: ['Comparing 2 groups', 'Comparing 3+ groups', 'Finding relationships'] };
    }
  }

  // A8: MediaStudio Pro — Full Film Production Studio
  if (id === 'A8') {
    if (l.includes('film') || l.includes('movie') || l.includes('script') || l.includes('screen') || l.includes('write a') || l.includes('produce')) {
      return { text: `🎬 Film Production — From Idea to Deployment-Ready\n\nI handle the ENTIRE process:\n\n📝 SCREENWRITING:\n• Short Film Script (5-15 min) — ₦15,000\n• TV Episode (30-60 min) — ₦40,000\n• Feature Film (90-120 min) — ₦80,000 - ₦100,000\n\n🎭 GENRES I MASTER:\nComedy • Action • Thriller • Romance • Horror • Drama • Sci-Fi • Documentary • Musical • Crime • Fantasy • Historical\n\n🎥 FULL PRODUCTION PACKAGE (Script → 4K Export):\n• Short Film: ₦150,000\n• TV Episode: ₦250,000\n• Feature Film: ₦500,000\n\nIncludes: script, storyboard, AI actor integration, editing, color grading, sound design, music, 4K export.\n\n💡 I can also integrate AI-generated actors and actresses into your scenes — they look real, speak any language, and cost a fraction of live actors.\n\nWhat's your film about? Give me the genre and a one-line pitch.`, suggestions: ['Comedy short film', 'Action thriller', 'Romantic drama'] };
    }
    if (l.includes('video') || l.includes('edit') || l.includes('4k') || l.includes('cut')) {
      return { text: `✂️ Video Editing — Standard to Cinema Quality\n\n📱 Standard Editing (great for social media):\n• Up to 10 min — ₦10,000\n• Up to 30 min — ₦25,000\n\n🎬 Pro 4K Editing (YouTube, corporate, events):\n• Up to 10 min — ₦20,000\n• Up to 30 min — ₦30,000\n• Up to 60 min — ₦50,000\n\n🏆 Film-Grade 4K (cinema, festivals, broadcast):\n• Up to 30 min — ₦80,000\n• Up to 2 hours — ₦200,000\n• Color grading, sound mixing, titles included\n\n✅ Every edit includes:\n• Color correction & grading\n• Smooth transitions\n• Background music (royalty-free or AI-composed)\n• Text overlays & lower thirds\n• Subtitles in any language\n• Export in MP4, MOV, or ProRes\n\nUpload your footage or send me a link. What style do you want?`, suggestions: ['Social media edit', '4K YouTube video', 'Film-grade cinema'] };
    }
    if (l.includes('comic') || l.includes('manga') || l.includes('strip') || l.includes('graphic novel')) {
      return { text: `📖 Comic Book & Manga Production\n\nI create complete visual stories:\n\n📕 Comic Book Script + Art Direction:\n• Single Issue (20-24 pages) — ₦20,000\n• Mini-Series (4 issues) — ₦60,000\n• Full Graphic Novel (100+ pages) — ₦150,000\n\n🎨 Styles available:\n• American superhero style\n• Japanese manga\n• Nigerian Afro-futurism\n• Webtoon (vertical scroll)\n• Children's illustration\n\n✅ What you get:\n• Full script with dialogue\n• Panel-by-panel layout descriptions\n• Character design briefs\n• AI-generated concept art for each scene\n• Cover art design\n\nWhat's your story about? I'll start with the concept.`, suggestions: ['Superhero comic', 'Manga series', 'Nigerian Afro-futurism'] };
    }
    if (l.includes('actor') || l.includes('actress') || l.includes('character') || l.includes('ai person') || l.includes('cast')) {
      return { text: `🎭 AI Actor & Character Integration — ₦15,000/scene\n\nThis is one of our most exciting features! I can place realistic AI-generated actors and actresses into your video scenes.\n\n✅ What's possible:\n• Generate photo-realistic characters of ANY ethnicity, age, gender\n• Place them into your existing footage\n• They speak with lip-synced dialogue in ANY language\n• Multiple characters interacting in the same scene\n• Period costumes, uniforms, casual wear — any wardrobe\n• Consistent character appearance across all scenes\n\n🎬 Use cases:\n• Low-budget films that look big-budget\n• Corporate training videos without hiring actors\n• Music videos with realistic characters\n• Social media content with "celebrity" lookalikes\n• Historical recreations\n\n💰 Pricing:\n• Single character in 1 scene — ₦15,000\n• Multiple characters (full film) — ₦50,000 - ₦200,000\n• Custom character design — ₦10,000 per character\n\nDescribe the character you need — gender, age, appearance, clothing.`, suggestions: ['Create a character', 'Add to my video', 'Full cast for my film'] };
    }
    if (l.includes('dub') || l.includes('lip') || l.includes('sync') || l.includes('voice') || l.includes('clone') || l.includes('language')) {
      return { text: `🗣️ Voice Dubbing, Cloning & Synchronization\n\nMake your content speak ANY language with perfect lip-sync:\n\n🎤 VOICE DUBBING + LIP-SYNC — ₦3,000/min\nI replace the original dialogue with a new language AND the mouth movements match perfectly. Your audience can't tell it was dubbed.\n\n🧬 VOICE CLONING — ₦25,000\nSend me a 30-second clear audio sample of ANY voice. I'll clone it so that voice can say anything in any language — forever.\n\n🔄 VOICE SYNCHRONIZATION — included free\nI sync audio to video frame-by-frame. No lag, no drift. Professional broadcast quality.\n\n🌍 LANGUAGES AVAILABLE (70+):\n\n🇳🇬 Nigerian: Yoruba, Hausa, Igbo, Pidgin English, Tiv, Ijaw, Edo, Efik-Ibibio, Kanuri, Fulfulde, Nupe, Urhobo\n🇬🇧 English: UK, US, Australian, New Zealand, Nigerian, South African, Canadian, Irish\n🇫🇷 French: France, Canada, Belgium, West Africa\n🇪🇸 Spanish, 🇵🇹 Portuguese, 🇩🇪 German, 🇮🇹 Italian, 🇳🇱 Dutch\n🇸🇦 Arabic, 🇨🇳 Mandarin, 🇯🇵 Japanese, 🇰🇷 Korean, 🇮🇳 Hindi\n🇷🇺 Russian, 🇹🇷 Turkish, 🇵🇱 Polish, 🇸🇪 Swedish\n🌍 Swahili, Zulu, Amharic, Somali + 30 more\n\nWhat do you need dubbed?`, suggestions: ['Dub my video to Yoruba', 'Clone my voice', 'English to Hausa dubbing'] };
    }
    if (l.includes('transcri') || l.includes('subtitle') || l.includes('caption') || l.includes('srt')) {
      return { text: `🎤 Transcription & Subtitle Service\n\n99% accuracy across 70+ languages:\n\n🇬🇧🇺🇸 English (UK, US, Australian, Nigerian) — ₦250/min\n🇳🇬 Yoruba, Hausa, Igbo, Pidgin, Tiv, Ijaw, Edo — ₦400/min\n🇫🇷🇪🇸 French, Spanish, Portuguese, German — ₦350/min\n🇸🇦🇨🇳 Arabic, Mandarin, Japanese, Korean, Hindi — ₦350/min\n🌍 All other languages (50+) — ₦350/min\n\n📄 Output formats:\n• SRT (for YouTube, Vimeo)\n• VTT (for websites)\n• TXT / DOCX (for documents)\n• Hardcoded subtitles (burned into video)\n• Bilingual subtitles (two languages at once)\n\n✅ Includes: timestamps, speaker identification, punctuation\n\nUpload your audio/video file or send a link. What language is it in?`, suggestions: ['English transcription', 'Yoruba to English', 'Add subtitles to my video'] };
    }
    if (l.includes('animat') || l.includes('cartoon') || l.includes('motion') || l.includes('anime') || l.includes('3d')) {
      return { text: `🎨 Animation Studio\n\nBring any idea to life:\n\n📺 2D Animation / Cartoon — ₦30,000/min\nPerfect for: explainers, kids content, social media\n\n🎮 3D Animation / CGI — ₦60,000/min\nPerfect for: product demos, gaming, cinematic scenes\n\n⚔️ Anime Style — ₦45,000/min\nPerfect for: action sequences, character-driven stories\n\n📊 Motion Graphics — ₦20,000/min\nPerfect for: corporate, infographics, data visualization\n\n🎞️ Whiteboard Animation — ₦15,000/min\nPerfect for: educational, training, pitch videos\n\n✅ Every animation includes:\n• Custom character design\n• Background art\n• Smooth animation (24fps+)\n• Sound effects & music\n• Voice-over integration\n• 4K export\n\nWhat's the concept? I'll start with a storyboard.`, suggestions: ['2D explainer video', 'Anime action scene', '3D product demo'] };
    }
    if (l.includes('music') || l.includes('sound') || l.includes('soundtrack') || l.includes('beat') || l.includes('jingle')) {
      return { text: `🎵 AI Music & Sound Design\n\nOriginal compositions created by AI — royalty-free, yours forever:\n\n🎼 AI Music Composition — ₦5,000/track\n• Any genre: Afrobeats, Hip-Hop, Pop, Classical, Jazz, EDM, R&B, Gospel, Highlife, Juju, Fuji\n• Custom mood: happy, sad, tense, romantic, epic, calm\n• Any duration: 30 seconds to 10 minutes\n• Full stems provided (vocals, drums, bass, melody separate)\n\n🔊 Sound Design — ₦10,000/project\n• Foley effects (footsteps, doors, rain, traffic)\n• SFX library (explosions, whooshes, transitions)\n• Ambient soundscapes\n• Dolby-style audio mixing\n• Dialogue cleanup & noise removal\n\n🎙️ Jingles & Intros — ₦8,000\n• Podcast intros/outros\n• YouTube channel jingles\n• Radio/TV station IDs\n• Brand audio logos\n\nWhat mood and genre? I'll compose a sample.`, suggestions: ['Afrobeats track', 'Film soundtrack', 'Podcast jingle'] };
    }
    if (l.includes('full') || l.includes('package') || l.includes('everything') || l.includes('complete') || l.includes('bundle')) {
      return { text: `🏆 Full Film Production Package — ₦150,000 - ₦500,000\n\nEverything from concept to deployment-ready 4K export:\n\n📋 What's included:\n1️⃣ Screenwriting (your genre, your story)\n2️⃣ Storyboard & shot planning\n3️⃣ AI actor/actress casting & integration\n4️⃣ Voice recording or AI voice synthesis\n5️⃣ Video editing with cinema-grade color grading\n6️⃣ Original AI soundtrack & sound design\n7️⃣ Subtitles in any language\n8️⃣ 4K Ultra HD final export\n9️⃣ Poster/thumbnail artwork\n🔟 Social media cut-downs (15s, 30s, 60s teasers)\n\n💰 Pricing:\n• Short Film (5-15 min) — ₦150,000\n• TV Episode (30-60 min) — ₦250,000\n• Feature Film (90-120 min) — ₦500,000\n\n🎬 Genres: Comedy, Action, Thriller, Romance, Horror, Drama, Sci-Fi, Documentary, Musical\n\n🌍 Available in 70+ languages with lip-sync dubbing\n\nWhat's your vision? Let's make it real.`, suggestions: ['Short film package', 'Full feature film', 'TV series pilot'] };
    }
  }

  // A10: PhoneGuard Pro
  if (id === 'A10') {
    if (l.includes('stolen') || l.includes('thief') || l.includes('missing') || l.includes('lost') || l.includes('rob') || l.includes('snatch')) {
      setCtx(p => ({ ...p, situation: 'stolen' }));
      return { text: `🚨 I'm sorry about your phone. Let's act FAST — every minute matters.\n\nHere's my emergency recovery protocol. I'll guide you through each step:\n\n⚡ STEP 1 — SECURE YOUR ACCOUNTS (Do this RIGHT NOW):\n• Change your email password immediately\n• Change your bank app PIN\n• Call your bank to flag your account\n• Log out all sessions: Google → myaccount.google.com/security\n\n📱 STEP 2 — TRACK YOUR PHONE:\nIs it an iPhone or Android? I'll walk you through the tracking.\n\n📋 STEP 3 — I'll prepare these documents for you:\n• Police report (I'll write it — you just print & sign)\n• Affidavit of loss (I'll draft it)\n• IMEI blacklist request to NCC\n\n🔍 STEP 4 — MARKETPLACE MONITORING:\nI'll scan Jiji, OLX, and Facebook Marketplace daily for your device.\n\n💰 Full Recovery Kit: ₦5,000\n\nFirst — is it an iPhone or Android?`, suggestions: ['iPhone', 'Android', 'I don\'t know my IMEI'] };
    }
    if (l.includes('iphone') || l.includes('apple') || l.includes('ios')) {
      return { text: `📱 iPhone Recovery — Let's track it NOW!\n\n🔍 STEP 1: Go to icloud.com/find on any browser\n• Sign in with YOUR Apple ID\n• Click "Find My iPhone"\n• Select your device from the list\n\n📍 If the phone is online, you'll see its LIVE location on the map!\n\n🔒 STEP 2: Put it in LOST MODE:\n• Click "Lost Mode" on iCloud\n• Enter a phone number where you can be reached\n• Write a message (e.g., "This phone is stolen. Call [your number]")\n• This LOCKS the phone — nobody can use it\n\n🗑️ STEP 3: If recovery seems impossible:\n• Click "Erase iPhone" to protect your data\n• Even after erasing, the phone stays linked to YOUR Apple ID\n• Nobody can activate it without your password (Activation Lock)\n\n📋 STEP 4: I'll now prepare your:\n✅ Police report (ready to print)\n✅ IMEI blacklist request\n✅ Insurance claim docs (if insured)\n\nCan you access icloud.com right now?`, suggestions: ['Yes, I can access it', 'I forgot my Apple ID', 'Draft my police report'] };
    }
    if (l.includes('android') || l.includes('samsung') || l.includes('tecno') || l.includes('infinix') || l.includes('redmi') || l.includes('xiaomi') || l.includes('oppo')) {
      return { text: `📱 Android Recovery — Let's track it!\n\n🔍 STEP 1: Go to google.com/android/find on any browser\n• Sign in with the Google account used on the phone\n• Your phone should appear on the map if it's online\n\n📍 If you see it on the map:\n• Note the EXACT address\n• Take a screenshot (evidence for police)\n• Do NOT go alone — report to police first!\n\n🔒 STEP 2: SECURE THE DEVICE remotely:\n• Click "Secure Device" — locks it with a message\n• Add your contact number so a good samaritan can call\n\n🗑️ STEP 3: If needed:\n• Click "Erase Device" to wipe all your data\n• This protects your banking apps, photos, etc.\n\n🔑 STEP 4: Find your IMEI number:\n• Dial *#06# on your old phone (if you remember)\n• Or check your phone box / purchase receipt\n• Or go to Settings > About Phone in your Google account backup\n\n📋 STEP 5: I'll now prepare your documents:\n✅ Police report (ready to print)\n✅ IMEI blacklist request for NCC\n✅ Insurance claim docs\n\nCan you access your Google account?`, suggestions: ['Yes, tracking now', 'I can\'t access my account', 'Draft my police report'] };
    }
    if (l.includes('police report') || l.includes('report') || l.includes('police') || l.includes('draft')) {
      return { text: `📋 I'll draft your police report right now. I just need these details:\n\n1️⃣ Your full name:\n2️⃣ Your phone number (another line):\n3️⃣ Your address:\n4️⃣ Phone brand & model (e.g., iPhone 14, Samsung S23):\n5️⃣ Phone color:\n6️⃣ IMEI number (if known — check your box or receipt):\n7️⃣ Date & time the phone was stolen:\n8️⃣ Location where it was stolen:\n9️⃣ Brief description of how it happened:\n\nJust type the answers one by one and I'll compile a professional police report you can print, sign, and take to ANY police station in Nigeria.\n\n💡 Don't know your IMEI? I can help you find it.\n\n💰 This service: ₦3,000 (includes police report + affidavit template)\n\nStart with your full name:`, suggestions: ['I don\'t know my IMEI', 'Where do I find my IMEI?', 'How do I get an affidavit?'] };
    }
    if (l.includes('imei') || l.includes('number')) {
      return { text: `🔑 How to Find Your IMEI Number:\n\nYour IMEI is your phone's unique identity — like a fingerprint. Here's how to get it:\n\n📦 Method 1: Check the phone box\nThe IMEI is printed on a sticker on the side of the original box.\n\n📄 Method 2: Purchase receipt\nSome shops print the IMEI on the receipt.\n\n📧 Method 3: Google account\nGo to myaccount.google.com → Security → Your Devices\nClick on the phone → you may see the IMEI listed.\n\n🍎 Method 4: Apple ID (iPhone)\nGo to appleid.apple.com → Devices → select the phone.\n\n📞 Method 5: Call your network provider\nCall MTN/Airtel/Glo/9mobile with your SIM details.\nThey may have the IMEI on record.\n\n⚠️ Why IMEI matters:\n• Police use it to identify your phone\n• NCC can BLOCK the phone nationwide\n• If someone tries to sell it, the IMEI flags it as stolen\n• Insurance companies require it for claims\n\nDid you find your IMEI?`, suggestions: ['Found it! Let\'s continue', 'Can\'t find it anywhere', 'Draft police report without IMEI'] };
    }
    if (l.includes('protect') || l.includes('security') || l.includes('prevent') || l.includes('setup') || l.includes('anti-theft') || l.includes('safe')) {
      return { text: `🔒 Device Security Audit & Anti-Theft Setup — ₦3,000\n\nLet me make your phone UNSTEALABLE (or at least unUSABLE if stolen):\n\n✅ I'll set up for you:\n\n📱 For Android:\n• Enable Google Find My Device\n• Set up Smart Lock\n• Enable SIM lock PIN\n• Configure automatic cloud backup\n• Set up trusted contacts for emergency\n• Install anti-theft app (Cerberus/Prey)\n• Enable developer options kill switch\n\n🍎 For iPhone:\n• Enable Find My iPhone + Offline Finding\n• Set up Activation Lock\n• Enable Stolen Device Protection (iOS 17+)\n• Configure automatic iCloud backup\n• Set up Medical ID & Emergency SOS\n• Enable USB Restricted Mode\n\n🛡️ For BOTH:\n• SIM swap fraud prevention steps\n• Banking app security hardening\n• Password manager setup\n• Two-factor authentication on all accounts\n\nWhich phone do you have?`, suggestions: ['Android setup', 'iPhone setup', 'SIM swap protection'] };
    }
    if (l.includes('sim') || l.includes('swap') || l.includes('fraud')) {
      return { text: `⚠️ SIM Swap Fraud Protection — ₦5,000\n\nSIM swap fraud is when criminals convince your network to transfer your number to their SIM. They then access your bank accounts, email, and social media.\n\n🛡️ How I protect you:\n\n✅ Step 1: SIM Lock\n• I'll walk you through setting a SIM PIN on your phone\n• Nobody can use your SIM in another phone\n\n✅ Step 2: Network Provider Alert\n• Register a "No Port" request with your provider\n• Set up a telecom PIN (MTN, Airtel, Glo support this)\n\n✅ Step 3: Banking Protection\n• Switch bank alerts from SMS to email + app notifications\n• Enable biometric authentication on banking apps\n• Set transaction limits\n\n✅ Step 4: Account Recovery\n• Set up authenticator apps instead of SMS 2FA\n• Register backup email addresses\n• Generate recovery codes for all accounts\n\n💡 90% of SIM swap fraud is preventable with these steps.\n\nWant me to walk you through each step right now?`, suggestions: ['Start protection setup', 'I think I\'m already a victim', 'Banking security'] };
    }
    if (l.includes('data') || l.includes('photo') || l.includes('contact') || l.includes('whatsapp') || l.includes('backup') || l.includes('recover')) {
      return { text: `💾 Data Recovery Guide — ₦3,000\n\nLost your phone doesn't mean lost your data! Here's what I can recover:\n\n📸 Photos & Videos:\n• Google Photos: photos.google.com (if backup was ON)\n• iCloud Photos: icloud.com/photos\n• Samsung Cloud: samsung.com/account\n\n👥 Contacts:\n• Google Contacts: contacts.google.com\n• iCloud: icloud.com/contacts\n\n💬 WhatsApp:\n• If Google Drive backup was enabled → reinstall on new phone\n• If iCloud backup was enabled → restore on new iPhone\n• I'll guide you through the exact restoration steps\n\n📁 Files & Documents:\n• Google Drive: drive.google.com\n• OneDrive / Dropbox / iCloud Drive\n\n📱 Apps & Settings:\n• Android: All apps restore automatically from Play Store\n• iPhone: Restore from iCloud backup when setting up new phone\n\nLet's start recovering. Which data matters most to you?`, suggestions: ['My photos', 'My WhatsApp chats', 'My contacts'] };
    }
    if (l.includes('marketplace') || l.includes('jiji') || l.includes('olx') || l.includes('facebook') || l.includes('monitor') || l.includes('scan')) {
      return { text: `🔍 Stolen Phone Marketplace Monitor — ₦8,000/month\n\nI scan these platforms DAILY for your stolen device:\n\n🛒 Platforms monitored:\n• Jiji.ng (Nigeria's largest marketplace)\n• OLX / Facebook Marketplace\n• WhatsApp selling groups (popular regions)\n• Instagram phone sellers\n• Computer Village, Lagos dealers (online listings)\n\n🎯 How it works:\n1️⃣ You give me: brand, model, color, IMEI, unique marks\n2️⃣ I search every day using AI pattern matching\n3️⃣ If I find a match, you get instant notification\n4️⃣ I provide the seller's profile, location, and listing details\n5️⃣ You forward to police with the evidence\n\n📊 Success rate: We've helped recover devices that were listed on Jiji within 48 hours of theft.\n\n⚠️ Important: NEVER confront the seller yourself. Always use police.\n\nWant me to start monitoring for your phone?`, suggestions: ['Start monitoring', 'I found my phone listed!', 'Other recovery options'] };
    }
    if (l.includes('insurance') || l.includes('claim')) {
      return { text: `📋 Phone Insurance Claim Documentation — ₦5,000\n\nI'll prepare your complete insurance claim package:\n\n✅ Documents I create for you:\n• Incident report (detailed narrative)\n• Police report (formatted for insurance)\n• IMEI documentation\n• Proof of ownership compilation\n• Loss timeline & evidence summary\n• Cover letter to insurance company\n\n📦 What you need to provide:\n1️⃣ Insurance policy number / provider name\n2️⃣ Phone purchase receipt or proof\n3️⃣ IMEI number\n4️⃣ Date & details of loss\n5️⃣ Police report (I can draft this for you too)\n\n⏱️ Full claim package ready in 30 minutes\n📄 Delivered in editable Word + PDF format\n\nWhich insurance provider is your phone with?`, suggestions: ['Prepare my claim', 'I don\'t have insurance', 'Draft police report first'] };
    }
    if (l.includes('bundle') || l.includes('full') || l.includes('everything') || l.includes('all')) {
      return { text: `🛡️ Full Protection Bundle — ₦25,000\n\nEverything you need for complete phone security & recovery:\n\n✅ Included:\n1. Stolen Phone Recovery Kit (₦5,000)\n2. Find My Device Setup (₦3,000)\n3. IMEI Extraction & NCC Filing (₦5,000)\n4. 1 Month Marketplace Monitoring (₦8,000)\n5. Police Report & Affidavit (₦3,000)\n6. Insurance Claim Docs (₦5,000)\n7. Device Security Audit (₦3,000)\n8. SIM Swap Protection (₦5,000)\n9. Data Recovery Guide (₦3,000)\n\n📊 Total value: ₦40,000\n💰 Bundle price: ₦25,000\n🎁 You save: ₦15,000\n\nThis is our most comprehensive package — covers everything from immediate recovery to future protection.\n\nReady to secure yourself?`, suggestions: ['Get the bundle', 'I just need recovery', 'I just need protection'] };
    }
  }

  // A11: ContentPro
  if (id === 'A11') {
    if (l.includes('tiktok') || l.includes('instagram') || l.includes('ig') || l.includes('youtube') || l.includes('reels') || l.includes('shorts')) {
      const platform = l.includes('tiktok') ? 'TikTok' : l.includes('youtube') ? 'YouTube' : 'Instagram';
      return { text: `📱 ${platform} Growth Strategy\n\nI'll create:\n📝 Viral script with scroll-stopping hook\n🖼️ 3 thumbnail options (optimized for CTR)\n#️⃣ 30 trending hashtags\n📊 Competitor analysis\n🎯 Posting schedule\n\nTell me:\n1️⃣ Your niche/topic?\n2️⃣ Current follower count?\n3️⃣ Content type (educational, entertainment, lifestyle)?\n4️⃣ Goal (followers, sales, brand awareness)?\n\nWhat's your niche?`, suggestions: ['Education/knowledge', 'Entertainment/comedy', 'Business/lifestyle'] };
    }
    if (l.includes('script') || l.includes('hook') || l.includes('viral')) {
      return { text: `📝 Viral Script Writing — ₦5,000\n\nI'll write a script with:\n🎣 Scroll-stopping hook (first 3 seconds)\n📖 Engaging story structure\n💥 Pattern interrupts\n🎬 Call-to-action\n\nI need:\n1️⃣ Platform (TikTok, IG, YouTube)\n2️⃣ Topic/message\n3️⃣ Target audience\n4️⃣ Desired length (15s, 30s, 60s)\n\nWhat's your video about?`, suggestions: ['15-second TikTok', '60-second IG Reel', 'YouTube Shorts'] };
    }
  }

  // A12: BusinessPro
  if (id === 'A12') {
    if (l.includes('business plan') || l.includes('plan')) {
      return { text: `📋 Business Plan — ₦100,000\n\n20+ pages covering:\n📌 Executive Summary\n📊 Market Analysis & Research\n🎯 Business Model & Strategy\n💰 Financial Projections (3-5 years)\n📈 Revenue Model & Pricing Strategy\n🏗️ Operations Plan\n📣 Marketing & Sales Strategy\n👥 Management Team\n💵 Funding Requirements\n\nI need:\n1️⃣ Business name & industry\n2️⃣ Product/service description\n3️⃣ Target market\n4️⃣ Startup capital available\n5️⃣ Revenue goals\n\nWhat business are you planning?`, suggestions: ['Tech startup', 'Restaurant/food', 'E-commerce'] };
    }
    if (l.includes('pitch') || l.includes('deck') || l.includes('investor')) {
      return { text: `📊 Investor Pitch Deck — ₦60,000\n\n10-15 slides including:\n🏠 Cover & Company Overview\n❓ Problem Statement\n💡 Solution\n📈 Market Opportunity\n🔧 Product Demo\n💰 Business Model\n📊 Traction & Metrics\n👥 Team\n💵 Funding Ask\n🗺️ Roadmap\n\nDesigned to be investor-ready with professional visuals.\n\nWhat's your startup about?`, suggestions: ['Tech/SaaS startup', 'Social enterprise', 'Consumer product'] };
    }
    if (l.includes('contract') || l.includes('nda') || l.includes('legal') || l.includes('agreement')) {
      return { text: `📄 Legal Documents — ₦15,000 - ₦35,000\n\nI draft:\n• Non-Disclosure Agreement (NDA)\n• Service Contracts\n• Employment Agreements\n• Partnership Agreements\n• Terms & Conditions\n• Privacy Policies\n• Wills & Testaments\n• CAC Registration Forms\n\n⚠️ Documents are professionally drafted but should be reviewed by a lawyer before signing.\n\nWhich document do you need?`, suggestions: ['NDA agreement', 'Service contract', 'Employment agreement'] };
    }
  }

  // A13: ServiceMart NG — AI-Delivered Services
  if (id === 'A13') {
    if (l.includes('jamb') || l.includes('utme') || l.includes('cbt')) {
      return { text: `📚 JAMB CBT Preparation — ₦3,000\n\nThis is our most popular student service! Here's what you get INSTANTLY after payment:\n\n✅ 10 YEARS of JAMB past questions (2015-2024)\n✅ ALL subjects covered (Use of English, Maths, Physics, Chemistry, Biology, Economics, Government, Literature, CRS/IRS, Commerce, Accounting, Geography + more)\n✅ Detailed solutions & explanations for EVERY question\n✅ Live AI tutor that explains concepts step-by-step\n✅ Timed practice mode (simulates real CBT)\n✅ Topic-by-topic drill exercises\n✅ I give you exercises → you solve → I mark & explain\n\n🎯 How our AI tutoring works:\n1️⃣ Pick your subjects\n2️⃣ I send you questions one by one\n3️⃣ You answer right here in the chat\n4️⃣ I mark it instantly and explain WHY\n5️⃣ We focus on your weak areas\n\n🏆 Students who use our prep score 250+ on average\n\n💡 Bundle with WAEC + NECO for just ₦7,500 (save ₦1,500)!\n\nWhich subjects are you writing?`, suggestions: ['English & Maths', 'Science subjects', 'Arts subjects'] };
    }
    if (l.includes('waec') || l.includes('ssce') || l.includes('wassce') || l.includes('west african')) {
      return { text: `📝 WAEC/SSCE Preparation — ₦3,000\n\nGet ready to score A1s and B2s! Instant access after payment:\n\n✅ 10 YEARS of WAEC past questions (2014-2024)\n✅ Objective + Theory + Practical questions\n✅ Detailed marking scheme explanations\n✅ Subject-by-subject coverage (all WAEC subjects)\n✅ Live AI tutor — ask me ANYTHING about any topic\n✅ Essay writing practice with AI grading\n✅ Lab practical guidance for science subjects\n\n📖 Subjects covered:\nEnglish, Maths, Physics, Chemistry, Biology, Economics, Government, Literature, Commerce, Accounting, Further Maths, Geography, Civic Education, CRS/IRS, Yoruba, Igbo, Hausa + more\n\n🎯 My tutoring approach:\n• I teach the concept FIRST\n• Then give you practice questions\n• Mark your answers IMMEDIATELY\n• Explain every mistake so you never repeat it\n\n💡 Bundle: JAMB + WAEC + NECO = ₦7,500 (save ₦1,500)!\n\nWhat subjects do you need most help with?`, suggestions: ['Mathematics', 'English Language', 'All my subjects'] };
    }
    if (l.includes('neco') || l.includes('national exam')) {
      return { text: `📋 NECO Preparation — ₦3,000\n\nNECO questions follow different patterns from WAEC — I know them all!\n\n✅ 10 YEARS of NECO past questions with solutions\n✅ Objective + Theory + Practical coverage\n✅ Subject-specific exam tips & tricks\n✅ Live AI tutor with instant feedback\n✅ Timed mock exams to build speed\n✅ Weak-area detection & focused drilling\n\n🎯 What makes NECO different:\n• More theory-heavy than WAEC\n• Different marking style\n• Unique question patterns\n• I teach you to handle BOTH\n\nReady to start drilling? Tell me your subjects and let's begin right now! 💪`, suggestions: ['Start practicing now', 'Science subjects', 'Commercial subjects'] };
    }
    if (l.includes('post-utme') || l.includes('post utme') || l.includes('aptitude') || l.includes('screening')) {
      return { text: `🏫 Post-UTME / Screening Prep — ₦3,500\n\nEvery university has its own style. I prepare you for YOUR specific school:\n\n✅ University-specific past questions (5+ years)\n✅ Aptitude test patterns & tricks\n✅ Speed & accuracy drills\n✅ Interview preparation (where applicable)\n\n🏛️ Universities covered:\nUNILAG, UI, OAU, UNILORIN, FUTA, LASU, UNIBEN, UNN, ABU Zaria, UniAbuja, LAUTECH, FUNAAB, UNIPORT + 50 more\n\nJust tell me which university and I'll customise your prep!\n\nWhat university are you targeting?`, suggestions: ['UNILAG', 'University of Ibadan', 'Other university'] };
    }
    if (l.includes('cv') || l.includes('resume') || l.includes('curriculum')) {
      return { text: `📄 Professional CV/Resume Writing — ₦5,000 - ₦15,000\n\nA great CV gets you 3X more interview calls. Here's what I create:\n\n💼 Entry Level (0-2 years): ₦5,000\n🏢 Mid Level (3-9 years): ₦10,000\n👔 Senior/Executive (10+ years): ₦15,000\n\n✅ What you get:\n• ATS-optimized format (beats robot screening)\n• Tailored to YOUR target industry\n• Action verbs & quantified achievements\n• Clean, professional layout\n• 7 different design templates\n• Word + PDF format\n• Cover letter included FREE\n\n⏱️ Delivered in 2 HOURS after payment\n🔄 2 free revisions\n\nTo build your CV, I need:\n1️⃣ Your current experience (or tell me you're fresh)\n2️⃣ Target job/industry\n3️⃣ Education background\n\nReady? Just tell me about yourself!`, suggestions: ['Entry level CV', 'Mid-career CV', 'Executive CV'] };
    }
    if (l.includes('cover letter') || l.includes('motivation letter') || l.includes('application letter')) {
      return { text: `✉️ Cover Letter & Motivation Letter — ₦3,000 - ₦8,000\n\nYour cover letter is what makes a recruiter actually READ your CV:\n\n📝 Standard Cover Letter: ₦3,000\n📝 Tailored Job-Specific Letter: ₦5,000\n📝 Scholarship Motivation Letter: ₦8,000\n\n✅ What I do:\n• Research the company/institution you're applying to\n• Match your skills to their requirements\n• Write in a professional, compelling tone\n• Show why YOU are the perfect fit\n• Proofread for zero errors\n\n⏱️ Delivered in 1 HOUR\n📎 Word + PDF format\n\nSend me the job posting or tell me where you're applying!`, suggestions: ['Job application letter', 'Scholarship letter', 'Internship letter'] };
    }
    if (l.includes('linkedin')) {
      return { text: `💼 LinkedIn Profile Optimization — ₦5,000\n\n80% of recruiters check LinkedIn BEFORE calling you. Let me make yours irresistible:\n\n✅ What I optimize:\n• Headline that grabs attention\n• Professional summary (keyword-rich)\n• Experience section with achievements\n• Skills & endorsements strategy\n• Recommendations guidance\n• Profile photo tips\n• Connection growth strategy\n\n⏱️ Delivered in 2 hours — complete profile text you copy-paste\n\nSend me your current LinkedIn URL or tell me your career background!`, suggestions: ['Optimize my profile', 'I don\'t have LinkedIn yet', 'Career change'] };
    }
    if (l.includes('ielts') || l.includes('toefl') || l.includes('english test') || l.includes('band')) {
      return { text: `🌍 IELTS / TOEFL Exam Preparation — ₦10,000\n\nI've helped students score Band 7.0+ consistently:\n\n📚 Full IELTS Package:\n✅ Speaking practice (I roleplay the examiner)\n✅ Writing Task 1 & Task 2 templates + practice\n✅ Reading comprehension strategies\n✅ Listening exercises with transcripts\n✅ 5 full mock tests with scoring\n✅ Band score prediction\n✅ Personalized improvement plan\n\n📚 TOEFL Package:\n✅ All 4 sections covered\n✅ Integrated & independent tasks\n✅ Mock tests with scoring\n\n🎯 My approach:\n1️⃣ I test your current level first\n2️⃣ Identify your weakest section\n3️⃣ Intensive drills on weak areas\n4️⃣ Full mock exam under timed conditions\n5️⃣ Score review & final tips\n\nWhat's your target score?`, suggestions: ['IELTS Band 7.0', 'IELTS Band 6.5', 'TOEFL 90+'] };
    }
    if (l.includes('pmp') || l.includes('acca') || l.includes('ican') || l.includes('cipm') || l.includes('certification') || l.includes('professional exam')) {
      return { text: `📜 Professional Certification Prep — ₦8,000 - ₦15,000\n\nLevel up your career with professional certifications:\n\n📊 Available prep courses:\n• PMP (Project Management Professional) — ₦15,000\n• ACCA (Association of Chartered Certified Accountants) — ₦12,000\n• ICAN (Institute of Chartered Accountants Nigeria) — ₦10,000\n• CIPM (Chartered Institute of Personnel Management) — ₦10,000\n• ANAN (Association of National Accountants) — ₦8,000\n• CISA / CISSP (IT Security) — ₦15,000\n\n✅ Each course includes:\n• Complete study notes & summaries\n• Past exam questions with solutions\n• Practice tests & mock exams\n• AI tutor for Q&A on any topic\n• Exam tips & time management strategies\n\nWhich certification are you pursuing?`, suggestions: ['PMP prep', 'ACCA/ICAN', 'CIPM'] };
    }
    if (l.includes('sop') || l.includes('personal statement') || l.includes('scholarship essay') || l.includes('statement of purpose')) {
      return { text: `✍️ SOP, Personal Statement & Scholarship Essays — ₦10,000 - ₦25,000\n\nThese documents decide if you get in or get rejected. I make sure you get in:\n\n📄 Statement of Purpose: ₦15,000\n📄 Personal Statement: ₦10,000\n📄 Scholarship Essay: ₦10,000\n📄 Motivation Letter: ₦8,000\n📄 Research Proposal: ₦25,000\n\n✅ Why my SOPs win:\n• Tailored to each university's values\n• Shows YOUR unique story compellingly\n• Proper structure that admissions committees love\n• Keyword optimization for AI screening\n• Multiple drafts until perfect\n\n⏱️ First draft in 24 hours\n🔄 2 free revisions\n\nTell me:\n1️⃣ Which university/scholarship?\n2️⃣ Your program/course\n3️⃣ Your background & achievements\n\nLet's craft your winning story!`, suggestions: ['University SOP', 'Scholarship essay', 'Research proposal'] };
    }
    if (l.includes('interview') || l.includes('mock') || l.includes('coaching')) {
      return { text: `🎤 Interview Coaching & Mock Sessions — ₦5,000\n\nPractice makes perfect. I simulate real interviews:\n\n🎯 What I cover:\n✅ Job interview prep (behavioral + technical)\n✅ Scholarship interview practice\n✅ Visa interview simulation (embassy-style)\n✅ University admission interviews\n✅ Competency-based questions\n\n💬 How it works:\n1️⃣ You tell me the role/position\n2️⃣ I become the interviewer\n3️⃣ I ask you real questions (tough ones!)\n4️⃣ You answer in the chat\n5️⃣ I grade your answer & coach you\n6️⃣ We repeat until you're confident\n\n⏱️ Session: Live, right here, right now\n🔄 Practice as many times as you want\n\nWhat interview are you preparing for?`, suggestions: ['Job interview', 'Visa interview', 'Scholarship interview'] };
    }
    if (l.includes('freelance') || l.includes('skill') || l.includes('course') || l.includes('learn') || l.includes('training')) {
      return { text: `💡 Freelance Skills Crash Course — ₦5,000 - ₦10,000\n\nLearn money-making skills in 7 days:\n\n🎨 Graphic Design Basics — ₦5,000\n💻 Web Development Intro — ₦10,000\n✍️ Content Writing Mastery — ₦5,000\n📊 Data Entry & Excel — ₦5,000\n📱 Social Media Management — ₦5,000\n🎥 Video Editing Basics — ₦7,000\n💰 Copywriting for Sales — ₦8,000\n🤖 AI Tools Mastery (ChatGPT, Midjourney) — ₦5,000\n\n✅ Each course includes:\n• 7-day structured curriculum\n• Daily lessons delivered in this chat\n• Practice exercises with feedback\n• Portfolio project at the end\n• Certificate of completion\n• Where to find freelance jobs guide\n\nWhich skill interests you?`, suggestions: ['Content Writing', 'Graphic Design', 'AI Tools Mastery'] };
    }
    if (l.includes('bundle') || l.includes('package') || l.includes('save') || l.includes('combo') || l.includes('deal')) {
      return { text: `💰 ServiceMart Bundles — Save Big!\n\n📚 Exam Prep Bundle\nJAMB + WAEC + NECO (all subjects)\n₦7,500 (normally ₦9,000 — save ₦1,500)\n\n💼 Career Starter Bundle\nCV + Cover Letter + LinkedIn + Interview Coaching\n₦15,000 (normally ₦18,000 — save ₦3,000)\n\n🌍 Japa Bundle\nIELTS Prep + SOP Writing + CV + Interview Coaching\n₦25,000 (normally ₦30,000 — save ₦5,000)\n\n📖 Student Ultimate Bundle\nJAMB + WAEC + NECO + Post-UTME\n₦10,000 (normally ₦12,500 — save ₦2,500)\n\n🎁 Extra perks with any bundle:\n✅ 10% discount on your next purchase\n✅ ₦1,000 for every friend you refer\n✅ Priority AI tutoring sessions\n\nWhich bundle fits you?`, suggestions: ['Exam Prep Bundle', 'Career Starter', 'Japa Bundle'] };
    }
  }

  // ── SERVICE NAME MATCH ──
  const serviceMatch = agent.services.find(s => {
    const sName = s.name.toLowerCase();
    const firstWord = sName.split(' ')[0];
    const beforeParen = sName.split('(')[0].trim();
    return l.includes(firstWord) || l.includes(beforeParen);
  });
  if (serviceMatch) {
    setCtx(p => ({ ...p, selectedService: serviceMatch.name }));
    return { text: `Excellent choice! "${serviceMatch.name}" is one of our most popular services. Here's why clients love it:\n\n💰 Price: ${serviceMatch.price}${serviceMatch.description ? `\n⏱️ Delivery: ${serviceMatch.description}` : ''}\n\n🎯 What's included:\n✅ Professional-grade output\n✅ 2 free revisions\n✅ Editable format (Word, PDF, etc.)\n✅ Plagiarism-free guarantee\n✅ 24/7 support throughout\n\nTo create the perfect result for you, I just need a few details:\n\n1️⃣ What are your specific requirements?\n2️⃣ Do you have any files to share? (tap 📎 below)\n3️⃣ When do you need it delivered?\n\nThe sooner we start, the sooner you'll have your results! What's your deadline?`, suggestions: ['Share my requirements', 'I\'m ready to pay', 'Tell me more first'] };
  }

  // ── CATCH-ALL: persuasive, never dead-end ──
  return { text: `That's a great question — let me help you with that.\n\nBased on what you've described ("${input.length > 60 ? input.slice(0, 60) + '...' : input}"), here's what I recommend as your ${agent.name} specialist:\n\n🎯 Best match for you:\n${agent.services.slice(0, 3).map((s, i) => `${i + 1}. ${s.name} — ${s.price}`).join('\n')}\n\n💡 Not sure which one? No worries — just describe your situation in more detail and I'll recommend the perfect service and give you an exact quote.\n\nHere's what makes us different:\n✅ 10,000+ satisfied clients across Nigeria\n✅ 2 free revisions on every project\n✅ Results typically delivered within 24-48 hours\n✅ Your data is protected with 18-layer security\n\nWhat specific outcome are you looking for? I'll create a custom plan just for you. 👇`, suggestions: ['Describe my project', 'Show full pricing', 'How does payment work?'] };
}
