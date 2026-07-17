import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════
// TEAM ACCOUNTS (B2B) — Multi-user access, roles, team billing
// ═══════════════════════════════════════════════════════════════════

// Team roles and permissions
const TEAM_ROLES = {
  owner: {
    label: "Owner",
    permissions: ["manage_team", "manage_billing", "manage_members", "view_analytics", "use_services", "admin"],
  },
  admin: {
    label: "Admin",
    permissions: ["manage_members", "view_analytics", "use_services", "admin"],
  },
  manager: {
    label: "Manager",
    permissions: ["view_analytics", "use_services"],
  },
  member: {
    label: "Member",
    permissions: ["use_services"],
  },
  viewer: {
    label: "Viewer",
    permissions: ["view_analytics"],
  },
};

// Team plans
const TEAM_PLANS = {
  starter: {
    name: "Starter",
    price: 25000,
    maxMembers: 5,
    features: ["Basic analytics", "Email support", "5 team members"],
  },
  professional: {
    name: "Professional",
    price: 75000,
    maxMembers: 15,
    features: ["Advanced analytics", "Priority support", "15 team members", "Custom roles"],
  },
  enterprise: {
    name: "Enterprise",
    price: 200000,
    maxMembers: 50,
    features: ["Full analytics", "Dedicated support", "50 team members", "Custom roles", "SSO", "API access"],
  },
};

// Create a team
export const createTeam = mutation({
  args: {
    name: v.string(),
    plan: v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;
    const planConfig = TEAM_PLANS[args.plan];

    // Check if user already owns a team
    const existingTeam = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    if (existingTeam) throw new Error("You already own a team");

    // Create team
    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      ownerId: userId,
      plan: args.plan,
      maxMembers: planConfig.maxMembers,
      currentMembers: 1,
      status: "active",
      createdAt: Date.now(),
    });

    // Add owner as member
    await ctx.db.insert("team_members", {
      teamId,
      userId,
      role: "owner",
      invitedBy: userId,
      joinedAt: Date.now(),
      status: "active",
    });

    return { teamId, success: true };
  },
});

// Get user's teams
export const getUserTeams = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject as Id<"users">;

    // Get teams where user is a member
    const memberships = await ctx.db
      .query("team_members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const teams = [];
    for (const membership of memberships) {
      const team = await ctx.db.get("teams", membership.teamId);
      if (team) {
        teams.push({
          ...team,
          myRole: membership.role,
          myPermissions: TEAM_ROLES[membership.role].permissions,
        });
      }
    }

    return teams;
  },
});

// Get team details
export const getTeamDetails = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const team = await ctx.db.get("teams", args.teamId);
    if (!team) return null;

    // Get members
    const members = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const memberDetails = [];
    for (const member of members) {
      const user = await ctx.db.get("users", member.userId);
      memberDetails.push({
        ...member,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "Unknown",
        roleLabel: TEAM_ROLES[member.role].label,
        permissions: TEAM_ROLES[member.role].permissions,
      });
    }

    return {
      ...team,
      members: memberDetails,
      planDetails: TEAM_PLANS[team.plan],
    };
  },
});

// Invite team member
export const inviteMember = mutation({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("member"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;

    // Check if user is authorized
    const membership = await ctx.db
      .query("team_members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", userId)
      )
      .first();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Not authorized to invite members");
    }

    // Check team capacity
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) throw new Error("Team not found");

    if (team.currentMembers >= team.maxMembers) {
      throw new Error("Team is at maximum capacity");
    }

    // Check if invite already exists
    const existingInvite = await ctx.db
      .query("team_invites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingInvite && existingInvite.status === "pending") {
      throw new Error("Invite already pending for this email");
    }

    // Create invite
    const inviteCode = Math.random().toString(36).substring(2, 15);
    return await ctx.db.insert("team_invites", {
      teamId: args.teamId,
      email: args.email,
      role: args.role,
      invitedBy: userId,
      inviteCode,
      status: "pending",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
    });
  },
});

// Accept team invite
export const acceptInvite = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;

    const invite = await ctx.db
      .query("team_invites")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!invite) throw new Error("Invalid invite code");
    if (invite.status !== "pending") throw new Error("Invite already used");
    if (invite.expiresAt < Date.now()) throw new Error("Invite expired");

    // Check team capacity
    const team = await ctx.db.get("teams", invite.teamId);
    if (!team) throw new Error("Team not found");

    if (team.currentMembers >= team.maxMembers) {
      throw new Error("Team is at maximum capacity");
    }

    // Add member
    await ctx.db.insert("team_members", {
      teamId: invite.teamId,
      userId,
      role: invite.role as "admin" | "owner" | "manager" | "member" | "viewer",
      invitedBy: invite.invitedBy,
      joinedAt: Date.now(),
      status: "active",
    });

    // Update team member count
    await ctx.db.patch("teams", invite.teamId, {
      currentMembers: team.currentMembers + 1,
    });

    // Update invite status
    await ctx.db.patch("team_invites", invite._id, { status: "accepted" });

    return { success: true, teamId: invite.teamId };
  },
});

// Remove team member
export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;

    // Check authorization
    const membership = await ctx.db
      .query("team_members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", userId)
      )
      .first();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Not authorized to remove members");
    }

    // Can't remove owner
    if (args.memberId === membership.userId && membership.role === "owner") {
      throw new Error("Owner cannot be removed");
    }

    // Find and remove member
    const memberToRemove = await ctx.db
      .query("team_members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.memberId)
      )
      .first();

    if (!memberToRemove) throw new Error("Member not found");

    await ctx.db.delete("team_members", memberToRemove._id);

    // Update team member count
    const team = await ctx.db.get("teams", args.teamId);
    if (team) {
      await ctx.db.patch("teams", args.teamId, {
        currentMembers: Math.max(0, team.currentMembers - 1),
      });
    }

    return { success: true };
  },
});

// Update member role
export const updateMemberRole = mutation({
  args: {
    teamId: v.id("teams"),
    memberId: v.id("users"),
    newRole: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("member"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;

    // Check authorization (only owner can change roles)
    const membership = await ctx.db
      .query("team_members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can change member roles");
    }

    const memberToUpdate = await ctx.db
      .query("team_members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.memberId)
      )
      .first();

    if (!memberToUpdate) throw new Error("Member not found");

    await ctx.db.patch("team_members", memberToUpdate._id, { role: args.newRole });

    return { success: true };
  },
});

// Get team usage stats
export const getTeamStats = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) return null;

    const members = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeMembers = members.filter((m) => m.status === "active").length;

    return {
      teamName: team.name,
      plan: team.plan,
      planDetails: TEAM_PLANS[team.plan],
      memberCount: activeMembers,
      maxMembers: team.maxMembers,
      utilizationPercent: Math.round((activeMembers / team.maxMembers) * 100),
      membersByRole: {
        owner: members.filter((m) => m.role === "owner").length,
        admin: members.filter((m) => m.role === "admin").length,
        manager: members.filter((m) => m.role === "manager").length,
        member: members.filter((m) => m.role === "member").length,
        viewer: members.filter((m) => m.role === "viewer").length,
      },
    };
  },
});

// Get available team plans
export const getTeamPlans = query({
  args: {},
  handler: async () => {
    return Object.entries(TEAM_PLANS).map(([id, plan]) => ({
      id,
      ...plan,
    }));
  },
});
