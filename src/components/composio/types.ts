import type { api } from "../../../convex/_generated/api";

export type AdminPanelProps = {
  adminToken: string;
};

export const PERIOD_OPTIONS = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
] as const;

export type Period = "24h" | "7d" | "30d";

export type Toolkit = {
  toolkit: string;
  name: string;
  icon: string;
  description: string;
  tools: any[];
};

export type ShowToastFn = (type: "success" | "error", msg: string) => void;
