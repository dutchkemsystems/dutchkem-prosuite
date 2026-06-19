import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
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
  const packages = useQuery(api.credits.getCreditPackages);
  const addCredits = useMutation(api.credits.addCredits);

  const handleBuy = async (pkg: { id: string; credits: number; price: number }) => {
    setLoading(true);
    setSelectedPackage(pkg.id);
    try {
      const reference = `credit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const result = await addCredits({
        amount: pkg.credits,
        reference,
      });
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to add credits:', error);
      alert('Failed to process purchase. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white text-xl">✕</button>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-black">💰 Buy Credits</h2>
          <p className="text-slate-400">Select a credit package to add funds to your wallet.</p>
          
          {packages === undefined ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg: CreditPackage) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  disabled={loading}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    selectedPackage === pkg.id
                      ? "bg-indigo-600/20 border-indigo-500"
                      : "bg-slate-800 border-slate-700 hover:border-indigo-500"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{pkg.credits.toLocaleString()} Credits</span>
                    <span className="text-indigo-400 font-black text-xl">₦{pkg.price.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-400">{pkg.label}</div>
                  {selectedPackage === pkg.id && loading && (
                    <div className="mt-2 text-xs text-indigo-300 flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                      Processing purchase...
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {packages !== undefined && selectedPackage && !loading && (
            <button
              onClick={() => {
                const pkg = packages.find((p: CreditPackage) => p.id === selectedPackage);
                if (pkg) handleBuy(pkg);
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
            >
              Buy {packages.find((p: CreditPackage) => p.id === selectedPackage)?.credits.toLocaleString()} Credits
            </button>
          )}
          
          <p className="text-[10px] text-slate-500 uppercase font-bold text-center">Secure payment powered by Kora Pay</p>
        </div>
      </div>
    </div>
  );
}