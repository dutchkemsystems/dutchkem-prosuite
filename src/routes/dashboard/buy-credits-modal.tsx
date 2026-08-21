import { useState } from "react"
import { useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"

export function BuyCreditsModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const createCheckout = useAction(api.kdp_subscriptions.getKDPCheckoutUrl as any);

  const plans = [
    { id: "basic", name: "Basic", price: 8000, period: "monthly", features: ["5 agent tasks/month", "Standard response time", "Email support"] },
    { id: "pro", name: "Pro", price: 25000, period: "monthly", features: ["Unlimited agent tasks", "Priority response", "All 15 agents", "File generation"] },
    { id: "enterprise", name: "Enterprise", price: 80000, period: "yearly", features: ["Everything in Pro", "Custom integrations", "Dedicated support", "API access"] },
  ];

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);
    try {
      const planMap: Record<string, "BASIC" | "PRO" | "ENTERPRISE"> = {
        basic: "BASIC",
        pro: "PRO",
        enterprise: "ENTERPRISE",
      };
      const result = await createCheckout({
        plan: planMap[planId],
        returnUrl: window.location.href,
      });
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (e: any) {
      console.error("Checkout failed:", e);
      alert("Failed to initiate checkout. Please try again.");
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black">💳 Subscribe to ProSuite</h2>
      <p className="text-slate-400">Choose a plan to unlock all 15 AI agents and premium features.</p>
      <div className="space-y-3">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => handleSubscribe(plan.id)}
            disabled={loading}
            className={`w-full p-4 rounded-2xl border text-left transition-all ${
              selectedPlan === plan.id
                ? "bg-indigo-600/20 border-indigo-500"
                : "bg-slate-800 border-slate-700 hover:border-indigo-500"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-lg">{plan.name}</span>
              <span className="text-indigo-400 font-black text-xl">₦{plan.price.toLocaleString()}<span className="text-xs text-slate-400">/{plan.period}</span></span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {f}
                </div>
              ))}
            </div>
            {selectedPlan === plan.id && loading && (
              <div className="mt-2 text-xs text-indigo-300 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                Redirecting to Kora Pay...
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 uppercase font-bold text-center">Secure payment powered by Kora Pay</p>
    </div>
  );
}
