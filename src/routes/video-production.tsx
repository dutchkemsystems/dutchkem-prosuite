import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { optimisticallySendMessage, useSmoothText, useUIMessages } from "@convex-dev/agent/react"
import { useConvexAuth, useMutation } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import { AgentHeader } from '../components/AgentHeader'
import type { UIMessage } from "@convex-dev/agent"
import { CompanyLogo } from '~/components/CompanyLogo'

export const Route = createFileRoute('/video-production')({
  component: MediaStudioProPage,
})

function MediaStudioProPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const createThread = useMutation(api.video_chat.createThread);

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
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Booting MediaStudio Engine Intelligence...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500/30">
      <AgentHeader agentName="MediaStudio Pro" />

      <main className="flex-grow flex flex-col relative overflow-hidden">
        {/* Capabilities Overlay Toggle */}
        <button 
          onClick={() => setShowCapabilities(!showCapabilities)}
          className="absolute top-6 right-8 z-40 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
          {showCapabilities ? 'Close Capabilities' : 'View Capabilities & Pricing'}
        </button>

        {showCapabilities && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-2xl p-8 md:p-20 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
             <div className="max-w-5xl mx-auto space-y-16 pb-20">
                <div className="text-center space-y-4">
                   <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">Service Menu</h2>
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Professional Grade • NVIDIA-Powered • 99% Accuracy</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <ServiceCategory title="Video Editing" items={[
                      { label: 'Short (1-10 min)', price: '₦15,000' },
                      { label: 'Medium (11-30 min)', price: '₦35,000' },
                      { label: 'Long (31-60 min)', price: '₦60,000' },
                      { label: 'Professional (1-3 hrs)', price: '₦120,000' },
                      { label: 'Cinematic (3+ hrs)', price: '₦250,000' }
                   ]} />
                   <ServiceCategory title="Voice & Dubbing" items={[
                      { label: 'Expert Voice Dubbing', price: '₦2,000/min' },
                      { label: 'Voice Clone Dubbing', price: '₦3,000/min' },
                      { label: 'Lip-Sync Dubbing', price: '₦4,000/min' },
                      { label: 'Standard Voice Clone', price: '₦50,000' },
                      { label: 'Professional Clone', price: '₦100,000' }
                   ]} />
                   <ServiceCategory title="Animation & Film" items={[
                      { label: '2D Cartoon Animation', price: '₦50,000/min' },
                      { label: '3D High-Fidelity', price: '₦100,000/min' },
                      { label: 'Anime Style', price: '₦60,000/min' },
                      { label: 'TV Series Episode', price: '₦500,000' },
                      { label: 'Movie Script (90 min)', price: '₦150,000' }
                   ]} />
                   <ServiceCategory title="Transcription & Translation" items={[
                      { label: 'Nigerian Languages', price: '₦500/min' },
                      { label: 'English Variants', price: '₦300/min' },
                      { label: 'Translation (500 words)', price: '₦1,000+' },
                      { label: 'Subtitle Generation', price: 'Included' }
                   ]} />
                </div>
                
                <div className="p-10 rounded-[3rem] bg-gradient-to-br from-orange-600/20 to-indigo-600/20 border border-white/10 text-center">
                   <h3 className="text-xl font-black uppercase tracking-widest mb-4">Ready to start?</h3>
                   <p className="text-slate-400 mb-8 max-w-xl mx-auto">Brief the Agent in the chat to receive an instant quote and script preview. Payments are verified by <strong>Guardian AI</strong> via Kora Pay.</p>
                   <button onClick={() => setShowCapabilities(false)} className="px-12 py-5 bg-gradient-primary text-white font-black rounded-2xl hover:scale-105 transition-all">BACK TO STUDIO</button>
                </div>
             </div>
          </div>
        )}

        <div className="flex-grow overflow-hidden flex flex-col">
          <ChatContainer threadId={threadId} />
        </div>
      </main>
    </div>
  );
}

function ServiceCategory({ title, items }: { title: string, items: Array<{label: string, price: string}> }) {
   return (
      <div className="space-y-6">
         <h3 className="text-xs font-black uppercase tracking-[0.4em] text-orange-500 border-b border-orange-500/20 pb-4">{title}</h3>
         <div className="space-y-4">
            {items.map(item => (
               <div key={item.label} className="flex justify-between items-center group">
                  <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                  <span className="text-sm font-black text-white tabular-nums">{item.price}</span>
               </div>
            ))}
         </div>
      </div>
   )
}

