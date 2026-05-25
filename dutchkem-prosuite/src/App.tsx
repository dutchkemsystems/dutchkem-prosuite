import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FeaturedSection from './components/FeaturedSection';
import ServicesPage from './components/ServicesPage';
import PricingPage from './components/PricingPage';
import ChatPage from './components/ChatPage';
import AdminDashboard from './components/AdminDashboard';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import LegalPages from './components/LegalPages';
import Footer from './components/Footer';
import FloatingChat from './components/FloatingChat';
import MobileNav from './components/MobileNav';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import UserDashboard from './components/UserDashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const showNavbar = true;
  const showFooter = !['chat', 'admin', 'login', 'register', 'forgot-password', 'dashboard'].includes(currentPage);
  const showFloatingChat = !['chat', 'admin', 'login', 'register', 'forgot-password', 'dashboard'].includes(currentPage);
  const hideMainContent = ['login', 'register', 'forgot-password', 'dashboard'].includes(currentPage);

  return (
    <div className="min-h-screen bg-cream">
      {/* Navbar */}
      {showNavbar && (
        <Navbar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setSelectedCategory={setSelectedCategory}
        />
      )}

      {/* Page Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {currentPage === 'home' && (
            <>
              <HeroSection setCurrentPage={setCurrentPage} />
              <FeaturedSection setCurrentPage={setCurrentPage} />
            </>
          )}

          {currentPage === 'services' && (
            <div className="pt-16">
              <ServicesPage
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                setCurrentPage={setCurrentPage}
              />
            </div>
          )}

          {currentPage === 'pricing' && (
            <div className="pt-16">
              <PricingPage setCurrentPage={setCurrentPage} />
            </div>
          )}

          {currentPage === 'chat' && (
            <ChatPage setCurrentPage={setCurrentPage} />
          )}

          {currentPage === 'admin' && (
            <AdminDashboard setCurrentPage={setCurrentPage} />
          )}

          {currentPage === 'about' && (
            <div className="pt-16">
              <AboutPage />
            </div>
          )}

          {currentPage === 'contact' && (
            <div className="pt-16">
              <ContactPage />
            </div>
          )}

          {currentPage === 'terms' && (
            <div className="pt-16">
              <LegalPages page="terms" />
            </div>
          )}

          {currentPage === 'privacy' && (
            <div className="pt-16">
              <LegalPages page="privacy" />
            </div>
          )}

          {currentPage === 'refund' && (
            <div className="pt-16">
              <LegalPages page="refund" />
            </div>
          )}

          {currentPage === 'login' && (
            <LoginPage setCurrentPage={setCurrentPage} />
          )}

          {currentPage === 'register' && (
            <RegisterPage setCurrentPage={setCurrentPage} />
          )}

          {currentPage === 'forgot-password' && (
            <ForgotPasswordPage setCurrentPage={setCurrentPage} />
          )}

          {currentPage === 'dashboard' && (
            <UserDashboard setCurrentPage={setCurrentPage} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      {showFooter && (
        <>
          <Footer setCurrentPage={setCurrentPage} />
          {/* Mobile nav spacer */}
          <div className="h-16 lg:hidden" />
        </>
      )}

      {/* Floating Chat Widget */}
      {showFloatingChat && <FloatingChat setCurrentPage={setCurrentPage} />}

      {/* Mobile Bottom Navigation */}
      {showFooter && (
        <MobileNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
      )}

      {/* Toast Notification */}
      <ToastNotification />
    </div>
  );
}

function ToastNotification() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed top-20 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-sm flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
            <span className="text-lg">✅</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-navy">All 13 Agents Online</p>
            <p className="text-xs text-navy/50 mt-0.5">
              All AI agents are operational and ready to serve you.
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-navy/30 hover:text-navy cursor-pointer text-lg leading-none"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
