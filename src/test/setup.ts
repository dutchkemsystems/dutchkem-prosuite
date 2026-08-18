import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  useConvex: vi.fn(),
  useConvexClient: vi.fn(),
}));

vi.mock("@convex-dev/react-query", () => ({
  useQuery: vi.fn(),
  useSuspenseQuery: vi.fn(),
  convexQuery: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(() => ({ signIn: vi.fn(), signOut: vi.fn() })),
  useConvexAuth: vi.fn(() => ({ isAuthenticated: false, isLoading: false })),
  ConvexAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

globalThis.ResizeObserver = globalThis.ResizeObserver === undefined
  ? class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  : globalThis.ResizeObserver;