"use client";

import { AvailabilityPicker } from "@/components/availability-picker";
import { Card } from "@/components/card";

interface OnboardingAvailabilityPanelProps {
  pending: boolean;
  message?: string | null;
}

export function OnboardingAvailabilityPanel({
  pending,
  message,
}: OnboardingAvailabilityPanelProps) {
  return (
    <Card>
      <div className="stack-md">
        <header className="connect-greeting">
          <span className="eyebrow">Step 3 of 3</span>
          <h1>Pick your windows</h1>
          <p className="meta">
            The times that usually feel best for you. Overlap with your family
            becomes the call.
          </p>
        </header>

        <AvailabilityPicker currentSlots={[]} />

        {message ? <p className="form-message">{message}</p> : null}

        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Building your Family Circle…" : "Finish onboarding"}
        </button>
      </div>
    </Card>
  );
}
