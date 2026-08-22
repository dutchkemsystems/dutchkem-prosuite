import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentSupportButton } from "./AgentSupportButton";

vi.mock("./CustomerSupportChat", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-chat">
      <button onClick={onClose}>Close Chat</button>
    </div>
  ),
}));

describe("AgentSupportButton", () => {
  it("renders the help button with text", () => {
    render(<AgentSupportButton agentId="agent-1" agentName="TestAgent" />);
    expect(screen.getByText("Need Help?")).toBeInTheDocument();
  });

  it("renders the headphone emoji icon", () => {
    render(<AgentSupportButton agentId="agent-1" agentName="TestAgent" />);
    expect(screen.getByText("🎧")).toBeInTheDocument();
  });

  it("opens the support chat when clicked", () => {
    render(<AgentSupportButton agentId="agent-1" agentName="TestAgent" />);
    fireEvent.click(screen.getByText("Need Help?"));
    expect(screen.getByTestId("mock-chat")).toBeInTheDocument();
  });

  it("closes the support chat when close is triggered", () => {
    render(<AgentSupportButton agentId="agent-1" agentName="TestAgent" />);
    fireEvent.click(screen.getByText("Need Help?"));
    fireEvent.click(screen.getByText("Close Chat"));
    expect(screen.queryByTestId("mock-chat")).not.toBeInTheDocument();
  });
});
