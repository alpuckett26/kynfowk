"use client";

import { useActionState, useMemo, useState } from "react";

import type { OnboardingState } from "@/app/actions";
import { OnboardingAvailabilityPanel } from "@/components/panels/onboarding-availability-panel";
import { OnboardingCirclePanel } from "@/components/panels/onboarding-circle-panel";
import {
  OnboardingMembersPanel,
  type OnboardingMember,
} from "@/components/panels/onboarding-members-panel";
import { SwipeShell } from "@/components/swipe-shell";

const initialState: OnboardingState = { status: "idle" };

interface OnboardingShellProps {
  action: (
    state: OnboardingState,
    formData: FormData
  ) => Promise<OnboardingState>;
  defaultFullName?: string;
  suggestedCircleName?: string;
}

/**
 * M50 — onboarding rebuilt as three swipeable panels matching the new
 * dashboard shell. The HTML form wraps the SwipeShell so every input
 * across all three panels is part of the single submit at the end —
 * no need to track / merge form state across panels.
 *
 * The dynamic members list still lives in component state because it
 * needs add/remove/edit interactions; its serialization to a hidden
 * field matches the old `serializedMembers` shape so the existing
 * `completeOnboardingAction` server action keeps working unchanged.
 */
export function OnboardingShell({
  action,
  defaultFullName = "",
  suggestedCircleName = "",
}: OnboardingShellProps) {
  const [, formAction, pending] = useActionState(action, initialState);
  const [members, setMembers] = useState<OnboardingMember[]>([
    { id: 1, name: "", email: "", relationship: "" },
  ]);

  const serializedMembers = useMemo(
    () =>
      members
        .map((m) => ({
          name: m.name.trim(),
          email: m.email.trim(),
          relationship: m.relationship.trim(),
        }))
        .filter((m) => m.name || m.email || m.relationship)
        .map((m) => [m.name, m.email, m.relationship].join(", "))
        .join("\n"),
    [members]
  );

  const updateMember = (
    id: number,
    field: "name" | "email" | "relationship",
    value: string
  ) => {
    setMembers((cur) =>
      cur.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };
  const addMember = () => {
    setMembers((cur) => [
      ...cur,
      { id: Date.now(), name: "", email: "", relationship: "" },
    ]);
  };
  const removeMember = (id: number) => {
    setMembers((cur) =>
      cur.length === 1
        ? [{ ...cur[0], name: "", email: "", relationship: "" }]
        : cur.filter((m) => m.id !== id)
    );
  };

  const swipeTo = (panelId: string) => {
    document
      .getElementById(panelId)
      ?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };

  return (
    <form action={formAction}>
      <SwipeShell
        hashSync={false}
        initialPanelId="circle"
        tabIndicatorVariant="dots"
        panels={[
          {
            id: "circle",
            label: "Circle",
            content: (
              <OnboardingCirclePanel
                defaultFullName={defaultFullName}
                suggestedCircleName={suggestedCircleName}
                onContinue={() => swipeTo("members")}
              />
            ),
          },
          {
            id: "members",
            label: "Members",
            content: (
              <OnboardingMembersPanel
                members={members}
                serializedMembers={serializedMembers}
                onUpdate={updateMember}
                onAdd={addMember}
                onRemove={removeMember}
                onContinue={() => swipeTo("availability")}
              />
            ),
          },
          {
            id: "availability",
            label: "Availability",
            content: <OnboardingAvailabilityPanel pending={pending} />,
          },
        ]}
      />
    </form>
  );
}
