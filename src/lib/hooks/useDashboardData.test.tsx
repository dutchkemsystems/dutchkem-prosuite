import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  toggle2FA: vi.fn(),
  changePassword: vi.fn(),
  requestPayout: vi.fn(),
  ensureReferralCode: vi.fn(),
}));

vi.mock("convex/react", async (importActual) => {
  const actual = await importActual<typeof import("convex/react")>();
  // Resolve the real api refs so mutation identity maps to the right mock.
  let refs: Record<string, unknown> = {};
  try {
    const { api } = await import("./../../../convex/_generated/api");
    refs = {
      toggle2FA: api.client_actions?.toggle2FA,
      changePassword: api.client_actions?.changeClientPassword,
      requestPayout: api.client_actions?.requestReferralPayout,
      ensureReferralCode: api.client_actions?.ensureReferralCode,
    };
  } catch {
    refs = {};
  }
  return {
    ...actual,
    useConvex: vi.fn(() => ({ query: () => mocks.query() })),
    useMutation: vi.fn((ref: unknown) => {
      if (ref === refs.toggle2FA) return () => mocks.toggle2FA;
      if (ref === refs.changePassword) return () => mocks.changePassword;
      if (ref === refs.requestPayout) return () => mocks.requestPayout;
      if (ref === refs.ensureReferralCode) return () => mocks.ensureReferralCode;
      return () => vi.fn();
    }),
  };
});

import { useDashboardData } from "./useDashboardData";
import { useDashboardActions } from "./useDashboardActions";

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches dashboard data once on mount", async () => {
    const payload = { user: { _id: "u1", email: "a@b.com" }, notifications: [] };
    mocks.query.mockResolvedValue(payload);

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.data).toEqual(payload));
    expect(result.current.loadError).toBeNull();
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error when the fetch fails", async () => {
    mocks.query.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loadError).toBe("boom"));
    expect(result.current.data).toBeUndefined();
  });

  it("updates data via setData", async () => {
    mocks.query.mockResolvedValue({ user: { _id: "u1" } });
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => {
      result.current.setData((prev: any) => ({
        ...prev,
        user: { ...prev.user, referralCode: "REF1" },
      }));
    });
    expect(result.current.data?.user.referralCode).toBe("REF1");
  });
});

describe("useDashboardActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles 2FA and returns success", async () => {
    mocks.toggle2FA.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDashboardActions());

    const ok = await act(() => result.current.toggle2FA());
    expect(ok).toBe(true);
  });

  it("changes password and returns success", async () => {
    mocks.changePassword.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDashboardActions());

    const ok = await act(() => result.current.changePassword("old", "new"));
    expect(ok).toBe(true);
  });
});