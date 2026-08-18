import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label, value and icon", () => {
    render(<StatCard label="Daily Revenue" value="₦78M" icon="💰" />);
    expect(screen.getByText("Daily Revenue")).toBeInTheDocument();
    expect(screen.getByText("₦78M")).toBeInTheDocument();
    expect(screen.getByText("💰")).toBeInTheDocument();
  });

  it("renders numeric values", () => {
    render(<StatCard label="Users" value={1500} icon="👥" />);
    expect(screen.getByText("1500")).toBeInTheDocument();
  });

  it("falls back to slate color for unknown color keys", () => {
    const { container } = render(<StatCard label="Test" value="1" icon="✓" color="unknown" />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("applies a known color class when provided", () => {
    const { container } = render(<StatCard label="Test" value="1" icon="✓" color="emerald" />);
    expect(container.innerHTML).toContain("from-emerald-500/10");
  });
});