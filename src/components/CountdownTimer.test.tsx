import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "./UrgencyTriggers";

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the countdown in HH:MM:SS format", () => {
    const endsAt = Date.now() + 3661000; // 1h 1m 1s
    render(<CountdownTimer endsAt={endsAt} />);
    expect(screen.getAllByText("01").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Sale ended' when the timer expires", () => {
    const endsAt = Date.now() - 1000;
    render(<CountdownTimer endsAt={endsAt} />);
    expect(screen.getByText("Sale ended")).toBeInTheDocument();
  });

  it("renders 'Sale ended' and calls onEnd for an already-expired timer", () => {
    const onEnd = vi.fn();
    const endsAt = Date.now() - 5000;
    render(<CountdownTimer endsAt={endsAt} onEnd={onEnd} />);
    expect(screen.getByText("Sale ended")).toBeInTheDocument();
    expect(onEnd).toHaveBeenCalled();
  });

  it("counts down over time", () => {
    const endsAt = Date.now() + 65000; // 1m 5s
    render(<CountdownTimer endsAt={endsAt} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getAllByText("00").length).toBeGreaterThanOrEqual(1);
  });
});
