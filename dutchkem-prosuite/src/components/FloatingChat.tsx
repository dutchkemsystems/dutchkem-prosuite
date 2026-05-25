import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface FloatingChatProps {
  setCurrentPage: (page: string) => void;
}

export default function FloatingChat({ setCurrentPage }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-navy to-navy-dark p-4">
              <div className="flex items-center gap-3">
                <img src="/images/dutchkem-logo.png" alt="Dutchkem" className="w-10 h-10 object-contain rounded-lg" />
                <div>
                  <p className="text-white font-bold text-sm">Dutchkem AI</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                    <span className="text-white/60 text-xs">Online — 13 agents ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 h-64 overflow-y-auto bg-cream/50">
              <div className="flex items-end gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-navy" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-3 py-2 text-sm text-navy border border-gray-100 max-w-[80%]">
                  Welcome to Dutchkem Ventures! 👋
                  <br />
                  <br />
                  How can I help you today?
                </div>
              </div>

              <div className="space-y-2">
                {[
                  'I need academic help 🎓',
                  'Professional services 🏛️',
                  'Business solutions 💼',
                  'Track my phone 📱',
                ].map((option, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIsOpen(false);
                      setCurrentPage('chat');
                    }}
                    className="w-full px-3 py-2 bg-white rounded-xl text-xs text-navy font-medium border border-gray-100 hover:border-coral/30 hover:bg-coral/5 transition-all cursor-pointer text-left"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-cream rounded-lg text-sm focus:outline-none border border-gray-100"
                  onFocus={() => {
                    setIsOpen(false);
                    setCurrentPage('chat');
                  }}
                />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setCurrentPage('chat');
                  }}
                  className="p-2 bg-coral rounded-lg text-white cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-coral to-coral-dark text-white shadow-lg shadow-coral/30 flex items-center justify-center cursor-pointer relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-forest text-white text-[8px] rounded-full flex items-center justify-center font-bold animate-pulse">
            ●
          </span>
        )}
      </motion.button>
    </div>
  );
}
