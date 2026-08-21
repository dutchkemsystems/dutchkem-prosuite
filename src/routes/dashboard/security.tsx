import { Section } from './shared';

export function Security({ data, tfaMessage, setTfaMessage, toggle2FAAction, newPassword, setNewPassword, passwordMessage, setPasswordMessage, changePasswordAction }: { data: any; tfaMessage: string; setTfaMessage: (v: string) => void; toggle2FAAction: any; newPassword: string; setNewPassword: (v: string) => void; passwordMessage: string; setPasswordMessage: (v: string) => void; changePasswordAction: any }) {
  return (
    <div className="space-y-8 ">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-tight">🔐 Security Operations</h3>
        <button className="px-6 py-2 bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all">Logout Remote Devices</button>
      </div>
      
      <Section title="Active Personnel Sessions">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Device / OS</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Geographical Data</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Network IP</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Last Pulse</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest text-right">Session State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.sessions.map((s: any) => (
                <tr key={s._id} className={`${s.isCurrent ? "bg-indigo-600/5" : ""} hover:bg-slate-800/30 transition-colors`}>
                  <td className="px-8 py-5 font-bold flex items-center gap-3">
                    <span className="text-xl">{s.device.includes('Mobile') ? '📱' : '💻'}</span>
                    <div>
                      <p className="text-sm">{s.device}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Authorized Session</p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-400 font-bold">{s.location}</td>
                  <td className="px-8 py-5 text-slate-500 font-mono text-xs tracking-tighter">{s.ip}</td>
                  <td className="px-8 py-5 text-slate-500 font-bold">{new Date(s.lastActive).toLocaleTimeString()}</td>
                  <td className="px-8 py-5 text-right">
                    {s.isCurrent ? (
                      <span className="text-emerald-400 font-black uppercase text-[10px] border border-emerald-500/20 px-3 py-1.5 rounded-lg bg-emerald-500/5 shadow-lg shadow-emerald-500/10">Current Session</span>
                    ) : (
                      <button className="text-red-500 font-black uppercase text-[10px] hover:underline tracking-widest">Revoke Access</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-teal-400">🛡️ Guardian AI Intelligence</h3>
          <p className="text-slate-400 text-sm">Real-time fraud monitoring and automated payment verification.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">Confidence Score</span>
              <span className="text-sm font-black text-emerald-400">98% Secure</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">Fraud Flags</span>
              <span className="text-sm font-black text-slate-300">0 Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">Last Verification</span>
              <span className="text-xs font-bold text-slate-500">2 min ago</span>
            </div>
          </div>
        </div>
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">🛡️ 2FA Security</h3>
          <p className="text-slate-400 text-sm">Add an extra layer of protection to your account by enabling two-factor authentication.</p>
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div>
              <p className="font-bold">Authenticator App</p>
              <p className="text-xs text-slate-500 italic">Google Authenticator, Authy, etc.</p>
            </div>
            <button onClick={async () => {
              const result = await toggle2FAAction({ enable: true });
              setTfaMessage(result?.success ? "2FA enabled successfully!" : result?.error || "Failed to enable 2FA");
              setTimeout(() => setTfaMessage(""), 3000);
            }} className="px-6 py-2 bg-indigo-600 rounded-lg text-xs font-black hover:bg-indigo-700">ENABLE</button>
          </div>
          {tfaMessage && <p className={`text-xs font-bold ${tfaMessage.includes("success") ? "text-emerald-400" : "text-red-400"}`}>{tfaMessage}</p>}
        </div>
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">🔑 Change Password</h3>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            setPasswordMessage("");
            const form = e.target as HTMLFormElement;
            const currentPw = (form.elements[0] as HTMLInputElement).value;
            const newPw = newPassword;
            if (!currentPw || !newPw) { setPasswordMessage("Both fields required"); return; }
            const result = await changePasswordAction({ currentPassword: currentPw, newPassword: newPw });
            setPasswordMessage(result?.success ? "Password updated!" : result?.error || "Failed to update password");
            if (result?.success) { form.reset(); setNewPassword(""); }
            setTimeout(() => setPasswordMessage(""), 3000);
          }}>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Current Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">New Password</label>
              <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            {passwordMessage && <p className={`text-xs font-bold ${passwordMessage.includes("success") || passwordMessage.includes("updated") ? "text-emerald-400" : "text-red-400"}`}>{passwordMessage}</p>}
            <button type="submit" className="w-full py-3 bg-slate-800 rounded-xl text-sm font-black border border-slate-700 hover:bg-slate-700">UPDATE PASSWORD</button>
          </form>
        </div>
      </div>
    </div>
  );
}
