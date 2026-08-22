import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

interface LiveTransferPanelProps {
  banks: any[];
  passkeyModal: {
    show: boolean;
    setShow: (v: boolean) => void;
    code: string;
    setCode: (v: string) => void;
    generated: string;
    passkeyId: string;
    setPasskeyId: (v: string) => void;
    setGenerated: (v: string) => void;
  };
  receipt: {
    show: boolean;
    setShow: (v: boolean) => void;
    data: any;
    setData: (v: any) => void;
  };
  transferStatus: { message: string; type: string } | null;
  setTransferStatus: (v: { message: string; type: string } | null) => void;
  setSweepStatus: (v: { message: string; type: string } | null) => void;
}

export function LiveTransferPanel({
  banks,
  passkeyModal,
  receipt: receiptState,
  transferStatus,
  setTransferStatus,
  setSweepStatus,
}: LiveTransferPanelProps) {
  const executeDirectTransfer = useAction(api.fintech.executeDirectTransfer);
  const resolveBankAccount = useAction(api.fintech.resolveBankAccount);
  const generatePasskey = useMutation(api.secure_sweeps.generatePasskey);

  const [transferAmount, setTransferAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [resolving, setResolving] = useState(false);

  const handleResolveAccount = async () => {
    if (!selectedBank || !recipientAccount || recipientAccount.length < 10) {
      setTransferStatus({ message: "Enter valid bank and 10-digit account number", type: "error" });
      return;
    }
    setResolving(true);
    setTransferStatus({ message: "Resolving account...", type: "loading" });
    try {
      const result = await resolveBankAccount({ bankCode: selectedBank, accountNumber: recipientAccount });
      if (result?.success) {
        setRecipientName(result.accountName);
        setTransferStatus({ message: `Account resolved: ${result.accountName}`, type: "success" });
      } else {
        setRecipientName("");
        setTransferStatus({ message: result?.error || "Account resolution failed", type: "error" });
      }
    } catch (err: any) {
      setTransferStatus({ message: err.message, type: "error" });
    }
    setResolving(false);
  };

  const handleInitiateTransfer = async () => {
    if (!selectedBank || !recipientAccount || !transferAmount || !recipientName) {
      setTransferStatus({ message: "Please fill all fields and resolve account", type: "error" });
      return;
    }
    setTransferStatus({ message: "Generating passkey for transfer...", type: "loading" });
    try {
      const pkResult = await generatePasskey({});
      if (!pkResult?.success) {
        setTransferStatus({ message: "Failed to generate passkey", type: "error" });
        return;
      }
      passkeyModal.setPasskeyId(pkResult.passkeyId);
      passkeyModal.setGenerated(pkResult.passkey);
      passkeyModal.setCode(pkResult.passkey);
      setTransferStatus({ message: "Passkey generated! Enter it below to confirm transfer.", type: "success" });
      passkeyModal.setShow(true);
    } catch (err: any) {
      setTransferStatus({ message: err.message, type: "error" });
    }
  };

  const handleVerifyPasskeyAndTransfer = async () => {
    if (passkeyModal.code !== passkeyModal.generated) {
      setTransferStatus({ message: "Invalid passkey", type: "error" });
      return;
    }
    passkeyModal.setShow(false);
    setTransferStatus({ message: "Executing transfer via Kora Pay API...", type: "loading" });
    try {
      const result = await executeDirectTransfer({
        amount: parseFloat(transferAmount),
        bankCode: selectedBank,
        bankName: banks?.find((b: any) => b.code === selectedBank)?.name || selectedBank,
        accountNumber: recipientAccount,
        accountName: recipientName,
        purpose: `Transfer to ${recipientName}`,
        passkeyId: passkeyModal.passkeyId,
        passkey: passkeyModal.code,
      });
      if (result?.success) {
        receiptState.setData(result.receipt);
        receiptState.setShow(true);
        setTransferStatus({ message: "Transfer completed successfully!", type: "success" });
        passkeyModal.setCode("");
        setTransferAmount("");
        setRecipientAccount("");
        setRecipientName("");
        setSelectedBank("");
      } else {
        setTransferStatus({ message: result?.error || "Transfer failed", type: "error" });
      }
    } catch (err: any) {
      setTransferStatus({ message: err.message, type: "error" });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
      <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Live Transfer (Kora Pay API)</h3>

      {transferStatus && (
        <div className={`mb-6 p-4 rounded-2xl text-center text-sm font-black ${
          transferStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          transferStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          transferStatus.type === "otp" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {transferStatus.message}
        </div>
      )}

      {!passkeyModal.show && !receiptState.show && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Bank</label>
              <select
                value={selectedBank}
                onChange={(e) => { setSelectedBank(e.target.value); setRecipientName(""); }}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
              >
                <option value="">-- Select Bank --</option>
                {banks?.map((bank: any) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.icon} {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Account Number</label>
              <input
                type="text"
                value={recipientAccount}
                onChange={(e) => { setRecipientAccount(e.target.value); setRecipientName(""); }}
                placeholder="10-digit account"
                maxLength={10}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Account Name</label>
              <div className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm">
                {resolving ? "Resolving..." : recipientName || "Auto-resolved"}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleResolveAccount}
                disabled={!selectedBank || !recipientAccount || recipientAccount.length < 10 || resolving}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {resolving ? "..." : "🔍 Resolve"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Amount (₦)</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleInitiateTransfer}
                disabled={!selectedBank || !recipientAccount || !transferAmount || !recipientName}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                Generate Passkey & Initiate Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {passkeyModal.show && (
        <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h4 className="text-lg font-black text-white">Passkey Verification</h4>
            <p className="text-sm text-slate-500 mt-2">
              Enter the 6-digit passkey below to confirm this transfer.
            </p>
            {passkeyModal.generated && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Your Passkey:</p>
                <p className="text-3xl font-mono font-black text-emerald-400 tracking-[0.3em]">{passkeyModal.generated}</p>
                <p className="text-[10px] text-slate-500 mt-2">Expires in 10 minutes</p>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <input
              type="text"
              value={passkeyModal.code}
              onChange={(e) => passkeyModal.setCode(e.target.value)}
              maxLength={6}
              placeholder="000000"
              className="w-48 bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-2xl text-center font-mono tracking-[0.5em]"
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => { passkeyModal.setShow(false); passkeyModal.setCode(""); }}
              className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyPasskeyAndTransfer}
              disabled={passkeyModal.code.length !== 6}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              Verify & Execute Transfer
            </button>
          </div>
        </div>
      )}

      {receiptState.show && receiptState.data && (
        <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h4 className="text-lg font-black text-emerald-500">Transfer Successful!</h4>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Reference</span>
              <span className="text-white font-mono">{receiptState.data.reference}</span>
            </div>
            {receiptState.data.koraReference && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kora Ref</span>
                <span className="text-white font-mono text-[10px]">{receiptState.data.koraReference}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount</span>
              <span className="text-white font-bold">₦{receiptState.data.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">To</span>
              <span className="text-white">{receiptState.data.to}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Account</span>
              <span className="text-white font-mono">{receiptState.data.accountNumber || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Purpose</span>
              <span className="text-white">{receiptState.data.purpose || "Transfer"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date</span>
              <span className="text-white">{new Date(receiptState.data.date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Balance Before</span>
              <span className="text-white">₦{receiptState.data.balanceBefore?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Balance After</span>
              <span className="text-emerald-500 font-bold">₦{receiptState.data.balanceAfter?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className="text-emerald-500 font-bold">{receiptState.data.status.toUpperCase()}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                const r = receiptState.data;
                const content = `DUTCHKEM VENTURES - TRANSFER RECEIPT\n${"=".repeat(50)}\n\nReference: ${r.reference}\nKora Ref: ${r.koraReference || "N/A"}\nAmount: ₦${r.amount.toLocaleString()}\nTo: ${r.to}\nAccount: ${r.accountNumber || "N/A"}\nPurpose: ${r.purpose || "Transfer"}\nDate: ${new Date(r.date).toLocaleString()}\nBalance Before: ₦${r.balanceBefore?.toLocaleString()}\nBalance After: ₦${r.balanceAfter?.toLocaleString()}\nStatus: ${r.status.toUpperCase()}\n\n${"=".repeat(50)}\nDutchkem Ventures ProSuite NG+\nSecure Transfer powered by Kora Pay`;
                const blob = new Blob([content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `receipt-${r.reference}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
            >
              📄 Download Receipt
            </button>
            <button
              onClick={() => {
                receiptState.setShow(false);
                receiptState.setData(null);
                setTransferAmount("");
                setSelectedBank("");
                setRecipientAccount("");
                setRecipientName("");
              }}
              className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
