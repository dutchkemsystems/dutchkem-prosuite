import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

const PLATFORM_CONFIG = [
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0077b5" },
  { id: "facebook", name: "Facebook", icon: "📘", color: "#1877f2" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "#e4405f" },
  { id: "youtube", name: "YouTube", icon: "🎬", color: "#ff0000" },
  { id: "reddit", name: "Reddit", icon: "🤖", color: "#ff4500" },
  { id: "threads", name: "Threads", icon: "🧵", color: "#000000" },
  { id: "telegram", name: "Telegram", icon: "✈️", color: "#0088cc" },
  { id: "discord", name: "Discord", icon: "🎮", color: "#5865f2" },
];

const MODE_LABELS: Record<string, string> = {
  full_ai: "Full AI (Qwen)",
  ai_bg_svg_text: "AI Background + SVG Text",
  svg_only: "SVG Only",
};

const MODE_COLORS: Record<string, string> = {
  full_ai: "#9c27b0",
  ai_bg_svg_text: "#2196f3",
  svg_only: "#4caf50",
};

export default function AutoFlyerDashboard() {
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);

  const { data: engine } = useSuspenseQuery(convexQuery(api.flyer_engine.getEngineStatus));
  const { data: stats } = useSuspenseQuery(convexQuery(api.flyer_engine.getFlyerStats));
  const { data: flyers } = useSuspenseQuery(convexQuery(api.flyer_engine.listGeneratedFlyers, { limit: 20 }));
  const { data: logs } = useSuspenseQuery(convexQuery(api.flyer_engine.getPostingLogs, { limit: 30 }));
  const { data: queueItems } = useSuspenseQuery(convexQuery(api.flyer_engine.getQueueItems, { limit: 20 }));

  const startEngine = useMutation(api.flyer_engine.startEngine);
  const stopEngine = useMutation(api.flyer_engine.stopEngine);
  const togglePlatform = useMutation(api.flyer_engine.togglePlatform);
  const pausePlatform = useMutation(api.flyer_engine.pausePlatform);
  const disconnectPlatform = useMutation(api.flyer_engine.disconnectPlatform);

  const generateFlyer = useAction(api.flyer_engine.generateFlyer);
  const batchGenerate = useAction(api.flyer_posting.batchGenerate);

  const handleStartStop = async () => {
    try {
      if (engine?.status === "running") {
        await stopEngine();
      } else {
        await startEngine();
      }
    } catch (err) {
      console.error("Engine toggle failed:", err);
    }
  };

  const handleGenerate = async (platform: string) => {
    setGeneratingFor(platform);
    try {
      await generateFlyer({ platform });
    } catch (err) {
      console.error("Generation failed:", err);
    }
    setGeneratingFor(null);
  };

  const handleBatchGenerate = async () => {
    setBatchGenerating(true);
    try {
      await batchGenerate({ count: 2, platforms: ["linkedin", "facebook", "instagram", "threads"] });
    } catch (err) {
      console.error("Batch generation failed:", err);
    }
    setBatchGenerating(false);
  };

  const isRunning = engine?.status === "running";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎨</span> Auto Flyer Posting Engine
          </h2>
          <p className="text-gray-400 mt-1">
            Generate unique 5×7 inch flyers with QR codes. Posts to 8 platforms automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBatchGenerate}
            disabled={batchGenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {batchGenerating ? "⏳ Generating..." : "⚡ Batch Generate"}
          </button>
          <button
            onClick={handleStartStop}
            className={`px-6 py-2 rounded-lg font-bold text-white transition-all ${
              isRunning
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isRunning ? "⏹ Stop Engine" : "▶️ Start Engine"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Generated" value={stats?.totalFlyers || 0} icon="🎨" />
        <StatCard label="Total Posted" value={engine?.totalPosted || 0} icon="✅" />
        <StatCard label="Total Failed" value={engine?.totalFailed || 0} icon="❌" />
        <StatCard label="Queue Pending" value={queueItems?.filter((q: { status: string }) => q.status === "pending").length || 0} icon="📋" />
        <StatCard
          label="Current Mode"
          value={engine ? MODE_LABELS[["full_ai", "ai_bg_svg_text", "svg_only"][engine.currentModeIndex % 3]] : "N/A"}
          icon="🔄"
        />
      </div>

      {/* Engine Status */}
      <div className={`p-4 rounded-lg border ${isRunning ? "bg-green-900/20 border-green-500/50" : "bg-gray-800/50 border-gray-700"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
            <span className="text-white font-medium">
              Engine: {isRunning ? "RUNNING" : "STOPPED"}
            </span>
          </div>
          <span className="text-gray-400 text-sm">
            Interval: {engine?.postingIntervalHours || 4}h | Next tick:{" "}
            {engine?.nextTickAt ? new Date(engine.nextTickAt).toLocaleString() : "N/A"}
          </span>
        </div>
      </div>

      {/* Platform Grid */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Platform Control</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PLATFORM_CONFIG.map((platform) => {
            const platConfig = engine?.platforms?.[platform.id as keyof typeof engine.platforms];
            const isEnabled = platConfig?.enabled ?? false;
            const isPaused = platConfig?.paused ?? false;
            const platformFlyers = stats?.byPlatform?.[platform.id] || 0;

            return (
              <div
                key={platform.id}
                className={`p-4 rounded-lg border transition-all ${
                  isEnabled
                    ? isPaused
                      ? "bg-yellow-900/20 border-yellow-500/50"
                      : "bg-green-900/20 border-green-500/50"
                    : "bg-gray-800/30 border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{platform.icon}</span>
                  <span className="text-white font-medium">{platform.name}</span>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  {platformFlyers} flyers generated
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleGenerate(platform.id)}
                    disabled={generatingFor === platform.id || !isEnabled}
                    className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
                  >
                    {generatingFor === platform.id ? "⏳..." : "🎨 Generate"}
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => togglePlatform({ platform: platform.id, enabled: !isEnabled })}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        isEnabled ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {isEnabled ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => pausePlatform({ platform: platform.id, paused: !isPaused })}
                      disabled={!isEnabled}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        isPaused ? "bg-yellow-600 text-white" : "bg-gray-600 text-gray-300"
                      } disabled:opacity-50`}
                    >
                      {isPaused ? "PAUSED" : "PAUSE"}
                    </button>
                    <button
                      onClick={() => disconnectPlatform({ platform: platform.id })}
                      disabled={!isEnabled}
                      className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Flyers Grid */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Flyers</h3>
        {flyers && flyers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {flyers.map((flyer: { _id: string; imageUrl: string; headline: string; generationMode: string; createdAt: number; platform?: string; status?: string }) => (
              <div
                key={flyer._id}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              >
                <div className="aspect-[5/7] bg-gray-900 flex items-center justify-center relative">
                  {flyer.imageUrl.startsWith("data:image") ? (
                    <img
                      src={flyer.imageUrl}
                      alt={flyer.headline}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-500 text-sm text-center p-2">Preview</div>
                  )}
                  <div
                    className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: MODE_COLORS[flyer.generationMode] }}
                  >
                    {MODE_LABELS[flyer.generationMode]}
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-white text-xs font-medium truncate">{flyer.headline}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {flyer.platform} • {new Date(flyer.createdAt).toLocaleDateString()}
                  </div>
                  <div className={`text-xs mt-1 ${
                    flyer.status === "posted" ? "text-green-400" :
                    flyer.status === "failed" ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {flyer.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">No flyers generated yet</div>
        )}
      </div>

      {/* Activity Logs */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Activity Logs</h3>
        {logs && logs.length > 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Platform</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Duration</th>
                  <th className="text-left p-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: { _id: string; createdAt: number; platform: string; status: string; durationMs: number; error?: string }) => (
                  <tr key={log._id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-3 text-gray-300">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: PLATFORM_CONFIG.find(p => p.id === log.platform)?.color + "33", color: PLATFORM_CONFIG.find(p => p.id === log.platform)?.color }}>
                        {log.platform}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        log.status === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">{log.durationMs}ms</td>
                    <td className="p-3 text-red-400 text-xs max-w-[200px] truncate">{log.error || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">No activity yet</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-white text-xl font-bold">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}
