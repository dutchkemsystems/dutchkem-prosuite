import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, MessageCircle, Shield, ChevronDown } from 'lucide-react';
import { categories } from '../data/agents';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  setSelectedCategory: (cat: string) => void;
}

export default function Navbar({ currentPage, setCurrentPage, setSelectedCategory }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications] = useState(3);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2.5 cursor-pointer group">
              <img
                src="/images/dutchkem-logo.png"
                alt="Dutchkem Ventures"
                className="w-11 h-11 object-contain rounded-lg group-hover:scale-105 transition-transform drop-shadow-md"
              />
              <div className="hidden sm:block">
                <p className={`font-display font-bold text-sm leading-tight ${isScrolled ? 'text-navy' : 'text-white'}`}>
                  Dutchkem Ventures
                </p>
                <p className={`text-xs ${isScrolled ? 'text-navy/60' : 'text-white/70'}`}>
                  ProSuite NG+
                </p>
              </div>
            </button>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => {
                      if (item.id === 'services') {
                        setDropdownOpen(!dropdownOpen);
                      } else {
                        setCurrentPage(item.id);
                        setDropdownOpen(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 cursor-pointer ${
                      currentPage === item.id
                        ? isScrolled ? 'text-coral bg-coral/10' : 'text-gold bg-white/10'
                        : isScrolled ? 'text-navy/70 hover:text-navy hover:bg-navy/5' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                    {item.id === 'services' && <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />}
                  </button>

                  {/* Services Dropdown */}
                  {item.id === 'services' && (
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50"
                        >
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setCurrentPage('services');
                                setSelectedCategory(cat.id);
                                setDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-navy hover:bg-cream transition-colors cursor-pointer text-left"
                            >
                              <span className="text-lg">{cat.icon}</span>
                              <span className="font-medium">{cat.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <button className={`relative p-2 rounded-lg transition-colors cursor-pointer ${isScrolled ? 'hover:bg-navy/5' : 'hover:bg-white/10'}`}>
                <Bell size={20} className={isScrolled ? 'text-navy' : 'text-white'} />
                {notifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-coral text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    {notifications}
                  </motion.span>
                )}
              </button>

              {/* Chat */}
              <button
                onClick={() => setCurrentPage('chat')}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${isScrolled ? 'hover:bg-navy/5' : 'hover:bg-white/10'}`}
              >
                <MessageCircle size={20} className={isScrolled ? 'text-navy' : 'text-white'} />
              </button>

              {/* Admin */}
              <button
                onClick={() => setCurrentPage('admin')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isScrolled ? 'text-navy/60 hover:text-navy hover:bg-navy/5' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Shield size={16} />
                <span>Admin</span>
              </button>

              {/* CTA */}
              <button
                onClick={() => setCurrentPage('chat')}
                className="hidden sm:block px-5 py-2.5 bg-gradient-to-r from-coral to-coral-dark text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-coral/30 transition-all cursor-pointer"
              >
                Get Started
              </button>

              {/* Mobile Menu */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`lg:hidden p-2 rounded-lg cursor-pointer ${isScrolled ? 'text-navy' : 'text-white'}`}
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-navy pt-20"
          >
            <div className="p-6 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setMobileOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-white text-lg font-medium rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
              <hr className="border-white/10 my-4" />
              <button
                onClick={() => { setCurrentPage('admin'); setMobileOpen(false); }}
                className="w-full text-left px-4 py-3 text-white/70 text-lg font-medium rounded-xl hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Shield size={20} /> Admin Dashboard
              </button>
              <button
                onClick={() => { setCurrentPage('chat'); setMobileOpen(false); }}
                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-coral to-gold text-white text-lg font-semibold rounded-xl text-center cursor-pointer"
              >
                Get Started — Chat Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
