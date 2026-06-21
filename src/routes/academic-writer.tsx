import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { optimisticallySendMessage, useSmoothText, useUIMessages } from "@convex-dev/agent/react"
import { useConvexAuth, useMutation } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import { AgentHeader } from '../components/AgentHeader'
import type { UIMessage } from "@convex-dev/agent"
import { AgentServices } from '~/components/AgentServices'
import { CompanyLogo } from '~/components/CompanyLogo'
import { FileDownloadButtons } from '~/components/dashboard/FileDownloadButtons'

export const Route = createFileRoute('/academic-writer')({
  component: AcademicWriterPage,
})

function AcademicWriterPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [threadId, setThreadId] = useState<string | null>(null);
  const createThread = useMutation(api.academic_chat.createThread);

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
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Initializing ProSuite NG+ Intelligence...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <AgentHeader agentName="Academic Writer" />

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
    api.academic_chat.listMessages,
    { threadId },
    { initialNumItems: 50, stream: true },
  );
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendMessage = useMutation(api.academic_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.academic_chat.listMessages),
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  const handleQuickAction = async (text: string) => {
    await sendMessage({ threadId, prompt: text });
  };

  return (
    <div className="flex-grow flex flex-col h-full">
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
      >
        {status === "CanLoadMore" && (
          <button 
            onClick={() => loadMore(20)}
            className="w-full py-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors"
          >
            Load earlier messages
          </button>
        )}
        
        {results.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-orange-500/20 animate-float">🎓</div>
            <div>
              <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter">Academic Research Hub</h3>
              <p className="text-slate-400 font-medium italic opacity-80">"Intelligence is the ability to adapt to change." — Hawking</p>
            </div>
            
            <div className="w-full">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Select specialized service layer</p>
              <AgentServices agentId="A1" onSelect={handleQuickAction} />
            </div>
          </div>
        )}

        {results.map((msg) => (
          <MessageBubble key={msg.key} message={msg} />
        ))}
      </div>
      
      <div className="p-4 md:p-8 pt-0">
        <ChatInput threadId={threadId} />
        <p className="text-[10px] text-center text-slate-600 mt-3 font-bold uppercase tracking-widest opacity-50">
          Dutchkem ProSuite NG+ Academic Agent • Llama 3.3 70B • Bank-Grade Security
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
        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold ${
          isAssistant ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' : 'bg-indigo-600 text-white'
        }`}>
          {isAssistant ? '🎓' : 'U'}
        </div>
        <div className={`p-4 rounded-2xl ${
          isAssistant 
            ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm' 
            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
        }`}>
          <div className="whitespace-pre-wrap leading-relaxed text-sm">
            {visibleText}
            {message.status === "streaming" && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle"></span>
            )}
          </div>
          {/* Download buttons for assistant messages with content */}
          {isAssistant && visibleText && visibleText.length > 50 && message.status !== "streaming" && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <FileDownloadButtons
                content={visibleText}
                agentType="Academic Writer"
                title="Academic Output"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatInput({ threadId }: { threadId: string }) {
  const [input, setInput] = useState("");
  const sendMessage = useMutation(api.academic_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.academic_chat.listMessages),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const prompt = input;
    setInput("");
    await sendMessage({ threadId, prompt });
  };

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask the Academic Assistant anything..."
        className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-5 pr-16 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-slate-600 shadow-2xl"
      />
      <button 
        type="submit"
        disabled={!input.trim()}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-white hover:bg-orange-700 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-orange-500/20"
      >
        <span className="text-xl font-bold">↑</span>
      </button>
    </form>
  );
}
