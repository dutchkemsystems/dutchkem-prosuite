import { render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HolidayBanner } from "./HolidayBanner";

const discount = {
  banner_text: "50% OFF ALL AGENTS",
  banner_icon: "🎉",
  ends_at: Date.now() + 86400000, // 1 day
};

const mockedQuery = useSuspenseQuery as ReturnType<typeof vi.fn>;

describe("HolidayBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedQuery.mockReturnValue({ data: discount });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders nothing when no discount is active", () => {
    mockedQuery.mockReturnValue({ data: null });
    render(<HolidayBanner />);
    expect(screen.queryByText(/OFF ALL AGENTS/i)).not.toBeInTheDocument();
  });

  it("renders the banner text and icon", () => {
    render(<HolidayBanner />);
    expect(screen.getAllByText(/OFF ALL AGENTS/i).length).toBeGreaterThan(0);
    expect(screen.getByText("🎉")).toBeInTheDocument();
  });

  it("shows a live countdown", () => {
    render(<HolidayBanner />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/\d+d \d+h \d+m/)).toBeInTheDocument();
  });

  it("dismisses the banner when the close button is clicked", () => {
    render(<HolidayBanner />);
    fireEvent.click(screen.getByTitle("Close"));
    expect(screen.queryByText(/OFF ALL AGENTS/i)).not.toBeInTheDocument();
  });
});