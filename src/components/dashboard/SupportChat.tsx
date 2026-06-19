import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useEffect, useRef, useState } from 'react';

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportChat({ isOpen, onClose }: SupportChatProps) {
  const messages = useQuery(api.client_support.getMessages);
  const sendMessage = useMutation(api.client_support.sendMessage);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await sendMessage({ content: text });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg h-[70vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl z-10">✕</button>

        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Support Chat</h2>
          <p className="text-xs text-slate-500 mt-1">Typical response time: 1-2 business days</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl">💬</div>
              <div>
                <p className="text-slate-400 font-medium">No messages yet</p>
                <p className="text-xs text-slate-600 mt-1">Send a message to start a conversation</p>
              </div>
            </div>
          )}

          {messages && messages.map((msg: { _id: string; role: string; content: string; timestamp: number; read: boolean }) => (
            <div key={msg._id} className={`flex ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'client' ? 'order-2' : ''}`}>
                <div className={`p-3 rounded-2xl text-sm ${
                  msg.role === 'client'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className={`text-[10px] text-slate-600 mt-1 ${msg.role === 'client' ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
