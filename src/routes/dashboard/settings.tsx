import ThemeSelector from '~/theme/ThemeSelector';
import { Input, Toggle } from './shared';

export function Settings({ data }: { data: any }) {
  return (
    <div className="space-y-8 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">👤 Profile Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-6 p-4 bg-slate-800/30 rounded-xl border border-slate-800">
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold border-4 border-indigo-500/20 overflow-hidden">
                {data.user.image ? <img src={data.user.image} alt="Avatar" /> : data.user.name?.[0]}
              </div>
              <div>
                <button className="px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all mb-2">Change Avatar</button>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Max size 2MB • PNG/JPG</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" value={data.user.name || ""} />
              <Input label="Email Address" value={data.user.email || ""} disabled />
              <Input label="Phone Number" placeholder="+234 ..." />
              <Input label="Language" value="English (NG)" />
            </div>
            <button className="w-full py-4 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">SAVE CHANGES</button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">🔔 Notification Preferences</h3>
            <div className="space-y-4">
              <Toggle label="Email Notifications" description="Receive updates via your registered email." active />
              <Toggle label="SMS Alerts" description="Get urgent updates on your phone." />
              <Toggle label="Push Notifications" description="Real-time alerts in your browser/app." active />
              <Toggle label="Project Completions" description="Notify me when an agent finishes a task." active />
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">🎨 Dashboard Theme</h3>
            <p className="text-slate-400 text-sm">Choose a theme to personalize your dashboard experience.</p>
            <ThemeSelector />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">💰 Billing Currency</h3>
            <p className="text-slate-400 text-sm">Choose your preferred currency for invoices and pricing display.</p>
            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold border border-indigo-500/30">NGN (₦)</button>
              <button className="flex-1 py-3 bg-slate-800 rounded-xl font-bold border border-slate-700 text-slate-400">USD ($)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
