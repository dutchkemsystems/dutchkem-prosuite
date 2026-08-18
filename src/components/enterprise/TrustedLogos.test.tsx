import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrustedLogos } from "./TrustedLogos";

describe("TrustedLogos", () => {
  it("renders the section heading", () => {
    render(<TrustedLogos />);
    expect(screen.getByText(/Powered by Industry Leaders/i)).toBeInTheDocument();
  });

  it("renders every logo name twice (auto-scroll duplicates)", () => {
    render(<TrustedLogos />);
    for (const name of ["Paystack", "KoraPay", "Flutterwave", "OPay", "Stripe", "NVIDIA NIM", "Meta Llama", "OpenRouter"]) {
      const occurrences = screen.getAllByText(name);
      expect(occurrences.length).toBe(2);
    }
  });
});