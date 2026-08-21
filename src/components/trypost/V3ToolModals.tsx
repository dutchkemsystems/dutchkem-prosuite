import { useState } from "react";
import { useTryPostActions } from "./TryPostActions";
import { Modal } from "./Modal";
import { VOICES } from "./constants";

type Props = {
  platforms: any[];
  setScheduleForm: (f: any) => void;
  scheduleForm: any;
  setScheduleModal: (v: boolean) => void;
  onClose: () => void;
};

export function CaptionGeneratorModal({ platforms, setScheduleForm, scheduleForm, setScheduleModal, onClose }: Props) {
  const { generateCaption, adminToken, showToast } = useTryPostActions();
  const [form, setForm] = useState({ topic: "", platform: "twitter", tone: "professional" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Modal title="✍️ AI Caption Generator" onClose={onClose}>
      <div className="space-y-3">
        <input
          placeholder="Topic (e.g. New AI feature launch)"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        />
        <select
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        >
          {(platforms ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
          ))}
        </select>
        <select
          value={form.tone}
          onChange={(e) => setForm({ ...form, tone: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        >
          {VOICES.map((v) => (
            <option key={v} value={v.toLowerCase()}>{v}</option>
          ))}
        </select>
        <button
          onClick={async () => {
            if (!form.topic) { showToast("error", "Topic is required"); return; }
            setLoading(true);
            try {
              const res = await generateCaption({ adminToken, topic: form.topic, platform: form.platform, tone: form.tone });
              if (res?.authError) { showToast("error", "Auth failed"); }
              else { setResult(res); showToast("success", `Caption generated (${res.charCount} chars)`); }
            } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
            finally { setLoading(false); }
          }}
          disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl"
        >
          {loading ? "Generating..." : "Generate Caption"}
        </button>
        {result && (
          <div className="space-y-2">
            <div className="bg-slate-800 rounded-xl p-3 text-sm text-white whitespace-pre-wrap">{result.caption}</div>
            {result.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.hashtags.map((h: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs">{h}</span>
                ))}
              </div>
            )}
            <div className="text-xs text-slate-400">
              {result.charCount}/{result.charLimit} chars · {result.withinLimit ? "✅ Fits" : "❌ Too long"} · via {result.source}
            </div>
            <button
              onClick={() => {
                setScheduleForm({ ...scheduleForm, content: result.caption, hashtags: result.hashtags?.join(" ") ?? "", platforms: [form.platform] });
                setScheduleModal(true);
                onClose();
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm"
            >
              Use in Post →
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function HashtagSuggesterModal({ platforms, setScheduleForm, scheduleForm, onClose }: Props) {
  const { suggestHashtags, adminToken, showToast } = useTryPostActions();
  const [form, setForm] = useState({ content: "", platform: "twitter", hashtagCount: 10 });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Modal title="#️⃣ Hashtag Suggester" onClose={onClose}>
      <div className="space-y-3">
        <textarea
          placeholder="Paste your post content here..."
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          rows={4}
        />
        <div className="flex gap-2">
          <select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            {(platforms ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={5}
            max={30}
            value={form.hashtagCount}
            onChange={(e) => setForm({ ...form, hashtagCount: parseInt(e.target.value) || 10 })}
            className="w-20 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={async () => {
            if (!form.content) { showToast("error", "Content is required"); return; }
            setLoading(true);
            try {
              const res = await suggestHashtags({ adminToken, content: form.content, platform: form.platform, count: form.hashtagCount });
              if (res?.authError) { showToast("error", "Auth failed"); }
              else { setResult(res); showToast("success", `${res.count} hashtags suggested`); }
            } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
            finally { setLoading(false); }
          }}
          disabled={loading}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl"
        >
          {loading ? "Suggesting..." : "Suggest Hashtags"}
        </button>
        {result && result.hashtags && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {result.hashtags.map((h: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">{h}</span>
              ))}
            </div>
            <button
              onClick={() => {
                setScheduleForm({ ...scheduleForm, hashtags: result.hashtags.join(" ") });
                onClose();
                showToast("success", "Hashtags copied to post form");
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm"
            >
              Use in Post →
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function BestTimeModal({ bestTimes, onClose }: { bestTimes: any; onClose: () => void }) {
  return (
    <Modal title="⏰ Best Times to Post" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Recommended posting hours (WAT) by platform — based on audience engagement data.</p>
        {bestTimes && !bestTimes.authError && Object.entries(bestTimes.times).map(([platform, hours]: [string, any]) => (
          <div key={platform} className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-sm font-bold text-white mb-2 capitalize">{platform}</div>
            <div className="flex flex-wrap gap-1">
              {(hours ?? []).map((h: number) => (
                <span key={h} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-mono">
                  {h.toString().padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function TrendingModal({ trending, onClose }: { trending: any; onClose: () => void }) {
  return (
    <Modal title="🔥 Trending Topics" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">Curated trending topics — click to use as post inspiration.</p>
        {trending && !trending.authError && trending.topics.map((t: any, i: number) => (
          <div
            key={i}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 hover:border-rose-500/50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{t.topic}</div>
                <div className="text-xs text-slate-400 capitalize">{t.category}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-rose-300">{t.score}</div>
                <div className="text-[9px] text-slate-500">score</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {t.hashtags.map((h: string, j: number) => (
                <span key={j} className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[9px]">{h}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
