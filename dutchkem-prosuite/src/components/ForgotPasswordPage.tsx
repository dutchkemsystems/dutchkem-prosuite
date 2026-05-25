import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface ForgotPasswordPageProps {
  setCurrentPage: (page: string) => void;
}

export default function ForgotPasswordPage({ setCurrentPage }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    // Simulate sending reset email - in production this would call the backend API
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-display font-bold text-navy mb-4">Check Your Email</h2>
            <p className="text-navy/60 mb-6">
              We've sent a password reset link to <span className="font-medium text-navy">{email}</span>.
              Please check your inbox and follow the instructions.
            </p>
            <p className="text-sm text-navy/50 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => setCurrentPage('login')}
              className="w-full py-3 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coral/30 transition-all cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        <button
          onClick={() => setCurrentPage('login')}
          className="flex items-center gap-2 text-navy/60 hover:text-navy mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Sign In</span>
        </button>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-coral" />
            </div>
            <h1 className="text-2xl font-display font-bold text-navy">Forgot Password?</h1>
            <p className="text-navy/60 mt-2">
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coral/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending reset link...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </motion.button>
          </form>

          {/* Back to Login */}
          <p className="text-center text-navy/60 mt-6">
            Remember your password?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="text-coral hover:text-coral-dark font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}