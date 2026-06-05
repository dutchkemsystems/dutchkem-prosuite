import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ClientNotificationPrefs() {
  const { data: prefs } = useSuspenseQuery(convexQuery(api.composioClient.getNotificationPrefs, {})) as { data: any };
  const updatePrefs = useMutation(api.composioClient.updateNotificationPrefs);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: string, value: boolean) => {
    setSaving(true);
    try {
      await updatePrefs({ [key]: value });
    } catch (err) {
      console.error("Failed to update prefs:", err);
    }
    setSaving(false);
  };

  const options = [
    {
      key: "emailOnAction",
      label: "Email on Action",
      description: "Get an email when an agent completes a task for you",
      icon: "📧",
    },
    {
      key: "pushOnAction",
      label: "Push Notifications",
      description: "Browser push notifications for real-time updates",
      icon: "🔔",
    },
    {
      key: "weeklyReport",
      label: "Weekly Report",
      description: "Summary of agent activity and performance each week",
      icon: "📊",
    },
    {
      key: "agentActivityDigest",
      label: "Activity Digest",
      description: "Daily digest of all agent actions taken on your behalf",
      icon: "📋",
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Notification Preferences</h3>
        {saving && <span className="text-[9px] text-purple-500 font-bold animate-pulse">Saving...</span>}
      </div>

      <div className="space-y-4">
        {options.map((opt) => (
          <div
            key={opt.key}
            className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5"
          >
            <div className="flex items-center gap-4">
              <span className="text-xl">{opt.icon}</span>
              <div>
                <p className="text-xs font-bold text-white">{opt.label}</p>
                <p className="text-[10px] text-slate-500">{opt.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(opt.key, !prefs[opt.key])}
              disabled={saving}
              className={`w-12 h-6 rounded-full relative transition-all ${
                prefs[opt.key] ? "bg-purple-600" : "bg-slate-700"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                prefs[opt.key] ? "right-1" : "left-1"
              }`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
