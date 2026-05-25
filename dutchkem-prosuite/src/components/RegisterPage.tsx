import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Chrome, User, Phone } from 'lucide-react';

interface RegisterPageProps {
  setCurrentPage: (page: string) => void;
}

export default function RegisterPage({ setCurrentPage }: RegisterPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the Terms of Service');
      return;
    }

    setIsLoading(true);

    // Simulate registration - in production this would call the backend API
    setTimeout(() => {
      setIsLoading(false);
      localStorage.setItem('dk_user', JSON.stringify({ email: formData.email, name: formData.name }));
      setCurrentPage('dashboard');
    }, 1500);
  };

  const handleGoogleRegister = () => {
    window.location.href = '/auth/google';
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        <button
          onClick={() => setCurrentPage('home')}
          className="flex items-center gap-2 text-navy/60 hover:text-navy mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-navy">Create Account</h1>
            <p className="text-navy/60 mt-2">Join ProSuite NG+ today</p>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleRegister}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-navy font-medium hover:bg-gray-50 transition-colors cursor-pointer mb-6"
          >
            <Chrome size={20} className="text-coral" />
            <span>Sign up with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-navy/40 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200" />
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

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-navy mb-2">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-navy mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 812 000 0000"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-navy mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-navy/70 cursor-pointer">
                I agree to the{' '}
                <button type="button" onClick={() => setCurrentPage('terms')} className="text-coral hover:text-coral-dark font-medium">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => setCurrentPage('privacy')} className="text-coral hover:text-coral-dark font-medium">
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coral/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>

          {/* Login Link */}
          <p className="text-center text-navy/60 mt-6">
            Already have an account?{' '}
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