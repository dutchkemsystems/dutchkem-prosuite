import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Receipt } from './Receipt'

interface PaymentReceiptGateProps {
  userId: string
  transactionId: string
  amount: number
  service: string
  agent: string
  customerName: string
  customerEmail: string
  onConfirmed: () => void
  onCancel?: () => void
}

export function PaymentReceiptGate({
  userId, transactionId, amount, service, agent, customerName, customerEmail, onConfirmed, onCancel
}: PaymentReceiptGateProps) {
  const [showReceipt, setShowReceipt] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState('')
  const createReceipt = useMutation(api.receipts.createReceipt)

  useEffect(() => {
    const initReceipt = async () => {
      try {
        const result = await createReceipt({
          userId: userId as any,
          transactionId,
          amount,
          service,
          agent,
          customerName,
          customerEmail,
          status: 'completed',
        })
        setReceiptNumber(result.receiptNumber)
        setShowReceipt(true)
      } catch {
        setReceiptNumber(`DKV-${Date.now().toString(36).toUpperCase()}`)
        setShowReceipt(true)
      }
    }
    initReceipt()
  }, [])

  const handleConfirm = () => {
    setConfirmed(true)
    setTimeout(() => onConfirmed(), 500)
  }

  if (!showReceipt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-800 rounded-full mx-auto mb-4 relative">
            <div className="absolute inset-0 border-t-4 border-orange-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400 font-bold text-sm">Generating your receipt...</p>
        </div>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl">✓</div>
          <h2 className="text-2xl font-black text-white mb-2">Receipt Confirmed</h2>
          <p className="text-slate-400 text-sm">Proceeding to your task...</p>
        </div>
      </div>
    )
  }

  return (
    <Receipt
      transactionId={transactionId}
      amount={amount}
      service={service}
      agent={agent}
      date={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      status="completed"
      customerName={customerName}
      customerEmail={customerEmail}
      receiptNumber={receiptNumber}
      onConfirmed={handleConfirm}
    />
  )
}
