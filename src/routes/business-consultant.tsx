import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { optimisticallySendMessage, useSmoothText, useUIMessages } from "@convex-dev/agent/react"
import { useConvexAuth, useMutation } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import { AgentHeader } from '../components/AgentHeader'
import type { UIMessage } from "@convex-dev/agent"
import { CompanyLogo } from "~/components/CompanyLogo"
import { FileDownloadButtons } from '~/components/dashboard/FileDownloadButtons'

export const Route = createFileRoute('/business-consultant')({
  component: BusinessConsultantPage,
})

function BusinessConsultantPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [threadId, setThreadId] = useState<string | null>(null);
  const createThread = useMutation(api.business_chat.createThread);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/auth' });
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    const initThread = async () => {
      const { threadId: tid } = await createThread({});
      setThreadId(tid);
    };
    if (isAuthenticated) {
      initThread();
    }
  }, [isAuthenticated]);

  if (isLoading || !threadId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
        <div className="flex flex-col items-center gap-12">
          <CompanyLogo className="w-24 h-24" />
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-1 bg-slate-900 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-primary w-1/2 animate-loading-bar"></div>
            </div>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Initializing Intelligence Node...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <AgentHeader agentName="Business Consultant" />

      <main className="flex-grow flex flex-col relative overflow-hidden">
        <div className="flex-grow overflow-hidden flex flex-col">
          <ChatContainer threadId={threadId} />
        </div>
      </main>
    </div>
  );
}

function ChatContainer({ threadId }: { threadId: string }) {
  const { results, status, loadMore } = useUIMessages(
    api.business_chat.listMessages,
    { threadId },
    { initialNumItems: 50, stream: true },
  );
  const sendMessage = useMutation(api.business_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.business_chat.listMessages),
  );
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleQuickAction = async (text: string) => {
    try {
      await sendMessage({ threadId, prompt: text });
    } catch (error) {
      console.error("Failed to send:", error);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  return (
    <div className="flex-grow flex flex-col h-full">
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
      >
        {status === "CanLoadMore" && (
          <button 
            onClick={() => loadMore(20)}
            className="w-full py-2 text-xs text-slate-500 hover:text-blue-400 transition-colors"
          >
            Load earlier messages
          </button>
        )}
        
        {results.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-blue-500/20">💼</div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Strategy & Planning Hub</h3>
              <p className="text-slate-400">Scale your venture with expert financial modeling, business planning, and market insights.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <QuickAction icon="📑" text="Full Business Plan" onClick={() => handleQuickAction("Create a full business plan for my startup")} />
              <QuickAction icon="📊" text="Financial Projection" onClick={() => handleQuickAction("Create a financial projection for my business")} />
              <QuickAction icon="🎯" text="GTM Strategy" onClick={() => handleQuickAction("Develop a go-to-market strategy for my product")} />
              <QuickAction icon="🦄" text="Pitch Deck Draft" onClick={() => handleQuickAction("Draft a pitch deck for investor presentation")} />
            </div>
          </div>
        )}

        {results.map((msg) => (
          <MessageBubble key={msg.key} message={msg} />
        ))}
      </div>
      
      <div className="p-4 md:p-8 pt-0">
        <ChatInput threadId={threadId} />
        <p className="text-[10px] text-center text-slate-600 mt-3">
          Dutchkem ProSuite NG+ Business Agent. Enterprise Intelligence Engine.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isAssistant = message.role === "assistant";
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: message.status === "streaming",
  });

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
        <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-base font-bold ${
          isAssistant ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          {isAssistant ? '💼' : 'U'}
        </div>
        <div className={`p-4 rounded-2xl ${
          isAssistant 
            ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm' 
            : 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
        }`}>
          <div className="whitespace-pre-wrap leading-relaxed text-[15px] leading-7">
            {visibleText}
            {message.status === "streaming" && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 animate-pulse align-middle"></span>
            )}
          </div>
          {isAssistant && visibleText && visibleText.length > 50 && message.status !== "streaming" && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <FileDownloadButtons content={visibleText} agentType="Business Advisor" title="Business Output" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatInput({ threadId }: { threadId: string }) {
  const [input, setInput] = useState("");
  const sendMessage = useMutation(api.business_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.business_chat.listMessages),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const prompt = input;
    setInput("");
    try {
      await sendMessage({ threadId, prompt });
    } catch (error) {
      console.error("Failed to send:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="How can I help grow your business today?"
        className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-500 shadow-xl"
      />
      <button 
        type="submit"
        disabled={!input.trim()}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale"
      >
        <span>↑</span>
      </button>
    </form>
  );
}

function QuickAction({ icon, text, onClick }: { icon: string, text: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all text-left text-xs font-medium text-slate-300">
      <span className="text-base">{icon}</span>
      {text}
    </button>
  );
}
