import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export interface DashboardActions {
  toggle2FA: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  requestReferralPayout: () => Promise<boolean>;
  ensureReferralCode: () => Promise<{ generated: boolean } | null>;
  busy: boolean;
}

/**
 * Wraps client-side account actions used across the dashboard
 * (2FA toggle, password change, referral payout, referral code).
 */
export function useDashboardActions(): DashboardActions {
  const [busy, setBusy] = useState(false);

  const toggle2FAMutation = useMutation(api.client_actions.toggle2FA);
  const changePasswordMutation = useMutation(api.client_actions.changeClientPassword);
  const requestReferralPayoutMutation = useMutation(api.client_actions.requestReferralPayout);
  const ensureReferralCodeMutation = useMutation(api.client_actions.ensureReferralCode);

  const toggle2FA = useCallback(async () => {
    setBusy(true);
    try {
      const result = await toggle2FAMutation({});
      return Boolean(result?.success ?? result);
    } finally {
      setBusy(false);
    }
  }, [toggle2FAMutation]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setBusy(true);
    try {
      const result = await changePasswordMutation({ currentPassword, newPassword });
      return Boolean(result?.success ?? result);
    } finally {
      setBusy(false);
    }
  }, [changePasswordMutation]);

  const requestReferralPayout = useCallback(async () => {
    setBusy(true);
    try {
      const result = await requestReferralPayoutMutation({});
      return Boolean(result?.success ?? result);
    } finally {
      setBusy(false);
    }
  }, [requestReferralPayoutMutation]);

  const ensureReferralCode = useCallback(async () => {
    const result = await ensureReferralCodeMutation({});
    return (result as { generated: boolean } | null) ?? null;
  }, [ensureReferralCodeMutation]);

  return { toggle2FA, changePassword, requestReferralPayout, ensureReferralCode, busy };
}