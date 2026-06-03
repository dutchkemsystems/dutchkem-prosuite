import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { convexQuery } from "@convex-dev/react";
import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════
// CHATBOT WIDGET — Lead capture chatbot
// ═══════════════════════════════════════════════════════════════════

interface ChatbotWidgetProps {
  position?: "bottom-right" | "bottom-left";
  theme?: "light" | "dark";
}

export function ChatbotWidget({
  position = "bottom-right",
  theme = "dark",
}: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startConversation = useMutation(api.chatbotLeads.startConversation);
  const sendMessage = useMutation(api.chatbotLeads.sendMessage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = async () => {
    setIsOpen(true);
    if (!conversationId) {
      const visitorId = localStorage.getItem("visitor_id") || crypto.randomUUID();
      localStorage.setItem("visitor_id", visitorId);

      const id = await startConversation({
        visitorId,
        page: window.location.pathname,
        referrer: document.referrer,
      });
      setConversationId(id as string);

      // Get initial message
      setMessages([
        {
          role: "bot",
          content: "Hello! Welcome to Dutchkem Ventures. How can I help you today?",
          options: ["Services", "Pricing", "Support", "Speak to Human"],
        },
      ]);
    }
  };

  const handleSend = async (message: string, option?: string) => {
    if (!conversationId) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setIsTyping(true);

    // Send to backend
    await sendMessage({
      conversationId: conversationId as any,
      message,
      selectedOption: option,
    });

    // Simulate bot response (in real app, this would come from backend)
    setTimeout(() => {
      const botResponse = generateLocalResponse(option || message);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const generateLocalResponse = (input: string) => {
    const lower = input.toLowerCase();

    if (lower.includes("service") || lower === "Services") {
      return {
        role: "bot",
        content: "We offer AI-powered services across 15 specialized agents. What are you interested in?",
        options: ["Academic Writing", "Business Consulting", "Content Creation", "Video Production", "Other"],
      };
    }
    if (lower.includes("pricing") || lower === "Pricing") {
      return {
        role: "bot",
        content: "Our plans start from ₦2,000/week. Would you like to see our pricing options?",
        options: ["View Plans", "Compare Plans", "Custom Quote"],
      };
    }
    if (lower.includes("support") || lower === "Support") {
      return {
        role: "bot",
        content: "I'd be happy to help! What do you need assistance with?",
      };
    }
    if (lower.includes("human") || lower === "Speak to Human") {
      return {
        role: "bot",
        content: "Let me connect you with the right person. What's your name and email?",
      };
    }
    return {
      role: "bot",
      content: "Thanks for your message! Our team will get back to you within 24 hours. Is there anything else I can help with?",
      options: ["No, that's all", "Yes, I have more questions"],
    };
  };

  const positionClasses =
    position === "bottom-right" ? "bottom-4 right-4" : "bottom-4 left-4";

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`mb-4 w-80 overflow-hidden rounded-2xl border shadow-2xl ${
            theme === "dark"
              ? "border-white/10 bg-slate-900"
              : "border-gray-200 bg-white"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm">
                  🤖
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Dutchkem Assistant</div>
                  <div className="text-[10px] text-white/70">Online now</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {msg.content}
                  {msg.options && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.options.map((opt: string, j: number) => (
                        <button
                          key={j}
                          onClick={() => handleSend(opt, opt)}
                          className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] text-white/80 hover:bg-white/10"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-4 py-2 text-xs text-white">
                  <span className="animate-pulse">Typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && input && handleSend(input)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => input && handleSend(input)}
                disabled={!input}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={handleOpen}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${
          isOpen
            ? "bg-slate-700 text-white"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        }`}
      >
        {isOpen ? (
          <span className="text-xl">✕</span>
        ) : (
          <span className="text-xl">💬</span>
        )}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CHATBOT ADMIN PANEL — Conversation management
// ═══════════════════════════════════════════════════════════════════

export function ChatbotAdminPanel() {
  const stats = useQuery(convexQuery(api.chatbotLeads.getChatbotStats, {}));
  const conversations = useQuery(convexQuery(api.chatbotLeads.getConversations, {}));

  if (!stats || !conversations) return null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.totalConversations}</div>
          <div className="text-[10px] text-slate-400">Total Conversations</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.activeConversations}</div>
          <div className="text-[10px] text-slate-400">Active Now</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.chatbotLeads}</div>
          <div className="text-[10px] text-slate-400">Leads Captured</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-green-400">{stats.conversionRate}%</div>
          <div className="text-[10px] text-slate-400">Conversion Rate</div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-black text-white">💬 Recent Conversations</h4>
        <div className="space-y-2">
          {conversations.slice(0, 10).map((conv) => (
            <div
              key={conv._id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <div>
                <div className="text-xs font-bold text-white">
                  {conv.visitorId.slice(0, 8)}...
                </div>
                <div className="text-[10px] text-slate-400">
                  {conv.messages.length} messages · {conv.state}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[9px] text-slate-500">
                  {new Date(conv.createdAt).toLocaleTimeString()}
                </div>
                <div
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    conv.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-slate-500/20 text-slate-400"
                  }`}
                >
                  {conv.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
