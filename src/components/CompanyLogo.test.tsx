import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompanyLogo } from "./CompanyLogo";

describe("CompanyLogo", () => {
  it("renders the brand SVG mark", () => {
    const { container } = render(<CompanyLogo />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("accepts a custom className", () => {
    const { container } = render(<CompanyLogo className="w-10 h-10" />);
    expect(container.querySelector(".w-10.h-10")).toBeInTheDocument();
  });

  it("renders the brand mark in SVG text", () => {
    render(<CompanyLogo />);
    expect(screen.getByText("Dutchkem")).toBeInTheDocument();
  });
});