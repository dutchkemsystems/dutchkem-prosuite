// Finance panels extracted from admin/dashboard.tsx
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MetricCard } from "./shared";

// DailySweepStatusPanel (lines 874-1442)
function DailySweepStatusPanel({ adminToken }: { adminToken: string }) {
   const { data: settings } = useSuspenseQuery(convexQuery(api.secure_sweeps.getSettings, {})) as { data: any };
   const { data: sweepHistory } = useSuspenseQuery(convexQuery(api.secure_sweeps.getHistory, { limit: 10 })) as { data: any };
   const { data: sweepStats } = useSuspenseQuery(convexQuery(api.secure_sweeps.getSweepStats, {})) as { data: any };
   const { data: beneficiaries } = useSuspenseQuery(convexQuery(api.payouts.getBeneficiaries, {})) as { data: any };
   const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {})) as { data: any };
   const { data: banks } = useSuspenseQuery(convexQuery(api.fintech.getAvailableBanks, {})) as { data: any };
   
   const updateSettings = useMutation(api.secure_sweeps.updateSettings);
   const performSweep = useMutation(api.secure_sweeps.performSweep);
   const executeDirectTransfer = useAction(api.fintech.executeDirectTransfer);
   const resolveBankAccount = useAction(api.fintech.resolveBankAccount);
   const generatePasskey = useMutation(api.secure_sweeps.generatePasskey);
   const initiateDirectTransfer = useMutation(api.fintech.initiateDirectTransfer);
   const verifyDirectTransferOTP = useMutation(api.fintech.verifyDirectTransferOTP);
   
   const [sweeping, setSweeping] = useState(false);
   const [sweepStatus, setSweepStatus] = useState<{ message: string; type: string } | null>(null);
   const [manualSweepAmount, setManualSweepAmount] = useState("");
   const [sweepRemarks, setSweepRemarks] = useState("");
   
   // Transfer states
   const [transferAmount, setTransferAmount] = useState("");
   const [selectedBank, setSelectedBank] = useState("");
   const [recipientAccount, setRecipientAccount] = useState("");
   const [recipientName, setRecipientName] = useState("");
   const [resolving, setResolving] = useState(false);
   const [transferStatus, setTransferStatus] = useState<{ message: string; type: string } | null>(null);
   
   // Passkey states
   const [showPasskeyModal, setShowPasskeyModal] = useState(false);
   const [passkeyCode, setPasskeyCode] = useState("");
   const [passkeyId, setPasskeyId] = useState("");
   const [generatedPasskey, setGeneratedPasskey] = useState("");
   
    // OTP states — transfer requires OTP email verification before execution
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [otpId, setOtpId] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
   
   // Receipt
   const [showReceipt, setShowReceipt] = useState(false);
   const [receipt, setReceipt] = useState<any>(null);

   // Resolve bank account
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

    // Generate passkey for sweep
    const handleGeneratePasskey = async () => {
      try {
         const result = await generatePasskey({});
         if (result?.success) {
            setPasskeyId(result.passkeyId);
            setGeneratedPasskey(result.passkey);
            setPasskeyCode(result.passkey); // Auto-fill the passkey
         }
      } catch (err: any) {
         setSweepStatus({ message: err.message, type: "error" });
      }
    };

    // Initiate transfer — generates passkey and shows it on screen
    const handleInitiateTransfer = async () => {
      if (!selectedBank || !recipientAccount || !transferAmount || !recipientName) {
         setTransferStatus({ message: "Please fill all fields and resolve account", type: "error" });
         return;
      }

      setTransferStatus({ message: "Generating passkey for transfer...", type: "loading" });
      try {
         // Generate passkey first
         const pkResult = await generatePasskey({});
         if (!pkResult?.success) {
            setTransferStatus({ message: "Failed to generate passkey", type: "error" });
            return;
         }
         setPasskeyId(pkResult.passkeyId);
         setGeneratedPasskey(pkResult.passkey);
         setPasskeyCode(pkResult.passkey); // Auto-fill the passkey
         setTransferStatus({ message: "Passkey generated! Enter it below to confirm transfer.", type: "success" });
         setShowPasskeyModal(true);
      } catch (err: any) {
         setTransferStatus({ message: err.message, type: "error" });
      }
    };

     // Verify passkey and execute transfer via Kora Pay API
     const handleVerifyPasskeyAndTransfer = async () => {
       if (passkeyCode !== generatedPasskey) {
          setTransferStatus({ message: "Invalid passkey", type: "error" });
          return;
       }

       setShowPasskeyModal(false);
       setTransferStatus({ message: "Executing transfer via Kora Pay API...", type: "loading" });
       try {
          const result = await executeDirectTransfer({
             amount: parseFloat(transferAmount),
             bankCode: selectedBank,
             bankName: banks?.find((b: any) => b.code === selectedBank)?.name || selectedBank,
             accountNumber: recipientAccount,
             accountName: recipientName,
             purpose: `Transfer to ${recipientName}`,
             passkeyId,
             passkey: passkeyCode,
          });

          if (result?.success) {
             setReceipt(result.receipt);
             setShowReceipt(true);
             setTransferStatus({ message: "Transfer completed successfully!", type: "success" });
             setPasskeyCode("");
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

   const handleAutoSweepToggle = async () => {
      const newState = !settings?.autoSweep;
      await updateSettings({ autoSweep: newState });
      setSweepStatus({ message: `Auto Sweep ${newState ? "enabled" : "disabled"}`, type: "success" });
      setTimeout(() => setSweepStatus(null), 3000);
   };

   const handlePauseSchedule = async () => {
      const newState = !settings?.pauseSchedule;
      await updateSettings({ pauseSchedule: newState });
      setSweepStatus({ message: `Schedule ${newState ? "paused" : "resumed"}`, type: "success" });
      setTimeout(() => setSweepStatus(null), 3000);
   };

   const handleManualSweep = async () => {
      // Generate passkey first
      const pkResult = await generatePasskey({});
      if (!pkResult?.success) {
         setSweepStatus({ message: "Failed to generate passkey", type: "error" });
         return;
      }
      setPasskeyId(pkResult.passkeyId);
      setGeneratedPasskey(pkResult.passkey);
      setShowPasskeyModal(true);
   };

   const handleConfirmManualSweep = async () => {
      if (passkeyCode !== generatedPasskey) {
         setSweepStatus({ message: "Invalid passkey", type: "error" });
         return;
      }

      setShowPasskeyModal(false);
      setSweeping(true);
      setSweepStatus({ message: "Processing sweep with Kora Pay...", type: "loading" });
      try {
         const amount = manualSweepAmount ? parseFloat(manualSweepAmount) : undefined;
         const result = await performSweep({
            type: "manual",
            amount,
            passkeyId,
            passkey: passkeyCode,
            remarks: sweepRemarks || undefined,
         });
         if (result?.success) {
            setReceipt(result.receipt);
            setShowReceipt(true);
            setSweepStatus({ message: `Sweep completed! ₦${result.amount?.toLocaleString()} transferred.`, type: "success" });
         } else {
            setSweepStatus({ message: result?.error || "Sweep failed", type: "error" });
         }
      } catch (err: any) { 
         setSweepStatus({ message: err.message, type: "error" });
      }
      setSweeping(false);
      setTimeout(() => setSweepStatus(null), 5000);
   };
   
   return (
      <div className="space-y-10 ">
         {/* Status Banner */}
         {sweepStatus && (
            <div className={`p-4 rounded-2xl text-center text-sm font-black ${
               sweepStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
               sweepStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
               "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            }`}>
               {sweepStatus.message}
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Sweep Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 space-y-8 shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Daily Secure Sweep</h3>
                  <span className="px-4 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black">LIVE KORA PAY</span>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Scheduled Time</p>
                     <p className="text-xl font-black text-white">{settings?.sweepTime || "22:00"} WAT</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Main Wallet</p>
                     <p className="text-xl font-black text-emerald-500">₦{(earnings?.walletBalance || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today Swept</p>
                     <p className="text-xl font-black text-white">₦{(sweepStats?.today?.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">This Month</p>
                     <p className="text-xl font-black text-white">₦{(sweepStats?.month?.amount || 0).toLocaleString()}</p>
                  </div>
               </div>

               {/* Manual Sweep Amount */}
               <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Manual Sweep Amount</p>
                  <div className="flex gap-3">
                     <input
                        type="number"
                        value={manualSweepAmount}
                        onChange={(e) => setManualSweepAmount(e.target.value)}
                        placeholder="Enter amount to sweep"
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                     />
                     <button
                        onClick={handleManualSweep}
                        disabled={!manualSweepAmount || parseFloat(manualSweepAmount) <= 0 || sweeping}
                        className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                     >
                        {sweeping ? "..." : "Apply"}
                     </button>
                  </div>
                  <input
                     type="text"
                     value={sweepRemarks}
                     onChange={(e) => setSweepRemarks(e.target.value)}
                     placeholder="Remarks (optional)"
                     className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                  />
                  <p className="text-[8px] text-slate-600">Enter amount and click Apply to sweep immediately via Kora Pay</p>
               </div>

               {/* Sweep Info */}
               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black border-b border-white/5 pb-2">
                     <span className="text-slate-500 uppercase">DESTINATION</span>
                     <span className="text-white uppercase">{beneficiaries?.[0]?.bankName || "OPAY"} (••••••{beneficiaries?.[0]?.encryptedAccountNumber?.slice(-4) || "1202"})</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black">
                     <span className="text-slate-500 uppercase">PAYOUT FREQUENCY</span>
                     <span className="text-white uppercase">DAILY ({settings?.sweepTime || "11 PM"})</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black">
                     <span className="text-slate-500 uppercase">STATUS</span>
                     <span className={`uppercase ${settings?.autoSweep ? "text-emerald-500" : "text-amber-500"}`}>
                        {settings?.pauseSchedule ? "PAUSED" : settings?.autoSweep ? "ACTIVE" : "MANUAL"}
                     </span>
                  </div>
               </div>

               {/* Control Buttons */}
               <div className="space-y-4">
                  <div className="flex gap-4">
                     <button 
                        onClick={handleAutoSweepToggle}
                        className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                           settings?.autoSweep 
                              ? "bg-emerald-600 text-white" 
                              : "bg-slate-800 border border-slate-700 text-white"
                        }`}
                     >
                        {settings?.autoSweep ? "Auto Sweep ON" : "Auto Sweep OFF"}
                     </button>
                     <button 
                        onClick={handlePauseSchedule}
                        className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                           settings?.pauseSchedule 
                              ? "bg-amber-600 text-white" 
                              : "bg-slate-800 border border-slate-700 text-white"
                        }`}
                     >
                        {settings?.pauseSchedule ? "Resume" : "Pause"}
                     </button>
                  </div>
                  <button 
                     onClick={handleManualSweep}
                     disabled={sweeping}
                     className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                  >
                     {sweeping ? "Processing with Kora Pay..." : "Sweep Now (Live Transfer)"}
                  </button>
               </div>
            </div>

            {/* Sweep History */}
            <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
               <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Payout History</h3>
               <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {sweepHistory?.length === 0 ? (
                     <p className="text-slate-500 text-sm text-center py-10">No sweeps performed yet. Use Manual Sweep to start.</p>
                  ) : (
                     sweepHistory?.map((sweep: any) => (
                        <div key={sweep.id} className="bg-slate-950 p-6 rounded-2xl border border-white/5 flex justify-between items-center">
                           <div>
                              <p className="text-sm font-black text-white">₦{sweep.amount.toLocaleString()}</p>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                 {sweep.type} • {sweep.date}
                              </p>
                              {sweep.reference && (
                                 <p className="text-[8px] font-mono text-slate-600 mt-1">{sweep.reference}</p>
                              )}
                           </div>
                           <span className={`text-xs font-bold ${sweep.status === "completed" ? "text-emerald-500" : sweep.status === "failed" ? "text-red-500" : "text-amber-500"}`}>
                              {sweep.status === "completed" ? "✓ DONE" : sweep.status === "failed" ? "✗ FAIL" : "⏳ PENDING"}
                           </span>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>

         {/* Live Transfer Section */}
         <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Live Transfer (Kora Pay API)</h3>
            
            {/* Transfer Status */}
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

             {/* Transfer Form */}
              {!showPasskeyModal && !showReceipt && (
               <div className="space-y-6">
                  {/* Bank and Account Row */}
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

                  {/* Amount Row */}
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

            {/* Passkey Modal */}
             {showPasskeyModal && (
                <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
                   <div className="text-center">
                      <div className="text-4xl mb-4">🔐</div>
                      <h4 className="text-lg font-black text-white">Passkey Verification</h4>
                      <p className="text-sm text-slate-500 mt-2">
                         Enter the 6-digit passkey below to confirm this transfer.
                      </p>
                      {generatedPasskey && (
                         <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                            <p className="text-xs text-slate-400 mb-1">Your Passkey:</p>
                            <p className="text-3xl font-mono font-black text-emerald-400 tracking-[0.3em]">{generatedPasskey}</p>
                            <p className="text-[10px] text-slate-500 mt-2">Expires in 10 minutes</p>
                         </div>
                      )}
                   </div>
                   <div className="flex justify-center">
                      <input
                         type="text"
                         value={passkeyCode}
                         onChange={(e) => setPasskeyCode(e.target.value)}
                         maxLength={6}
                         placeholder="000000"
                         className="w-48 bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-2xl text-center font-mono tracking-[0.5em]"
                      />
                   </div>
                   <div className="flex gap-4">
                      <button 
                         onClick={() => { setShowPasskeyModal(false); setPasskeyCode(""); }}
                         className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
                      >
                         Cancel
                      </button>
                      <button 
                         onClick={handleVerifyPasskeyAndTransfer}
                         disabled={passkeyCode.length !== 6}
                         className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                         Verify & Execute Transfer
                      </button>
                   </div>
                </div>
             )}

            {/* Receipt Display */}
            {showReceipt && receipt && (
               <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
                  <div className="text-center">
                     <div className="text-4xl mb-4">✅</div>
                     <h4 className="text-lg font-black text-emerald-500">Transfer Successful!</h4>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-xl space-y-3">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Reference</span>
                        <span className="text-white font-mono">{receipt.reference}</span>
                     </div>
                     {receipt.koraReference && (
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Kora Ref</span>
                           <span className="text-white font-mono text-[10px]">{receipt.koraReference}</span>
                        </div>
                     )}
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Amount</span>
                        <span className="text-white font-bold">₦{receipt.amount.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">To</span>
                        <span className="text-white">{receipt.to}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Account</span>
                        <span className="text-white font-mono">{receipt.accountNumber || "N/A"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Purpose</span>
                        <span className="text-white">{receipt.purpose || "Transfer"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Date</span>
                        <span className="text-white">{new Date(receipt.date).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Balance Before</span>
                        <span className="text-white">₦{receipt.balanceBefore?.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Balance After</span>
                        <span className="text-emerald-500 font-bold">₦{receipt.balanceAfter?.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className="text-emerald-500 font-bold">{receipt.status.toUpperCase()}</span>
                     </div>
                  </div>
                  {/* Download Buttons */}
                  <div className="flex gap-4">
                     <button 
                        onClick={() => {
                           const content = `DUTCHKEM VENTURES - TRANSFER RECEIPT\n${"=".repeat(50)}\n\nReference: ${receipt.reference}\nKora Ref: ${receipt.koraReference || "N/A"}\nAmount: ₦${receipt.amount.toLocaleString()}\nTo: ${receipt.to}\nAccount: ${receipt.accountNumber || "N/A"}\nPurpose: ${receipt.purpose || "Transfer"}\nDate: ${new Date(receipt.date).toLocaleString()}\nBalance Before: ₦${receipt.balanceBefore?.toLocaleString()}\nBalance After: ₦${receipt.balanceAfter?.toLocaleString()}\nStatus: ${receipt.status.toUpperCase()}\n\n${"=".repeat(50)}\nDutchkem Ventures ProSuite NG+\nSecure Transfer powered by Kora Pay`;
                           const blob = new Blob([content], { type: "text/plain" });
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement("a");
                           a.href = url;
                           a.download = `receipt-${receipt.reference}.txt`;
                           a.click();
                           URL.revokeObjectURL(url);
                        }}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                     >
                        📄 Download Receipt
                     </button>
                     <button 
                        onClick={() => { setShowReceipt(false); setReceipt(null); setTransferAmount(""); setSelectedBank(""); setRecipientAccount(""); setRecipientName(""); }}
                        className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
                     >
                        Done
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}


// CharityDashboardPanel (lines 2025-2244)
function CharityDashboardPanel() {
  const { data: settings } = useSuspenseQuery(convexQuery(api.charity.getSettings, {})) as { data: any };
  const { data: titheHistory } = useSuspenseQuery(convexQuery(api.charity.getHistory, { limit: 10 })) as { data: any };
  const { data: charities } = useSuspenseQuery(convexQuery(api.charity.getCharities, {})) as { data: any };
  const { data: charityStats } = useSuspenseQuery(convexQuery(api.charity.getCharityAdminStats, {})) as { data: any };
  
  const updateSettings = useMutation(api.charity.updateSettings);
  const performTithe = useMutation(api.charity.performTithe);
  const [titheStatus, setTitheStatus] = useState<{ message: string; type: string } | null>(null);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [titheAmount, setTitheAmount] = useState("");
  const [autoTithe, setAutoTithe] = useState(settings?.autoTithe || false);
  const [pauseTithe, setPauseTithe] = useState(settings?.pauseTithe || false);
  const [tithePercentage, setTithePercentage] = useState(settings?.tithePercentage || 10);

  const handleAutoTithe = async () => {
    const newState = !autoTithe;
    await updateSettings({ autoTithe: newState });
    setAutoTithe(newState);
    setTitheStatus({ message: `Auto Tithe ${newState ? "enabled" : "disabled"} (${tithePercentage}% of earnings)`, type: "success" });
    setTimeout(() => setTitheStatus(null), 3000);
  };

  const handlePauseTithe = async () => {
    const newState = !pauseTithe;
    await updateSettings({ pauseTithe: newState });
    setPauseTithe(newState);
    setTitheStatus({ message: `Tithe ${newState ? "paused" : "resumed"}`, type: "success" });
    setTimeout(() => setTitheStatus(null), 3000);
  };

  const handleManualTithe = async () => {
    if (!selectedCharity) {
      alert("Please select a charity");
      return;
    }
    
    setTitheStatus({ message: "Processing tithe...", type: "loading" });
    const result = await performTithe({ 
      type: "manual",
      charityId: selectedCharity,
      amount: titheAmount ? parseFloat(titheAmount) : undefined,
    });
    
    if (result?.success) {
      setTitheStatus({ message: `Tithe of ₦${result.amount?.toLocaleString()} sent to ${result.charityName}!`, type: "success" });
      setTitheAmount("");
    } else {
      setTitheStatus({ message: result?.error || "Tithe failed", type: "error" });
    }
    setTimeout(() => setTitheStatus(null), 5000);
  };

  const handlePercentageChange = async (newPercent: number) => {
    setTithePercentage(newPercent);
    await updateSettings({ tithePercentage: newPercent });
  };

  const wallet = charityStats?.wallet;

  return (
    <div className="space-y-10 ">
      {/* Status Banner */}
      {titheStatus && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          titheStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          titheStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {titheStatus.message}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Charity Tithe / Offering</h2>
              <p className="text-sm font-black text-amber-500 uppercase tracking-widest">Support charitable causes with automated or manual transfers</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Charity Balance" value={`₦${(wallet?.balance || 0).toLocaleString()}`} icon="🕊️" color="amber" subValue={pauseTithe ? "PAUSED" : "Active"} />
            <MetricCard label="Monthly Earnings" value={`₦${(wallet?.monthlyEarningsSoFar || 0).toLocaleString()}`} icon="💰" color="emerald" subValue={`${wallet?.currentMonth || ""}`} />
            <MetricCard label={`Tithe (${tithePercentage}%)`} value={`₦${((wallet?.monthlyEarningsSoFar || 0) * (tithePercentage / 100)).toLocaleString()}`} icon="🎯" color="blue" />
            <MetricCard label="Lifetime Set Aside" value={`₦${(wallet?.totalSetAsideLifetime || 0).toLocaleString()}`} icon="📈" color="indigo" subValue={`Transferred: ₦${(wallet?.totalTransferred || 0).toLocaleString()}`} />
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Auto Tithe Toggle */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">🤖 Auto Tithe</p>
              <button 
                onClick={handleAutoTithe}
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  autoTithe 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {autoTithe ? "✅ Auto Tithe ON" : "⭕ Auto Tithe OFF"}
              </button>
              <p className="text-[8px] text-slate-500">Automatically sends {tithePercentage}% of earnings</p>
            </div>

            {/* Pause Tithe */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">⏸️ Pause Tithe</p>
              <button 
                onClick={handlePauseTithe}
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  pauseTithe 
                    ? "bg-amber-600 text-white" 
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {pauseTithe ? "▶️ Resume Tithe" : "⏸️ Pause Tithe"}
              </button>
              <p className="text-[8px] text-slate-500">Temporarily pause automated transfers</p>
            </div>

            {/* Percentage Slider */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">📊 Percentage: {tithePercentage}%</p>
              <input
                type="range"
                min="1"
                max="50"
                value={tithePercentage}
                onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500">
                <span>1%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Manual Tithe Section */}
          <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">✋ Manual Transfer Now</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Select Charity</label>
                <select 
                  value={selectedCharity} 
                  onChange={(e) => setSelectedCharity(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                >
                  <option value="">-- Select Charity --</option>
                  {charities?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="Optional - uses percentage if empty"
                  value={titheAmount}
                  onChange={(e) => setTitheAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleManualTithe}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  💸 Send Tithe Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tithe History */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Tithe History</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {titheHistory?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No tithes recorded yet. Use Manual Transfer to start.</p>
          ) : (
            titheHistory?.map((tithe: any) => (
              <div key={tithe.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                    tithe.type === "auto" ? "bg-amber-500/10" : "bg-emerald-500/10"
                  }`}>
                    {tithe.type === "auto" ? "🤖" : "✋"}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">₦{tithe.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {tithe.charity_name} • {tithe.type} ({tithe.percentage}%) • {tithe.date}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${tithe.status === "completed" ? "text-emerald-500" : "text-amber-500"}`}>
                  {tithe.status === "completed" ? "✓" : "⏳"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


// FreelancerMarketplacePanel (lines 2245-2354)
function FreelancerMarketplacePanel() {
  const { data: escrowBalance } = useSuspenseQuery(convexQuery(api.marketplace.getEscrowBalance, {})) as { data: any };
  const { data: pendingPayout } = useSuspenseQuery(convexQuery(api.marketplace.getPendingFridayPayout, {})) as { data: any };
  const { data: marketplaceStats } = useSuspenseQuery(convexQuery(api.marketplace.getMarketplaceStats, {})) as { data: any };
  const { data: payoutHistory } = useSuspenseQuery(convexQuery(api.marketplace.getPayoutHistory, { limit: 20 })) as { data: any[] };

  return (
    <div className="space-y-10 ">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Freelancer Marketplace</h2>
              <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">15% Platform Fee • 85% Escrow • Friday 2 PM Payouts</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Next Payout</p>
                <p className="text-lg font-black text-white">Friday 2:00 PM</p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Escrow Balance" value={`₦${(escrowBalance?.balance || 0).toLocaleString()}`} icon="🔒" color="emerald" subValue="Held for Freelancers" />
            <MetricCard label="Pending Friday Payout" value={`₦${(pendingPayout?.total || 0).toLocaleString()}`} icon="📅" color="blue" subValue={`${pendingPayout?.count || 0} jobs`} />
            <MetricCard label="Platform Fees Collected" value={`₦${(marketplaceStats?.totalPlatformFees || 0).toLocaleString()}`} icon="💰" color="amber" subValue="In Main Wallet" />
            <MetricCard label="Total Transactions" value={String(marketplaceStats?.totalTransactions || 0)} icon="📊" color="indigo" subValue="Since launch" />
          </div>
        </div>
      </div>

      {/* Money Flow Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Money Flow</h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950 p-8 rounded-3xl border border-white/5">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. Client Pays</p>
            <p className="text-lg font-black text-white">Job Budget</p>
            <p className="text-xs text-slate-400">Client deposit → Kora merchant wallet</p>
          </div>
          <div className="text-3xl text-slate-700">→</div>
          <div className="flex-1 space-y-3 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. Split Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
                <p className="text-xs text-red-400 font-bold">15%</p>
                <p className="text-sm font-black text-white">Platform Fee</p>
                <p className="text-[10px] text-slate-500">→ Main Wallet</p>
              </div>
              <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
                <p className="text-xs text-emerald-400 font-bold">85%</p>
                <p className="text-sm font-black text-white">Freelancer Amount</p>
                <p className="text-[10px] text-slate-500">→ Escrow</p>
              </div>
            </div>
          </div>
          <div className="text-3xl text-slate-700">→</div>
          <div className="flex-1 space-y-3 text-center md:text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. Friday 2 PM</p>
            <p className="text-lg font-black text-white">Freelancer Paid</p>
            <p className="text-xs text-slate-400">Kora Payout API → Freelancer bank</p>
          </div>
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Payout History</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {payoutHistory?.map((tx: any) => (
            <div key={tx._id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5 group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                  tx.status === 'released' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                }`}>
                  {tx.status === 'released' ? '💸' : '🔒'}
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    ₦{tx.freelancerAmount?.toLocaleString()} {tx.status === 'released' ? 'Released' : 'In Escrow'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {tx.status} • {new Date(tx.createdAt).toLocaleDateString()}
                    {tx.koraPayoutReference ? ` • ${tx.koraPayoutReference}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-300">
                  Total: {'₦' + (tx.amount || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-600 font-bold">
                  Fee: {'₦' + (tx.platformFee || 0).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {(!payoutHistory || payoutHistory.length === 0) && (
            <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">No payouts yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
