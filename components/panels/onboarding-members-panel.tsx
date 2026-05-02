"use client";

import { Card } from "@/components/card";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationship-classifier";

export interface OnboardingMember {
  id: number;
  name: string;
  email: string;
  relationship: string;
}

interface OnboardingMembersPanelProps {
  members: OnboardingMember[];
  serializedMembers: string;
  onUpdate: (id: number, field: "name" | "email" | "relationship", value: string) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  onContinue: () => void;
}

export function OnboardingMembersPanel({
  members,
  serializedMembers,
  onUpdate,
  onAdd,
  onRemove,
  onContinue,
}: OnboardingMembersPanelProps) {
  return (
    <Card>
      <div className="stack-md">
        <header className="connect-greeting">
          <span className="eyebrow">Step 2 of 3</span>
          <h1>Add family</h1>
          <p className="meta">Invite now or leave blank for later.</p>
        </header>

        <input name="members" type="hidden" value={serializedMembers} />

        <div className="stack-md">
          {members.map((member, index) => (
            <div className="member-card" key={member.id}>
              <div className="section-header-row">
                <p className="member-card-title">Member {index + 1}</p>
                <button
                  className="button button-ghost member-remove-button"
                  onClick={() => onRemove(member.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <div className="field-grid member-card-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    onChange={(e) => onUpdate(member.id, "name", e.target.value)}
                    placeholder="Grandma June"
                    value={member.name}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    onChange={(e) => onUpdate(member.id, "email", e.target.value)}
                    placeholder="june@example.com"
                    type="email"
                    value={member.email}
                  />
                </label>
                <label className="field">
                  <span>Relationship</span>
                  <select
                    onChange={(e) => onUpdate(member.id, "relationship", e.target.value)}
                    value={member.relationship}
                  >
                    <option value="">— Select —</option>
                    {RELATIONSHIP_OPTIONS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}

          <button className="member-add-button" onClick={onAdd} type="button">
            <span className="member-add-symbol">+</span>
            Add another
          </button>
        </div>

        <button type="button" className="button button-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </Card>
  );
}