function ChatContainer({ threadId }: { threadId: string }) {
  const { results, status, loadMore } = useUIMessages(
    api.video_chat.listMessages,
    { threadId },
    { initialNumItems: 50, stream: true },
  );
  const sendMessage = useMutation(api.video_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.video_chat.listMessages),
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
        className="flex-grow overflow-y-auto p-4 md:p-12 space-y-10 scroll-smooth"
      >
        {status === "CanLoadMore" && (
          <button 
            onClick={() => loadMore(20)}
            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-orange-500 transition-colors"
          >
            ↑ Retrieve Archive
          </button>
        )}
        
        {results.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-12">
            <div className="relative">
               <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl shadow-orange-500/20 relative z-10 animate-float">🎬</div>
               <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
            </div>
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-white uppercase tracking-tighter">MediaStudio Pro</h3>
              <p className="text-slate-500 font-bold leading-relaxed text-lg uppercase tracking-widest">Digital Workforce Engine v2.0 • NVIDIA Cluster Active</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <QuickAction icon="🎬" title="Video Editing" desc="Shorts, Cinematic, Pro" onClick={() => handleQuickAction("I need video editing services for my project")} />
              <QuickAction icon="🎙️" title="Voice & Dubbing" desc="Cloning, Lip-sync, Expert" onClick={() => handleQuickAction("I need voice dubbing or voice cloning services")} />
              <QuickAction icon="🎨" title="Animation" desc="2D/3D, Anime, Series" onClick={() => handleQuickAction("I need animation services for my video project")} />
              <QuickAction icon="🌍" title="Translation" desc="50+ Languages, Subtitles" onClick={() => handleQuickAction("I need translation and subtitle services for my video")} />
            </div>
          </div>
        )}

        {results.map((msg) => (
          <MessageBubble key={msg.key} message={msg} />
        ))}
      </div>
      
      <div className="p-6 md:p-12 pt-0 max-w-5xl mx-auto w-full">
        <ChatInput threadId={threadId} />
        <div className="flex justify-between items-center mt-6">
           <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                 <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">NVIDIA H100 STATUS: OPTIMAL</span>
              </div>
              <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                 <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                 <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">GUARDIAN AI: LIVE</span>
              </div>
           </div>
           <p className="text-[9px] text-slate-700 uppercase tracking-[0.4em] font-black">
             PROSUITE NG+ ENTERPRISE EDITION
           </p>
        </div>
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
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className={`max-w-[90%] md:max-w-[80%] flex gap-6 ${isAssistant ? '' : 'flex-row-reverse'}`}>
        <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl font-bold shadow-2xl transition-transform group-hover:scale-110 ${
          isAssistant ? 'bg-gradient-primary text-white' : 'bg-white text-slate-950'
        }`}>
          {isAssistant ? '🎬' : '👤'}
        </div>
        <div className={`p-8 rounded-[2.5rem] relative ${
          isAssistant 
            ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-2xl' 
            : 'bg-gradient-primary text-white shadow-[0_20px_50px_rgba(255,107,53,0.3)]'
        }`}>
          {isAssistant && message.status === "streaming" && (
            <div className="flex items-center gap-2 mb-4 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full w-fit animate-pulse">
               <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
               <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Drafting Script Preview...</span>
            </div>
          )}
          <div className="whitespace-pre-wrap leading-relaxed text-base font-bold tracking-tight">
            {visibleText}
            {message.status === "streaming" && (
              <span className="inline-block w-2 h-5 ml-2 bg-orange-400 animate-pulse align-middle rounded-full"></span>
            )}
          </div>
          <div className={`absolute bottom-[-24px] ${isAssistant ? 'left-4' : 'right-4'} text-[9px] font-black uppercase tracking-widest text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity`}>
             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {isAssistant ? 'MediaStudio Pro' : 'Verified Client'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatInput({ threadId }: { threadId: string }) {
  const [input, setInput] = useState("");
  const sendMessage = useMutation(api.video_chat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.video_chat.listMessages),
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
      <div className="absolute inset-0 bg-gradient-primary blur-2xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-500 rounded-3xl"></div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Brief the Agent: 'I need a 2-minute whiteboard animation about SaaS...'"
        className="w-full bg-slate-900 border-2 border-slate-800 text-white rounded-3xl px-8 py-7 pr-24 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-slate-700 shadow-2xl font-black text-sm uppercase tracking-widest relative z-10"
      />
      <button 
        type="submit"
        disabled={!input.trim()}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale z-20 shadow-2xl shadow-orange-500/40"
      >
        <span className="text-2xl font-black">→</span>
      </button>
    </form>
  );
}

function QuickAction({ icon, title, desc, onClick }: { icon: string, title: string, desc: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-8 bg-slate-900/50 border-2 border-slate-800 rounded-[2rem] hover:bg-slate-900 hover:border-orange-500/50 transition-all text-center group cursor-pointer shadow-xl">
      <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm font-black text-white uppercase tracking-widest">{title}</span>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{desc}</span>
    </button>
  );
}
