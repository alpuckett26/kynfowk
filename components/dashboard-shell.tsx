"use client";

import { type ReactNode, useCallback, useRef } from "react";

import { ConnectPanel, type ConnectPanelProps } from "@/components/panels/connect-panel";
import { PlanPanel, type PlanPanelProps } from "@/components/panels/plan-panel";
import { SwipeShell } from "@/components/swipe-shell";

interface DashboardShellProps {
  connect: Omit<ConnectPanelProps, "onSchedule">;
  plan: PlanPanelProps;
  /** Earn and Family are pre-rendered server components passed as slots. */
  earnPanel: ReactNode;
  familyPanel: ReactNode;
}

/**
 * M50 — composes the four-panel signed-in shell. Connect is the default
 * panel; tapping "Find a time to schedule" in Connect swipes to Plan.
 * Earn and Family are rendered as ReactNode slots so the heavy server-
 * component pieces (FamilyManagementList, AdSlot's billing query) stay
 * on the server side of the boundary.
 */
export function DashboardShell({
  connect,
  plan,
  earnPanel,
  familyPanel,
}: DashboardShellProps) {
  // We need a way for ConnectPanel to ask the shell to swipe to Plan.
  // SwipeShell exposes its scroll behavior through its tab buttons; we
  // mimic that by scrolling the matching panel into view from a callback.
  const scrollToPanel = useCallback((panelId: string) => {
    document
      .getElementById(panelId)
      ?.scrollIntoView({ behavior: "smooth", inline: "start" });
  }, []);

  // Stash callbacks in a ref so we don't re-create panel JSX every render.
  const panelsRef = useRef([
    {
      id: "connect",
      label: "Connect",
      content: (
        <ConnectPanel {...connect} onSchedule={() => scrollToPanel("plan")} />
      ),
    },
    {
      id: "plan",
      label: "Plan",
      content: <PlanPanel {...plan} />,
    },
    {
      id: "earn",
      label: "Earn",
      content: earnPanel,
    },
    {
      id: "family",
      label: "Family",
      content: familyPanel,
    },
  ]);

  return <SwipeShell panels={panelsRef.current} hashSync initialPanelId="connect" />;
}
