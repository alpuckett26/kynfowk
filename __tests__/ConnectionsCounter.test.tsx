import { render, screen } from "@testing-library/react";
import { ConnectionsCounter } from "@/components/ConnectionsCounter";
import type { ConnectionMetrics } from "@/lib/types";

const baseMetrics: ConnectionMetrics = {
  completedCalls: 3,
  totalMinutes: 122,
  uniqueMembersThisWeek: 4,
  streakWeeks: 4,
  connectionScore: 28,
  firstReconnections: 1,
  elderCalls: 2,
};

describe("ConnectionsCounter", () => {
  it("renders the family name when provided", () => {
    render(<ConnectionsCounter metrics={baseMetrics} familyName="Smith" />);
    expect(screen.getByText(/Smith's Connections/i)).toBeInTheDocument();
  });

  it("renders all four stat tiles", () => {
    render(<ConnectionsCounter metrics={baseMetrics} />);
    expect(screen.getByText("Moments Shared")).toBeInTheDocument();
    expect(screen.getByText("Time Together")).toBeInTheDocument();
    expect(screen.getByText("People Connected")).toBeInTheDocument();
    expect(screen.getByText("Streak")).toBeInTheDocument();
  });

  it("shows the streak badge when streakWeeks > 0", () => {
    render(<ConnectionsCounter metrics={baseMetrics} />);
    expect(screen.getByText(/4-week Reconnection Streak/i)).toBeInTheDocument();
  });

  it("does not show streak badge when streakWeeks is 0", () => {
    render(
      <ConnectionsCounter metrics={{ ...baseMetrics, streakWeeks: 0 }} />
    );
    expect(
      screen.queryByText(/Reconnection Streak/i)
    ).not.toBeInTheDocument();
  });

  it("shows empty state when no calls completed", () => {
    render(
      <ConnectionsCounter
        metrics={{
          ...baseMetrics,
          completedCalls: 0,
          connectionScore: 0,
          firstReconnections: 0,
          elderCalls: 0,
        }}
      />
    );
    expect(screen.getByText(/Your first call is waiting/i)).toBeInTheDocument();
  });

  it("shows reconnection bonus when firstReconnections > 0", () => {
    render(<ConnectionsCounter metrics={baseMetrics} />);
    expect(screen.getByText(/reconnection/i)).toBeInTheDocument();
  });

  it("shows elder bonus when elderCalls > 0", () => {
    render(<ConnectionsCounter metrics={baseMetrics} />);
    expect(screen.getByText(/Elder included/i)).toBeInTheDocument();
  });
});
