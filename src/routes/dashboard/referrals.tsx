import { StatCard, Section } from './shared';

export function Referrals({ data, payoutMessage, setPayoutMessage, requestReferralPayoutAction }: { data: any; payoutMessage: string; setPayoutMessage: (v: string) => void; requestReferralPayoutAction: any }) {
  return (
    <div className="space-y-8 ">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Friends Signed" value={data.referrals.friendsSignedUp} icon="👥" color="indigo" />
        <StatCard label="Total Earned" value={`₦${data.referrals.totalEarned.toLocaleString()}`} icon="💰" color="emerald" />
        <StatCard label="Available" value={`₦${data.referrals.availableBalance.toLocaleString()}`} icon="💎" color="amber" />
      </div>
      
          <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-4 tracking-tight uppercase">Earn ₦500 for Every Friend!</h2>
          <p className="text-indigo-100 max-w-lg mb-8 text-lg font-bold">Spread the word about Dutchkem ProSuite and get paid instantly when your friends start their first subscription. Unlimited earnings!</p>
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <div className="w-full md:w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 text-xl font-mono tracking-widest">{data.user.referralCode}</div>
            <button onClick={() => navigator.clipboard.writeText(`prosuite.ng/ref/${data.user.referralCode}`)} className="w-full md:w-auto px-10 py-4 bg-white text-indigo-600 rounded-xl font-black text-lg hover:shadow-2xl transition-all">COPY LINK</button>
          </div>
          <div className="flex gap-4">
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">💬</button>
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">📘</button>
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">🐦</button>
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">📧</button>
          </div>
        </div>
        <div className="absolute top-0 right-0 text-9xl opacity-10 -rotate-12 translate-x-1/4 -translate-y-1/4">🤝</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Referral History">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-white">Friend</th>
                  <th className="px-6 py-4 text-white">Date</th>
                  <th className="px-6 py-4 text-white">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.referrals.history.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="px-6 py-4 font-bold">{r.name || 'Incognito Friend'}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-emerald-400 font-black">+₦{r.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Withdraw Funds">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl text-emerald-400 border border-emerald-500/20">💸</div>
            <div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">Withdrawable Balance</p>
              <h2 className="text-4xl font-black">₦{data.referrals.availableBalance}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <button className="py-3 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 border border-slate-700">Bank Transfer</button>
              <button className="py-3 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 border border-slate-700">OPay / Palmpay</button>
            </div>
            {payoutMessage && <p className={`text-xs font-bold ${payoutMessage.includes("success") ? "text-emerald-400" : "text-red-400"}`}>{payoutMessage}</p>}
            <button disabled={data.referrals.availableBalance < 1000} onClick={async () => {
              setPayoutMessage("");
              const result = await requestReferralPayoutAction({});
              setPayoutMessage(result?.success ? `Payout of ₦${result.amount?.toLocaleString()} requested!` : result?.error || "Failed to request payout");
              setTimeout(() => setPayoutMessage(""), 4000);
            }} className="w-full max-w-xs py-4 bg-emerald-600 text-white rounded-xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:grayscale disabled:opacity-50">REQUEST PAYOUT</button>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Minimum withdrawal: ₦1,000 • Processed every Friday 2 PM</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
