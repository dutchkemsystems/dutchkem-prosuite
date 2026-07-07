import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface PackageSelectionProps {
  agentId: string
  userId: string
  customerEmail?: string
  customerName?: string
  onPurchaseInitiated?: (checkoutUrl: string) => void
}

export function PackageSelection({ agentId, userId, customerEmail, customerName, onPurchaseInitiated }: PackageSelectionProps) {
  const packages = useQuery(api.agent_packages.getAgentPackages, { agentId })
  const initiatePurchase = useMutation(api.agent_packages.initiateAgentPackagePurchase)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId)
    setError(null)

    try {
      const result = await initiatePurchase({
        userId,
        agentId,
        packageId,
        customerEmail,
        customerName,
      })

      if (result.success && result.checkoutUrl) {
        onPurchaseInitiated?.(result.checkoutUrl)
        window.open(result.checkoutUrl, "_blank")
      } else {
        setError(result.error || "Failed to initiate payment")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  if (!packages || packages.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Available Packages</p>
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className="bg-slate-800/50 border border-white/10 rounded-xl p-3 hover:border-orange-500/30 transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-white">{pkg.name}</p>
            <p className="text-xs font-black text-orange-400">
              {pkg.price.toLocaleString()} NGN
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">{pkg.description}</p>
          <button
            onClick={() => handlePurchase(pkg.id)}
            disabled={loading !== null}
            className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50"
          >
            {loading === pkg.id ? "Processing..." : "Select & Pay"}
          </button>
        </div>
      ))}
      {error && (
        <p className="text-[10px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}