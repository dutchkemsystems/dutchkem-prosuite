import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  label: string;
}

interface CreditPackagesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditPackages({ isOpen, onClose }: CreditPackagesProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);

  const packages = useQuery(api.credits.getCreditPackages);
  const initiatePayment = useAction(api.agent_payments.initiatePayment);

  const handleSelect = (pkg: CreditPackage) => {
    setSelectedPackage(pkg.id);
    setStep('payment');
    setPaymentError(null);
  };

  const handlePayment = async () => {
    const pkg = packages?.find((p: CreditPackage) => p.id === selectedPackage);
    if (!pkg || !customerName || !customerEmail) {
      setPaymentError('Please fill in your name and email');
      return;
    }

    setLoading(true);
    setPaymentError(null);

    try {
      const result = await initiatePayment({
        agentId: 'credits',
        agentName: 'Credit Purchase',
        planId: pkg.id,
        planName: `${pkg.credits.toLocaleString()} Credits`,
        amount: pkg.price,
        email: customerEmail,
        name: customerName,
      });

      if (result.success && result.checkoutUrl) {
        setReceiptData({
          reference: result.reference,
          amount: pkg.price,
          plan: `${pkg.credits.toLocaleString()} Credits`,
          customerName,
          customerEmail,
        });
        window.location.href = result.checkoutUrl;
      } else {
        setPaymentError(result.error || 'Payment initiation failed. Please try again.');
        setLoading(false);
      }
    } catch (error: any) {
      setPaymentError(error.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white text-xl">✕</button>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['select', 'payment', 'success'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-indigo-600 text-white' :
                ['select', 'payment', 'success'].indexOf(step) > i ? 'bg-emerald-600 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {['select', 'payment', 'success'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-bold capitalize ${
                step === s ? 'text-white' : 'text-slate-500'
              }`}>{s}</span>
              {i < 2 && <div className="w-8 h-px bg-slate-700"></div>}
            </div>
          ))}
        </div>

        {/* Select Step */}
        {step === 'select' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black">💰 Buy Credits</h2>
              <p className="text-slate-400 text-sm mt-1">Select a credit package to add funds to your wallet.</p>
            </div>

            {packages === undefined ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.map((pkg: CreditPackage) => (
                  <button
                    key={pkg.id}
                    onClick={() => handleSelect(pkg)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      selectedPackage === pkg.id
                        ? "bg-indigo-600/20 border-indigo-500"
                        : "bg-slate-800 border-slate-700 hover:border-indigo-500"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-lg">{pkg.credits.toLocaleString()} Credits</span>
                      <span className="text-indigo-400 font-black text-xl">₦{pkg.price.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-400">{pkg.label}</div>
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] text-slate-500 uppercase font-bold text-center">Secured by Kora Pay • PCI DSS Compliant</p>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white">Complete Payment</h3>

            {(() => {
              const pkg = packages?.find((p: CreditPackage) => p.id === selectedPackage);
              if (!pkg) return null;
              return (
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-slate-400">Package: {pkg.credits.toLocaleString()} Credits</div>
                      <div className="text-xs text-slate-500">{pkg.label}</div>
                    </div>
                    <div className="text-2xl font-black text-indigo-400">₦{pkg.price.toLocaleString()}</div>
                  </div>
                </div>
              );
            })()}

            {paymentError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">{paymentError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-400 mb-2 block">Your Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-400 mb-2 block">Email Address</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <button
                onClick={handlePayment}
                disabled={loading || !customerName || !customerEmail}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-white hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Redirecting to Kora Pay...' : `Pay ₦${packages?.find((p: CreditPackage) => p.id === selectedPackage)?.price.toLocaleString()}`}
              </button>

              <button
                onClick={() => setStep('select')}
                className="w-full py-3 bg-slate-800 rounded-xl text-slate-400 text-sm font-bold hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
              >
                ← Back to packages
              </button>

              <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Secured by Kora Pay • PCI DSS Compliant
              </p>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl text-emerald-400 mx-auto border border-emerald-500/20">
              ✓
            </div>
            <h3 className="text-2xl font-black text-white">Payment Successful!</h3>
            <p className="text-slate-400">Your credits have been added to your wallet.</p>

            <div className="bg-slate-800 rounded-xl p-4 text-left">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-500">Receipt #:</span>
                <span className="font-mono text-white">{receiptData?.reference}</span>
                <span className="text-slate-500">Credits:</span>
                <span className="text-white">{receiptData?.plan}</span>
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-indigo-400">₦{receiptData?.amount?.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-white hover:from-orange-600 hover:to-red-600 transition-all"
            >
              Close & Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
