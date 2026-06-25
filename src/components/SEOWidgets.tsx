import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

import { api } from "../../convex/_generated/api";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEO DASHBOARD â€” Content optimization analytics
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function SEODashboard() {
  const { data: seoData } = useSuspenseQuery(convexQuery(api.seoEngine.getSEODashboard, {}));

  if (!seoData) return null;

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-3xl font-black text-white">{seoData.averageScore}</div>
          <div className="text-[10px] text-slate-400">Avg SEO Score</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${
                seoData.averageScore >= 80
                  ? "bg-green-500"
                  : seoData.averageScore >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${seoData.averageScore}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-3xl font-black text-white">{seoData.totalAnalyses}</div>
          <div className="text-[10px] text-slate-400">Total Analyses</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-3xl font-black text-white">{seoData.totalKeywords}</div>
          <div className="text-[10px] text-slate-400">Keywords Tracked</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-3xl font-black text-white">{seoData.upcomingContent}</div>
          <div className="text-[10px] text-slate-400">Upcoming Content</div>
        </div>
      </div>

      {/* Recent Scores */}
      {seoData.recentScores.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <h4 className="mb-3 text-sm font-black text-white">ðŸ“ˆ Recent Analyses</h4>
          <div className="space-y-2">
            {seoData.recentScores.map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
              >
                <div className="text-xs text-slate-400 truncate max-w-[200px]">{item.url}</div>
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      item.score >= 80
                        ? "bg-green-500/20 text-green-400"
                        : item.score >= 60
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {item.score}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEO ANALYZER â€” Real-time content analysis
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface SEOAnalyzerProps {
  content: string;
  contentType: string;
  targetKeywords?: Array<string>;
  onAnalysis?: (result: any) => void;
}

export function SEOAnalyzer({ content, contentType, targetKeywords, onAnalysis }: SEOAnalyzerProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async () => {
    setIsAnalyzing(true);
    // Analysis would be triggered via action
    setIsAnalyzing(false);
  };

  if (!analysis) {
    return (
      <button
        onClick={analyze}
        disabled={isAnalyzing}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {isAnalyzing ? "Analyzing..." : "Analyze SEO"}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="flex items-center gap-4">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black ${
            analysis.score >= 80
              ? "bg-green-500/20 text-green-400"
              : analysis.score >= 60
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {analysis.score}
        </div>
        <div>
          <div className="text-sm font-bold text-white">SEO Score</div>
          <div className="text-[10px] text-slate-400">
            {analysis.wordCount} words Â· {analysis.readTime} read
          </div>
        </div>
      </div>

      {/* Issues */}
      {analysis.issues.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-white">Issues</h5>
          {analysis.issues.map((issue: any, i: number) => (
            <div
              key={i}
              className={`rounded-lg border p-2 text-xs ${
                issue.type === "critical"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : issue.type === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-400"
              }`}
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-white">Suggestions</h5>
          {analysis.suggestions.slice(0, 3).map((suggestion: any, i: number) => (
            <div
              key={i}
              className="rounded-lg border border-white/5 bg-white/5 p-3"
            >
              <div className="text-xs font-bold text-white">{suggestion.title}</div>
              <div className="text-[10px] text-slate-400">{suggestion.description}</div>
              <div className="mt-1 text-[9px] text-indigo-400">{suggestion.estimatedImpact}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONTENT CALENDAR â€” Scheduled content view
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function ContentCalendar() {
  const { data: calendar } = useSuspenseQuery(convexQuery(api.seoEngine.getContentCalendar, {}));

  if (!calendar || calendar.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-center">
        <div className="text-2xl">ðŸ“…</div>
        <div className="mt-2 text-sm text-slate-400">No scheduled content</div>
        <div className="mt-1 text-[10px] text-slate-500">Schedule content to see it here</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calendar.map((item: any) => (
        <div
          key={item._id}
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
        >
          <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-indigo-500/20">
            <div className="text-[8px] font-bold text-indigo-400">
              {new Date(item.scheduledDate).toLocaleDateString("en", { month: "short" })}
            </div>
            <div className="text-sm font-black text-white">
              {new Date(item.scheduledDate).getDate()}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-white">{item.title}</div>
            <div className="text-[10px] text-slate-400">
              {item.contentType} Â· {item.platform}
            </div>
          </div>
          <div
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
              item.status === "scheduled"
                ? "bg-green-500/20 text-green-400"
                : item.status === "published"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-slate-500/20 text-slate-400"
            }`}
          >
            {item.status}
          </div>
        </div>
      ))}
    </div>
  );
}
