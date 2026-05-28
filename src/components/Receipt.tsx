import { CompanyLogo } from './CompanyLogo'

interface ReceiptProps {
  transactionId: string
  amount: number
  service: string
  agent: string
  date: string
  status: string
  customerName?: string
  customerEmail?: string
}

export function Receipt({ transactionId, amount, service, agent, date, status, customerName, customerEmail }: ReceiptProps) {
  return (
    <div className="bg-white text-black p-8 max-w-md mx-auto rounded-2xl shadow-2xl print:shadow-none print:max-w-full" id="receipt">
      {/* Header */}
      <div className="text-center border-b-2 border-slate-200 pb-6 mb-6">
        <div className="flex justify-center mb-4">
          <CompanyLogo className="w-20 h-20" />
        </div>
        <h2 className="text-xl font-black tracking-tight">Dutchkem Ventures</h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">ProSuite NG+ — Payment Receipt</p>
        <p className="text-[9px] text-slate-400 mt-1">RC: 9489855 • TIN: 2512403526652</p>
      </div>

      {/* Receipt Details */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-widest">Receipt No</span>
          <span className="text-sm font-black text-slate-900">{transactionId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-widest">Date</span>
          <span className="text-sm font-bold text-slate-700">{date}</span>
        </div>
        {customerName && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 uppercase tracking-widest">Customer</span>
            <span className="text-sm font-bold text-slate-700">{customerName}</span>
          </div>
        )}
        {customerEmail && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 uppercase tracking-widest">Email</span>
            <span className="text-sm font-bold text-slate-700">{customerEmail}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-widest">Agent</span>
          <span className="text-sm font-bold text-slate-700">{agent}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-widest">Service</span>
          <span className="text-sm font-bold text-slate-700">{service}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-widest">Status</span>
          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
            status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
            status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
          }`}>{status}</span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t-2 border-slate-200 pt-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm font-black uppercase tracking-widest text-slate-900">Total Paid</span>
          <span className="text-2xl font-black text-[#800000]">₦{amount.toLocaleString()}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t border-slate-200 pt-4">
        <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-2">Thank you for your payment</p>
        <p className="text-[8px] text-slate-300">This is a computer-generated receipt. No signature required.</p>
        <p className="text-[8px] text-slate-300 mt-1">Dutchkem Ventures • 26, Opeki Road, Ipaja, Ayobo, Lagos State</p>
        <p className="text-[8px] text-slate-300">Phone: (+234)-911-339-3525 • Email: contact@dutchkem.com</p>
      </div>
    </div>
  )
}

export function printReceipt() {
  window.print()
}
