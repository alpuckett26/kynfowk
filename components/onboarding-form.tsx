"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";

import type { OnboardingState } from "@/app/actions";
import { AvailabilityPicker } from "@/components/availability-picker";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationship-classifier";

const initialState: OnboardingState = {
  status: "idle"
};

export function OnboardingForm({
  action,
  defaultFullName = "",
  suggestedCircleName = ""
}: {
  action: (
    state: OnboardingState,
    formData: FormData
  ) => Promise<OnboardingState>;
  defaultFullName?: string;
  suggestedCircleName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [members, setMembers] = useState([
    { id: 1, name: "", email: "", relationship: "" }
  ]);

  const serializedMembers = useMemo(
    () =>
      members
        .map((member) => ({
          name: member.name.trim(),
          email: member.email.trim(),
          relationship: member.relationship.trim()
        }))
        .filter((member) => member.name || member.email || member.relationship)
        .map((member) => [member.name, member.email, member.relationship].join(", "))
        .join("\n"),
    [members]
  );

  const updateMember = (
    id: number,
    field: "name" | "email" | "relationship",
    value: string
  ) => {
    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, [field]: value } : member))
    );
  };

  const addMember = () => {
    setMembers((current) => [
      ...current,
      { id: Date.now(), name: "", email: "", relationship: "" }
    ]);
  };

  const removeMember = (id: number) => {
    setMembers((current) =>
      current.length === 1
        ? [{ ...current[0], name: "", email: "", relationship: "" }]
        : current.filter((member) => member.id !== id)
    );
  };

  return (
    <form className="stack-lg" action={formAction}>
      <section className="stack-md">
        <div className="section-heading compact">
          <span className="eyebrow">Step 1</span>
          <h2>Create your Family Circle</h2>
          <p>Start with a name and a short note so everyone knows what this space is for.</p>
        </div>

        <div className="field-grid two-col">
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
        </div>

        <label className="field">
          <span>Circle note</span>
          <textarea
            name="circleDescription"
            placeholder="A warm weekly check-in for grandparents, cousins, and the kids."
            rows={3}
          />
        </label>
      </section>

      <section className="stack-md">
        <div className="section-heading compact">
          <span className="eyebrow">Step 2</span>
          <h2>Add family members</h2>
          <p>Add each person in their own card so invites stay clear and easy to review.</p>
        </div>

        <input name="members" type="hidden" value={serializedMembers} />

        <div className="stack-md">
          {members.map((member, index) => (
            <div className="member-card" key={member.id}>
              <div className="section-header-row">
                <div>
                  <p className="member-card-title">Family member {index + 1}</p>
                  <p className="meta">Invite now, or leave a card blank until you are ready.</p>
                </div>
                <button
                  className="button button-ghost member-remove-button"
                  onClick={() => removeMember(member.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>

              <div className="field-grid member-card-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    onChange={(event) => updateMember(member.id, "name", event.target.value)}
                    placeholder="Grandma June"
                    value={member.name}
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    onChange={(event) => updateMember(member.id, "email", event.target.value)}
                    placeholder="june@example.com"
                    type="email"
                    value={member.email}
                  />
                </label>

                <label className="field">
                  <span>Relationship</span>
                  <select
                    onChange={(event) =>
                      updateMember(member.id, "relationship", event.target.value)
                    }
                    value={member.relationship}
                  >
                    <option value="">— Select relationship —</option>
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

          <button
            className="member-add-button"
            onClick={addMember}
            type="button"
          >
            <span className="member-add-symbol">+</span>
            Add another family member
          </button>
        </div>
      </section>

      <section className="stack-md">
        <div className="section-heading compact">
          <span className="eyebrow">Step 3</span>
          <h2>Collect availability</h2>
          <p>Select the windows that usually feel best for you. Kynfowk will turn overlap into call suggestions.</p>
        </div>

        <AvailabilityPicker currentSlots={[]} />
      </section>

      {state.message ? <p className="form-message">{state.message}</p> : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Building your Family Circle..." : "Finish onboarding"}
      </button>
    </form>
  );
}
