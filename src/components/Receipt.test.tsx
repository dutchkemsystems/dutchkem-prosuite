import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Receipt } from "./Receipt";

const defaultProps = {
  transactionId: "TXN-12345",
  amount: 25000,
  service: "AI Content Writing",
  agent: "ContentAgent",
  date: "22 Aug 2026",
  status: "completed",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  receiptNumber: "DKV-ABC123",
};

describe("Receipt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("renders the receipt number and transaction details", () => {
    render(<Receipt {...defaultProps} />);
    expect(screen.getByText("DKV-ABC123")).toBeInTheDocument();
    expect(screen.getByText("TXN-12345")).toBeInTheDocument();
    expect(screen.getByText("AI Content Writing")).toBeInTheDocument();
  });

  it("displays the customer name and email", () => {
    render(<Receipt {...defaultProps} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("shows the total amount in Naira", () => {
    render(<Receipt {...defaultProps} />);
    expect(screen.getByText("₦25,000")).toBeInTheDocument();
  });

  it("shows download and email buttons", () => {
    render(<Receipt {...defaultProps} />);
    expect(screen.getByText(/Download PDF/)).toBeInTheDocument();
    expect(screen.getByText(/Send to Email/)).toBeInTheDocument();
  });

  it("renders the company logo in the receipt header", () => {
    const { container } = render(<Receipt {...defaultProps} />);
    const logo = container.querySelector(".relative.flex.items-center.gap-4");
    expect(logo).toBeInTheDocument();
  });
});
