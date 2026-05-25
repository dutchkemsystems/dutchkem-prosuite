import { motion } from 'framer-motion';
import { Home, LayoutGrid, CreditCard, MessageCircle, User } from 'lucide-react';

interface MobileNavProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export default function MobileNav({ currentPage, setCurrentPage }: MobileNavProps) {
  const items = [
    { id: 'home', icon: <Home size={20} />, label: 'Home' },
    { id: 'services', icon: <LayoutGrid size={20} />, label: 'Services' },
    { id: 'pricing', icon: <CreditCard size={20} />, label: 'Pricing' },
    { id: 'chat', icon: <MessageCircle size={20} />, label: 'Chat' },
    { id: 'about', icon: <User size={20} />, label: 'More' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 lg:hidden">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 cursor-pointer group"
            >
              <div className={`transition-colors ${isActive ? 'text-coral' : 'text-navy/40 group-hover:text-navy/60'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-coral' : 'text-navy/40'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-coral rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Safe area for iPhone notch */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </div>
  );
}
