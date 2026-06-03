import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react";
import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════
// TEAM ACCOUNTS UI — Team management dashboard
// ═══════════════════════════════════════════════════════════════════

export function TeamDashboard() {
  const teams = useQuery(convexQuery(api.teamAccounts.getUserTeams, {}));
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  if (!teams) return null;

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-center">
        <div className="text-3xl">👥</div>
        <div className="mt-2 text-sm font-bold text-white">No Teams Yet</div>
        <div className="mt-1 text-[10px] text-slate-400">
          Create a team to collaborate with your colleagues
        </div>
        <button className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500">
          Create Team
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team List */}
      <div className="space-y-2">
        {teams.map((team) => (
          <div
            key={team._id}
            onClick={() => setSelectedTeam(team._id)}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedTeam === team._id
                ? "border-indigo-500/50 bg-indigo-500/10"
                : "border-white/5 bg-white/5 hover:border-white/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{team.name}</div>
                <div className="text-[10px] text-slate-400">
                  {team.plan} plan · {team.currentMembers}/{team.maxMembers} members
                </div>
              </div>
              <div className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-400">
                {team.myRole}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TEAM MEMBERS LIST
// ═══════════════════════════════════════════════════════════════════

interface TeamMembersProps {
  teamId: string;
}

export function TeamMembers({ teamId }: TeamMembersProps) {
  const teamDetails = useQuery(
    convexQuery(api.teamAccounts.getTeamDetails, { teamId: teamId as any })
  );

  if (!teamDetails) return null;

  const ROLE_COLORS: Record<string, string> = {
    owner: "bg-amber-500/20 text-amber-400",
    admin: "bg-purple-500/20 text-purple-400",
    manager: "bg-blue-500/20 text-blue-400",
    member: "bg-green-500/20 text-green-400",
    viewer: "bg-slate-500/20 text-slate-400",
  };

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-white">{teamDetails.name}</div>
            <div className="text-[10px] text-slate-400">
              {teamDetails.planDetails.name} · {teamDetails.currentMembers}/{teamDetails.maxMembers} members
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-white">
              {teamDetails.planDetails.price.toLocaleString()} ₦
            </div>
            <div className="text-[9px] text-slate-500">/month</div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
            style={{
              width: `${(teamDetails.currentMembers / teamDetails.maxMembers) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {teamDetails.members.map((member: any) => (
          <div
            key={member._id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                {member.userName[0] || "?"}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{member.userName}</div>
                <div className="text-[10px] text-slate-400">{member.userEmail}</div>
              </div>
            </div>
            <div
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${ROLE_COLORS[member.role]}`}
            >
              {member.roleLabel}
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <h4 className="mb-2 text-xs font-bold text-white">Plan Features</h4>
        <div className="space-y-1">
          {teamDetails.planDetails.features.map((feature: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="text-green-400">✓</span>
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TEAM PLANS COMPARISON
// ═══════════════════════════════════════════════════════════════════

export function TeamPlans() {
  const plans = useQuery(convexQuery(api.teamAccounts.getTeamPlans, {}));

  if (!plans) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`rounded-2xl border p-4 ${
            plan.id === "professional"
              ? "border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
              : "border-white/5 bg-white/5"
          }`}
        >
          {plan.id === "professional" && (
            <div className="mb-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-400 inline-block">
              POPULAR
            </div>
          )}
          <div className="text-sm font-black text-white">{plan.name}</div>
          <div className="mt-1 text-2xl font-black text-white">
            ₦{plan.price.toLocaleString()}
            <span className="text-xs text-slate-400">/mo</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Up to {plan.maxMembers} members
          </div>
          <div className="mt-4 space-y-2">
            {plan.features.map((feature: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="text-green-400">✓</span>
                {feature}
              </div>
            ))}
          </div>
          <button
            className={`mt-4 w-full rounded-xl py-2 text-xs font-bold transition-colors ${
              plan.id === "professional"
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Select Plan
          </button>
        </div>
      ))}
    </div>
  );
}
