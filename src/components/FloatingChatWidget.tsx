import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useConvexAuth } from "convex/react";

export function FloatingChatWidget() {
  const { isAuthenticated: _isAuthenticated, user } = useConvexAuth() as any;
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [_sessionId, setSessionId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [agentType, setAgentType] = useState<"sales" | "support">("support");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createChat = useConvexMutation(api.chatbot.createChatSession as any);
  const sendMessage = useConvexMutation(api.chatbot.sendMessage as any);

  const chatHistory = useQuery(
    chatId ? convexQuery(api.chatbot.getChatHistory, { chatId: chatId as any }) : { queryKey: [], enabled: false, queryFn: () => Promise.resolve(null) } as any
  ) as any;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory?.data?.chat?.messages]);

  const startChat = async (type: "sales" | "support") => {
    const result = await createChat({ 
      userId: user?._id,
      agentType: type 
    });
    setSessionId(result.sessionId);
    setChatId(result.chatId);
    setAgentType(type);
    setIsOpen(true);
  };

  const handleSend = async () => {
    if (!message.trim() || !chatId) return;
    
    const currentMessage = message;
    setMessage("");
    
    try {
      await sendMessage({
        chatId: chatId,
        content: currentMessage,
        userId: undefined,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => startChat("sales")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <span className="text-lg">💬</span>
            <span className="text-sm font-medium">Sales Chat</span>
          </button>
          <button
            onClick={() => startChat("support")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <span className="text-lg">🎧</span>
            <span className="text-sm font-medium">Support</span>
          </button>
        </div>
      </div>
    );
  }

  const messages = (chatHistory as any)?.data?.chat?.messages || [];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className={`${agentType === "sales" ? "bg-blue-600" : "bg-emerald-600"} p-4 flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl">{agentType === "sales" ? "🤖" : "🎧"}</span>
            </div>
            <div>
              <p className="text-white font-semibold">
                {agentType === "sales" ? "Sales Assistant" : "Support Agent"}
              </p>
              <p className="text-white/80 text-xs">AI Powered</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Agent Type Selector */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setAgentType("sales")}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              agentType === "sales" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setAgentType("support")}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              agentType === "support" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Support
          </button>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-800/50">
          {messages.filter((m: any) => m.role !== "system").length === 0 && (
            <div className="text-center text-slate-400 py-8">
              <p className="text-lg mb-2">👋</p>
              <p className="text-sm">How can I help you today?</p>
              <div className="mt-4 space-y-2">
                <QuickReply text="Pricing info" onClick={() => setMessage("Tell me about your pricing")} />
                <QuickReply text="Service details" onClick={() => setMessage("What services do you offer?")} />
                <QuickReply text="Talk to human" onClick={() => setMessage("I need to speak with a human")} />
              </div>
            </div>
          )}

          {messages.filter((m: any) => m.role !== "system").map((msg: any, idx: any) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-slate-700 text-slate-100 rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.confidence !== undefined && (
                  <p className={`text-xs mt-1 ${
                    msg.confidence >= 70 ? "text-green-300" : "text-yellow-300"
                  }`}>
                    {msg.confidence >= 70 ? "✓ Confident" : "⚠ May escalate"}
                  </p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-700 bg-slate-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            AI responses may escalate if confidence below 70%
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickReply({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
    >
      {text}
    </button>
  );
}

export default FloatingChatWidget;