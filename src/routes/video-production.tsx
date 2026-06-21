import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { optimisticallySendMessage, useSmoothText, useUIMessages } from "@convex-dev/agent/react"
import { useConvexAuth, useMutation, useQuery, useAction } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import { AgentHeader } from '../components/AgentHeader'
import type { UIMessage } from "@convex-dev/agent"
import { CompanyLogo } from "~/components/CompanyLogo"
import { FileDownloadButtons } from '~/components/dashboard/FileDownloadButtons'

export const Route = createFileRoute('/video-production')({
  component: VideoProductionPage,
})

function VideoProductionPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showVideoStudio, setShowVideoStudio] = useState(false);
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
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Initializing MediaStudio Pro...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <AgentHeader agentName="MediaStudio Pro" />
      <div className="px-4 md:px-8 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowVideoStudio(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!showVideoStudio ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            💬 Chat Assistant
          </button>
          <button onClick={() => setShowVideoStudio(true)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${showVideoStudio ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            🎬 Video Production Studio
          </button>
        </div>
      </div>
      <main className="flex-grow flex flex-col relative overflow-hidden">
        <div className="flex-grow overflow-hidden flex flex-col">
          {showVideoStudio ? <VideoStudio /> : <ChatContainer threadId={threadId} />}
        </div>
      </main>
    </div>
  );
}

