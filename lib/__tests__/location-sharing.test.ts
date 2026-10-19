import { describe, expect, it } from "vitest";

import { getLocationShareValidationError, isImmediateLocationRecipient } from "@/lib/location-sharing";

describe("location sharing", () => {
  it("only selects signed-in immediate family other than the viewer", () => {
    const viewer = { viewerMembershipId: "me", viewerRole: "owner" as const, viewerRelationshipLabel: null };
    expect(isImmediateLocationRecipient({ ...viewer, memberId: "mom", memberRole: "member", userId: "user-2", relationshipLabel: "Mother" })).toBe(true);
    expect(isImmediateLocationRecipient({ ...viewer, memberId: "cousin", memberRole: "member", userId: "user-3", relationshipLabel: "Cousin" })).toBe(false);
    expect(isImmediateLocationRecipient({ ...viewer, memberId: "child", memberRole: "member", userId: null, relationshipLabel: "Daughter" })).toBe(false);
    expect(isImmediateLocationRecipient({ ...viewer, memberId: "me", memberRole: "owner", userId: "user-1", relationshipLabel: "Sibling" })).toBe(false);
    expect(isImmediateLocationRecipient({ ...viewer, viewerRole: "member", memberId: "cousin", memberRole: "member", userId: "user-3", relationshipLabel: "Cousin", explicitlyImmediate: true })).toBe(true);
  });

  it("accepts only bounded coordinates and supported expiry windows", () => {
    expect(getLocationShareValidationError({ latitude: 41.9, longitude: -87.6, durationHours: 8 })).toBeNull();
    expect(getLocationShareValidationError({ latitude: 91, longitude: 0, durationHours: 1 })).toMatch(/latitude/);
    expect(getLocationShareValidationError({ latitude: 0, longitude: -181, durationHours: 1 })).toMatch(/longitude/);
    expect(getLocationShareValidationError({ latitude: 0, longitude: 0, durationHours: 2 })).toMatch(/1, 8, or 24/);
  });
});
