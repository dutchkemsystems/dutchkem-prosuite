import { useState } from 'react'
import { CompanyLogo } from './CompanyLogo'

interface ReceiptProps {
  transactionId: string
  amount: number
  service: string
  agent: string
  date: string
  status: string
  customerName: string
  customerEmail: string
  receiptNumber: string
  onConfirmed?: () => void
}

export function Receipt({ transactionId, amount, service, agent, date, status, customerName, customerEmail, receiptNumber, onConfirmed }: ReceiptProps) {
  const [downloaded, setDownloaded] = useState(false)
  const [emailed, setEmailed] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleDownloadPDF = () => {
    const receiptEl = document.getElementById('receipt-printable')
    if (!receiptEl) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dutchkem Receipt ${receiptNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: white; padding: 40px; }
          .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #800000, #a52a2a); color: white; padding: 30px; text-align: center; }
          .header h1 { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; }
          .header p { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; opacity: 0.8; }
          .body { padding: 30px; }
          .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
          .row:last-child { border-bottom: none; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 600; }
          .value { font-size: 14px; font-weight: 700; color: #111827; text-align: right; }
          .total { background: #f9fafb; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e5e7eb; }
          .total .label { font-size: 14px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 2px; }
          .total .amount { font-size: 28px; font-weight: 900; color: #800000; }
          .footer { padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer p { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; line-height: 1.8; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          @media print { body { padding: 0; } .receipt { border: none; border-radius: 0; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>Dutchkem Ventures</h1>
            <p>ProSuite NG+ — Payment Receipt</p>
            <p style="margin-top: 8px; font-size: 9px; opacity: 0.6;">RC: 9489855 • TIN: 2512403526652</p>
          </div>
          <div class="body">
            <div class="row"><span class="label">Receipt Number</span><span class="value">${receiptNumber}</span></div>
            <div class="row"><span class="label">Transaction ID</span><span class="value">${transactionId}</span></div>
            <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
            <div class="row"><span class="label">Customer</span><span class="value">${customerName}</span></div>
            <div class="row"><span class="label">Email</span><span class="value">${customerEmail}</span></div>
            <div class="row"><span class="label">Agent</span><span class="value">${agent}</span></div>
            <div class="row"><span class="label">Service</span><span class="value">${service}</span></div>
            <div class="row"><span class="label">Status</span><span class="value"><span class="status status-${status}">${status}</span></span></div>
          </div>
          <div class="total">
            <span class="label">Total Paid</span>
            <span class="amount">₦${amount.toLocaleString()}</span>
          </div>
          <div class="footer">
            <p>Thank you for your payment</p>
            <p>This is a computer-generated receipt. No signature required.</p>
            <p style="margin-top: 8px;">Dutchkem Ventures • 26, Opeki Road, Ipaja, Ayobo, Lagos State</p>
            <p>Phone: (+234)-911-339-3525 • Email: contact@dutchkem.com</p>
          </div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      setDownloaded(true)
    }, 500)
  }

  const handleSendEmail = async () => {
    setEmailing(true)
    try {
      // Send receipt via Resend API through Convex
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Dutchkem Ventures <receipts@dutchkem.com>',
          to: [customerEmail],
          subject: `Dutchkem Ventures Receipt #${receiptNumber}`,
          html: `<h2>Payment Receipt</h2><p>Dear ${customerName},</p><p>Thank you for your payment of <strong>₦${amount.toLocaleString()}</strong> for <strong>${service}</strong>.</p><p><strong>Receipt Number:</strong> ${receiptNumber}</p><p><strong>Transaction ID:</strong> ${transactionId}</p><p><strong>Date:</strong> ${date}</p><p><strong>Agent:</strong> ${agent}</p><hr/><p>Dutchkem Ventures ProSuite NG+<br/>RC: 9489855<br/>contact@dutchkem.com</p>`,
        }),
      })
      if (response.ok) {
        setEmailSent(true)
        setEmailed(true)
      } else {
        // Fallback: open email client
        window.open(`mailto:${customerEmail}?subject=Dutchkem Receipt ${receiptNumber}&body=Your receipt for ${service} - Amount: ₦${amount.toLocaleString()}`)
        setEmailSent(true)
        setEmailed(true)
      }
    } catch {
      // Fallback: open email client
      window.open(`mailto:${customerEmail}?subject=Dutchkem Receipt ${receiptNumber}&body=Your receipt for ${service} - Amount: ₦${amount.toLocaleString()}`)
      setEmailSent(true)
      setEmailed(true)
    }
    setEmailing(false)
  }

  const handleConfirm = () => {
    if (onConfirmed) onConfirmed()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-lg mx-4">
        {/* Printable Receipt */}
        <div id="receipt-printable" className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#800000] to-[#a52a2a] p-8 text-center">
            <div className="flex justify-center mb-4">
              <CompanyLogo className="w-24 h-24" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Dutchkem Ventures</h2>
            <p className="text-[10px] text-white/70 uppercase tracking-[0.3em] mt-1">ProSuite NG+ — Payment Receipt</p>
            <p className="text-[9px] text-white/50 mt-2">RC: 9489855 • TIN: 2512403526652</p>
          </div>

          {/* Body */}
          <div className="p-8 space-y-1">
            <ReceiptRow label="Receipt Number" value={receiptNumber} />
            <ReceiptRow label="Transaction ID" value={transactionId} />
            <ReceiptRow label="Date" value={date} />
            <ReceiptRow label="Customer" value={customerName} />
            <ReceiptRow label="Email" value={customerEmail} />
            <ReceiptRow label="Agent" value={agent} />
            <ReceiptRow label="Service" value={service} />
            <ReceiptRow label="Status" value={
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>{status}</span>
            } />
          </div>

          {/* Total */}
          <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-t-2 border-slate-200">
            <span className="text-sm font-black uppercase tracking-widest text-slate-900">Total Paid</span>
            <span className="text-3xl font-black text-[#800000]">₦{amount.toLocaleString()}</span>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 text-center border-t border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Thank you for your payment</p>
            <p className="text-[8px] text-slate-300">This is a computer-generated receipt. No signature required.</p>
            <p className="text-[8px] text-slate-300 mt-1">Dutchkem Ventures • 26, Opeki Road, Ipaja, Ayobo, Lagos State</p>
            <p className="text-[8px] text-slate-300">Phone: (+234)-911-339-3525 • Email: contact@dutchkem.com</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPDF}
              className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                downloaded 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {downloaded ? '✓ Downloaded' : '📥 Download PDF'}
            </button>
            <button 
              onClick={handleSendEmail}
              disabled={emailing || emailSent}
              className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                emailSent 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
              }`}
            >
              {emailSent ? '✓ Sent' : emailing ? 'Sending...' : '📧 Send to Email'}
            </button>
          </div>

          {/* Confirmation Checkbox */}
          {(downloaded || emailed) && (
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <label className="flex items-start gap-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 w-6 h-6 accent-orange-500 rounded"
                  onChange={handleConfirm}
                />
                <div>
                  <p className="text-sm font-bold text-white">I have saved or received my receipt</p>
                  <p className="text-[10px] text-slate-500 mt-1">You must confirm before proceeding to your task</p>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReceiptRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">{label}</span>
      <span className="text-sm font-bold text-slate-900 text-right">{value}</span>
    </div>
  )
}

export function printReceipt() {
  const el = document.getElementById('receipt-printable')
  if (el) {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(el.outerHTML)
      printWindow.document.close()
      printWindow.print()
    }
  }
}
