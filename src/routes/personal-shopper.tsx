import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { optimisticallySendMessage, useSmoothText, useUIMessages } from "@convex-dev/agent/react"
import { useConvexAuth, useMutation } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import { AgentHeader } from '../components/AgentHeader'
import type { UIMessage } from "@convex-dev/agent"
import { CompanyLogo } from "~/components/CompanyLogo"
import { FileDownloadButtons } from '~/components/dashboard/FileDownloadButtons'
import { AgentSupportButton } from '~/components/AgentSupportButton'

export const Route = createFileRoute('/personal-shopper')({
  component: PersonalShopperPage,
})

function PersonalShopperPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [threadId, setThreadId] = useState<string | null>(null);
  const createThread = useMutation(api.shopping_chat.createThread);

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
      <AgentHeader agentName="Personal Shopper" />

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
    api.shopping_chat.listMessages,
    { threadId },
    { initialNumItems: 50, stream: true },
  );
  const sendMessage = useMutation(api.shopping_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.shopping_chat.listMessages),
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
            className="w-full py-2 text-xs text-slate-500 hover:text-pink-400 transition-colors"
          >
            Load earlier messages
          </button>
        )}
        
        {results.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-pink-500/20">🛍️</div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Smart Shopping Studio</h3>
              <p className="text-slate-400 font-medium leading-relaxed text-sm">Find the lowest prices, discover amazing deals, or get the perfect gift recommendations instantly.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <QuickAction icon="💰" text="Compare Prices" onClick={() => handleQuickAction("Help me compare prices for products I want to buy")} />
              <QuickAction icon="🎁" text="Gift Ideas" onClick={() => handleQuickAction("Give me gift ideas for a special occasion")} />
              <QuickAction icon="🔥" text="Find Best Deals" onClick={() => handleQuickAction("Find the best deals and discounts available right now")} />
              <QuickAction icon="📋" text="Budget List" onClick={() => handleQuickAction("Create a shopping budget list for me")} />
            </div>
          </div>
        )}

        {results.map((msg) => (
          <MessageBubble key={msg.key} message={msg} />
        ))}
      </div>
      
      <div className="p-4 md:p-8 pt-0">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ChatInput threadId={threadId} />
          </div>
          <AgentSupportButton agentId="A5" agentName="Personal Shopper" />
        </div>
        <p className="text-[10px] text-center text-slate-600 mt-3 uppercase tracking-widest font-black">
          Dutchkem ProSuite NG+ Shopping Agent • Llama 3.3 Mastery
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
          isAssistant ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white' : 'bg-pink-600 text-white'
        }`}>
          {isAssistant ? '🛍️' : 'U'}
        </div>
        <div className={`p-4 rounded-2xl ${
          isAssistant 
            ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm' 
            : 'bg-pink-600 text-white shadow-lg shadow-pink-500/10'
        }`}>
          <div className="whitespace-pre-wrap leading-relaxed text-[15px] leading-7">
            {visibleText}
            {message.status === "streaming" && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-pink-400 animate-pulse align-middle"></span>
            )}
          </div>
          {isAssistant && visibleText && visibleText.length > 50 && message.status !== "streaming" && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <FileDownloadButtons content={visibleText} agentType="Personal Shopper" title="Shopping Output" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatInput({ threadId }: { threadId: string }) {
  const [input, setInput] = useState("");
  const sendMessage = useMutation(api.shopping_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.shopping_chat.listMessages),
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
        placeholder="What product are you looking for?"
        className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-5 pr-16 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all placeholder:text-slate-600 shadow-2xl font-medium"
      />
      <button 
        type="submit"
        disabled={!input.trim()}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center text-white hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale"
      >
        <span className="text-xl">↑</span>
      </button>
    </form>
  );
}

function QuickAction({ icon, text, onClick }: { icon: string, text: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-900 hover:border-slate-700 transition-all text-left text-xs font-bold text-slate-400 uppercase tracking-tight">
      <span className="text-xl">{icon}</span>
      {text}
    </button>
  );
}
