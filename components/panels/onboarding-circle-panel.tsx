"use client";

import { Card } from "@/components/card";

interface OnboardingCirclePanelProps {
  defaultFullName?: string;
  suggestedCircleName?: string;
  onContinue: () => void;
}

export function OnboardingCirclePanel({
  defaultFullName = "",
  suggestedCircleName = "",
  onContinue,
}: OnboardingCirclePanelProps) {
  return (
    <Card>
      <div className="stack-md">
        <header className="connect-greeting">
          <span className="eyebrow">Step 1 of 3</span>
          <h1>Name your Family Circle</h1>
          <p className="meta">A short name and a sentence is plenty.</p>
        </header>

        <label className="field">
          <span>Your full name</span>
          <input
            defaultValue={defaultFullName}
            name="fullName"
            placeholder="Jordan Ellis"
            required
          />
        </label>

        <label className="field">
          <span>Circle name</span>
          <input
            defaultValue={suggestedCircleName}
            name="circleName"
            placeholder="Ellis Sunday Circle"
            required
          />
        </label>

        <label className="field">
          <span>Circle note (optional)</span>
          <textarea
            name="circleDescription"
            placeholder="A warm weekly check-in for grandparents, cousins, and the kids."
            rows={2}
          />
        </label>

        <details>
          <summary>More about you (optional)</summary>
          <div className="stack-sm" style={{ marginTop: "0.75rem" }}>
            <label className="field">
              <span>Phone</span>
              <input name="phoneNumber" placeholder="(555) 867-5309" type="tel" />
            </label>
            <label className="field">
              <span>Address</span>
              <input name="address" placeholder="123 Main St, Atlanta, GA" />
            </label>
          </div>
        </details>

        <button type="button" className="button button-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </Card>
  );
}
