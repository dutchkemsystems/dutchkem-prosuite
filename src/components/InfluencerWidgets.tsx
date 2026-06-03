import { useState } from "react";
import { useQuery } from "convex/react";
import { convexQuery } from "@convex-dev/react";
import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════
// INFLUENCER DASHBOARD — Campaign management & analytics
// ═══════════════════════════════════════════════════════════════════

export function InfluencerDashboard() {
  const stats = useQuery(convexQuery(api.influencerRecruitment.getCampaignStats, {}));
  const influencers = useQuery(convexQuery(api.influencerRecruitment.getInfluencers, {}));
  const campaigns = useQuery(convexQuery(api.influencerRecruitment.getCampaigns, {}));

  if (!stats || !influencers || !campaigns) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.totalInfluencers}</div>
          <div className="text-[10px] text-slate-400">Influencers</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.totalCampaigns}</div>
          <div className="text-[10px] text-slate-400">Campaigns</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.activeCampaigns}</div>
          <div className="text-[10px] text-slate-400">Active</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">
            ₦{(stats.totalSpend / 1000).toFixed(0)}k
          </div>
          <div className="text-[10px] text-slate-400">Total Spend</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-green-400">{stats.avgROI}%</div>
          <div className="text-[10px] text-slate-400">Avg ROI</div>
        </div>
      </div>

      {/* Influencers by Tier */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-black text-white">👥 Influencers by Tier</h4>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(stats.byTier).map(([tier, count]) => (
            <div
              key={tier}
              className="rounded-xl border border-white/5 bg-white/5 p-3 text-center"
            >
              <div className="text-lg font-black text-white">{count as number}</div>
              <div className="text-[9px] text-slate-400 capitalize">{tier}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-black text-white">📋 Recent Campaigns</h4>
        <div className="space-y-2">
          {campaigns.slice(0, 5).map((campaign) => (
            <div
              key={campaign._id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <div>
                <div className="text-xs font-bold text-white">{campaign.name}</div>
                <div className="text-[10px] text-slate-400">
                  {campaign.influencerName} · {campaign.campaignType}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-white">
                  ₦{campaign.budget.toLocaleString()}
                </div>
                <div
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    campaign.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : campaign.status === "completed"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-slate-500/20 text-slate-400"
                  }`}
                >
                  {campaign.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INFLUENCER LIST — Browse and filter influencers
// ═══════════════════════════════════════════════════════════════════

export function InfluencerList() {
  const [filter, setFilter] = useState({ tier: "", platform: "" });

  const influencers = useQuery(
    convexQuery(api.influencerRecruitment.getInfluencers, {
      tier: filter.tier || undefined,
      platform: filter.platform || undefined,
    })
  );

  if (!influencers) return null;

  const TIER_COLORS: Record<string, string> = {
    nano: "bg-slate-500/20 text-slate-400",
    micro: "bg-green-500/20 text-green-400",
    mid: "bg-blue-500/20 text-blue-400",
    macro: "bg-purple-500/20 text-purple-400",
    mega: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filter.tier}
          onChange={(e) => setFilter({ ...filter, tier: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
        >
          <option value="">All Tiers</option>
          <option value="nano">Nano</option>
          <option value="micro">Micro</option>
          <option value="mid">Mid-Tier</option>
          <option value="macro">Macro</option>
          <option value="mega">Mega</option>
        </select>
        <select
          value={filter.platform}
          onChange={(e) => setFilter({ ...filter, platform: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
        >
          <option value="">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="twitter">Twitter</option>
        </select>
      </div>

      {/* Influencer Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {influencers.map((inf) => (
          <div
            key={inf._id}
            className="rounded-2xl border border-white/5 bg-white/5 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                {inf.name[0]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{inf.name}</div>
                <div className="text-[10px] text-slate-400">@{inf.username}</div>
              </div>
              <div
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${TIER_COLORS[inf.tier]}`}
              >
                {inf.tier}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-xs font-bold text-white">
                  {(inf.followers / 1000).toFixed(0)}k
                </div>
                <div className="text-[9px] text-slate-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-white">{inf.engagementRate}%</div>
                <div className="text-[9px] text-slate-500">Engagement</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-indigo-400">{inf.score}</div>
                <div className="text-[9px] text-slate-500">Score</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-[10px] text-slate-400">{inf.niche}</div>
              <div
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  inf.status === "active"
                    ? "bg-green-500/20 text-green-400"
                    : inf.status === "contacted"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {inf.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CAMPAIGN LIST — Active campaigns view
// ═══════════════════════════════════════════════════════════════════

export function CampaignList() {
  const campaigns = useQuery(convexQuery(api.influencerRecruitment.getCampaigns, {}));

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-center">
        <div className="text-3xl">📊</div>
        <div className="mt-2 text-sm font-bold text-white">No Campaigns Yet</div>
        <div className="mt-1 text-[10px] text-slate-400">
          Create your first influencer campaign
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign._id}
          className="rounded-2xl border border-white/5 bg-white/5 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">{campaign.name}</div>
              <div className="text-[10px] text-slate-400">
                {campaign.influencerName} · {campaign.campaignType}
              </div>
            </div>
            <div
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                campaign.status === "active"
                  ? "bg-green-500/20 text-green-400"
                  : campaign.status === "completed"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-slate-500/20 text-slate-400"
              }`}
            >
              {campaign.status}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-xs font-bold text-white">
                ₦{campaign.spend.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-500">Spend</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-white">
                {(campaign.reach / 1000).toFixed(0)}k
              </div>
              <div className="text-[9px] text-slate-500">Reach</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-white">{campaign.conversions}</div>
              <div className="text-[9px] text-slate-500">Conversions</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-green-400">{campaign.roi}%</div>
              <div className="text-[9px] text-slate-500">ROI</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{
                width: `${Math.min(100, (campaign.spend / campaign.budget) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-slate-500">
            <span>₦{campaign.spend.toLocaleString()} spent</span>
            <span>₦{campaign.budget.toLocaleString()} budget</span>
          </div>
        </div>
      ))}
    </div>
  );
}