function VideoStudio() {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Drama');
  const [targetDuration, setTargetDuration] = useState(30);
  const [quality, setQuality] = useState('standard');
  const [isProducing, setIsProducing] = useState(false);
  const [productionResult, setProductionResult] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const produceVideo = useAction(api.video_production.produceFullVideo);

  const handleProduce = async () => {
    if (!prompt.trim()) return;
    setIsProducing(true);
    try {
      const result = await produceVideo({ prompt, genre, targetDuration, quality, outputFormat: 'mp4' });
      setProductionResult(result);
      setToast(result.success ? 'Video production completed!' : (result.error || 'Production failed'));
    } catch (err: any) {
      setToast(err.message || 'Production failed');
    }
    setIsProducing(false);
  };

  return (
    <div className="flex-grow overflow-y-auto p-4 md:p-8">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">✓ {toast}</div>}
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-2">🎬 Long-Form Video Production</h2>
          <p className="text-slate-400">Generate full-length movies up to 3 hours with AI</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Create New Production</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Video Description</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your movie..." rows={4} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Genre</label>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50">
                  <option value="Drama">Drama</option>
                  <option value="Action">Action</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Horror">Horror</option>
                  <option value="Documentary">Documentary</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Duration (minutes)</label>
                <input type="number" value={targetDuration} onChange={(e) => setTargetDuration(Number(e.target.value))} min={1} max={180} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Quality</label>
                <select value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50">
                  <option value="draft">Draft (480p)</option>
                  <option value="standard">Standard (720p)</option>
                  <option value="hd">HD (1080p)</option>
                  <option value="4k">4K (2160p)</option>
                </select>
              </div>
            </div>
            <button onClick={handleProduce} disabled={isProducing || !prompt.trim()} className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-50">
              {isProducing ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span>Producing Video...</span> : '🎬 Start Production'}
            </button>
          </div>
        </div>
        {productionResult && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Production Result</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-slate-400">Status</span><span className={`font-bold ${productionResult.success ? 'text-emerald-400' : 'text-red-400'}`}>{productionResult.success ? 'Completed' : 'Failed'}</span></div>
              {productionResult.videoUrl && <div className="flex items-center justify-between"><span className="text-slate-400">Video</span><a href={productionResult.videoUrl} target="_blank" className="text-red-400 hover:text-red-300 font-bold">Download Video →</a></div>}
              {productionResult.duration && <div className="flex items-center justify-between"><span className="text-slate-400">Duration</span><span className="text-white font-bold">{Math.floor(productionResult.duration / 60)}m {productionResult.duration % 60}s</span></div>}
            </div>
          </div>
        )}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Production Pipeline</h3>
          <div className="grid grid-cols-5 gap-2">
            {[{ step: '1', label: 'Story Development', icon: '📝' }, { step: '2', label: 'Scene Generation', icon: '🎨' }, { step: '3', label: 'Video Assembly', icon: '🎬' }, { step: '4', label: 'Post-Processing', icon: '✨' }, { step: '5', label: 'Export', icon: '📦' }].map((item) => (
              <div key={item.step} className="text-center p-3 bg-slate-900 rounded-xl"><span className="text-2xl">{item.icon}</span><p className="text-xs text-slate-400 mt-2">{item.label}</p></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatContainer({ threadId }: { threadId: string }) {
  const { results, status, loadMore } = useUIMessages(api.video_chat.listMessages, { threadId }, { initialNumItems: 50, stream: true });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendMessage = useMutation(api.video_chat.sendMessage).withOptimisticUpdate(optimisticallySendMessage(api.video_chat.listMessages));
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [results]);
  const handleQuickAction = async (text: string) => { await sendMessage({ threadId, prompt: text }); };

  return (
    <div className="flex-grow flex flex-col h-full">
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
        {status === "CanLoadMore" && <button onClick={() => loadMore(20)} className="w-full py-2 text-xs text-slate-500 hover:text-red-400 transition-colors">Load earlier messages</button>}
        {results.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-red-500/20 animate-float">🎬</div>
            <div><h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter">MediaStudio Pro</h3><p className="text-slate-400 font-medium italic opacity-80">"Every frame tells a story."</p></div>
            <div className="w-full"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Select specialized service layer</p><AgentServices agentId="A8" onSelect={handleQuickAction} /></div>
          </div>
        )}
        {results.map((msg) => <MessageBubble key={msg.key} message={msg} />)}
      </div>
      <div className="p-4 md:p-8 pt-0">
        <ChatInput threadId={threadId} />
        <p className="text-[10px] text-center text-slate-600 mt-3 font-bold uppercase tracking-widest opacity-50">Dutchkem ProSuite NG+ MediaStudio Agent • Llama 3.3 70B • Bank-Grade Security</p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isAssistant = message.role === "assistant";
  const [visibleText] = useSmoothText(message.text, { startStreaming: message.status === "streaming" });
  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
        <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-base font-bold ${isAssistant ? 'bg-gradient-to-br from-red-600 to-orange-500 text-white' : 'bg-red-600 text-white'}`}>{isAssistant ? '🎬' : 'U'}</div>
        <div className={`p-4 rounded-2xl ${isAssistant ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm' : 'bg-red-600 text-white shadow-lg shadow-red-500/10'}`}>
          <div className="whitespace-pre-wrap leading-relaxed text-[15px] leading-7">{visibleText}{message.status === "streaming" && <span className="inline-block w-1.5 h-4 ml-1 bg-red-400 animate-pulse align-middle"></span>}</div>
          {isAssistant && visibleText && visibleText.length > 50 && message.status !== "streaming" && <div className="mt-3 pt-3 border-t border-slate-700"><FileDownloadButtons content={visibleText} agentType="MediaStudio Pro" title="Video Production Output" /></div>}
        </div>
      </div>
    </div>
  );
}

function ChatInput({ threadId }: { threadId: string }) {
  const [input, setInput] = useState("");
  const sendMessage = useMutation(api.video_chat.sendMessage).withOptimisticUpdate(optimisticallySendMessage(api.video_chat.listMessages));
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!input.trim()) return; const prompt = input; setInput(""); await sendMessage({ threadId, prompt }); };
  return (
    <form onSubmit={handleSubmit} className="relative group">
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the MediaStudio Assistant anything..." className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-5 pr-16 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all placeholder:text-slate-600 shadow-2xl" />
      <button type="submit" disabled={!input.trim()} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-red-500/20"><span className="text-xl font-bold">↑</span></button>
    </form>
  );
}

function AgentServices({ agentId, onSelect }: { agentId: string; onSelect: (text: string) => void }) {
  const services = [
    { id: 'video-editing', label: 'Video Editing', icon: '✂️', prompt: 'I need help with video editing' },
    { id: 'script-writing', label: 'Script Writing', icon: '📝', prompt: 'Help me write a video script' },
    { id: 'storyboard', label: 'Storyboard Creation', icon: '🎨', prompt: 'Create a storyboard for my video' },
    { id: 'animation', label: 'Animation', icon: '✨', prompt: 'I need animation services' },
    { id: 'voiceover', label: 'Voiceover', icon: '🎙️', prompt: 'Help me with voiceover recording' },
    { id: 'subtitles', label: 'Subtitles & Captions', icon: '💬', prompt: 'Add subtitles to my video' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {services.map((service) => (
        <button key={service.id} onClick={() => onSelect(service.prompt)} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-all border border-slate-700 hover:border-red-500/50">
          <span className="text-2xl">{service.icon}</span>
          <p className="text-sm font-bold text-white mt-2">{service.label}</p>
        </button>
      ))}
    </div>
  );
}
