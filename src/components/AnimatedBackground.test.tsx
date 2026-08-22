import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedBackground } from "./AnimatedBackground";

describe("AnimatedBackground", () => {
  it("renders the background container", () => {
    const { container } = render(<AnimatedBackground />);
    expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
  });

  it("renders floating dot elements", () => {
    const { container } = render(<AnimatedBackground />);
    const dots = container.querySelectorAll(".absolute.rounded-full.pointer-events-none");
    expect(dots.length).toBe(12);
  });

  it("accepts a variant prop without errors", () => {
    const { container } = render(<AnimatedBackground variant="dashboard" />);
    expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
  });

  it("defaults to login variant", () => {
    const { container } = render(<AnimatedBackground />);
    const bg = container.querySelector(".fixed.inset-0");
    expect(bg).not.toBeNull();
    expect(bg?.getAttribute("style")).toContain("linear-gradient");
  });
});
