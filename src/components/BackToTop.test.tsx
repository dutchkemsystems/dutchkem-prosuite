import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackToTop } from "./BackToTop";

describe("BackToTop", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when scroll position is below the threshold", () => {
    render(<BackToTop />);
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();
  });

  it("appears after scrolling past 300px", () => {
    render(<BackToTop />);
    Object.defineProperty(window, "scrollY", { value: 400, writable: true, configurable: true });
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: "Back to top" })).toBeInTheDocument();
  });

  it("scrolls to top when clicked", () => {
    Object.defineProperty(window, "scrollY", { value: 400, writable: true, configurable: true });
    render(<BackToTop />);
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole("button", { name: "Back to top" }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});