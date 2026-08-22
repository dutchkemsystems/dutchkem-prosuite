import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock("./CompanyLogo", () => ({
  CompanyLogo: ({ className }: { className?: string }) => (
    <div className={className} data-testid="company-logo">Dutchkem</div>
  ),
}));

describe("Footer", () => {
  it("renders the company registration info", () => {
    render(<Footer />);
    expect(screen.getAllByText(/RC: 9489855/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the address and contact details", () => {
    render(<Footer />);
    expect(screen.getByText(/26, Opeki Road/)).toBeInTheDocument();
    expect(screen.getByText(/contact@dutchkem.com/)).toBeInTheDocument();
  });

  it("renders the system status indicator", () => {
    render(<Footer />);
    expect(screen.getByText(/SYSTEMS STATUS: OPTIMAL/)).toBeInTheDocument();
  });

  it("renders footer column headings", () => {
    render(<Footer />);
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Legal")).toBeInTheDocument();
  });

  it("renders social media icon buttons", () => {
    const { container } = render(<Footer />);
    const socialButtons = container.querySelectorAll("button");
    const socialIcons = Array.from(socialButtons).filter(
      (btn) => btn.textContent === "𝕏" || btn.textContent === "📸" || btn.textContent === "💼"
    );
    expect(socialIcons.length).toBe(3);
  });
});
