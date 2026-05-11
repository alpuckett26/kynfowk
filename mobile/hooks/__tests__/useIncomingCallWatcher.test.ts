/**
 * Unit tests for useIncomingCallWatcher.
 *
 * Mocks ../../lib/supabase to control Realtime + REST calls, and the
 * shared ring-dedupe module so test isolation isn't affected by the
 * module-level Set. Drives the postgres_changes callback directly and
 * asserts what the hook does next.
 *
 * Note on import paths: jest.mock() with the @/ alias hits a path-
 * resolution edge case when combined with a mock factory in the test
 * file. Sibling tests (useSession.test.ts) confirmed relative imports
 * work without surprises, so we use ../../lib/* here.
 */

import { renderHook, waitFor, act } from "@testing-library/react-native";
import { router } from "expo-router";

import { useIncomingCallWatcher } from "../useIncomingCallWatcher";

// jest.mock() factories are hoisted; only `mock*`-prefixed vars are
// reachable inside them. Hold all swap-able state on one object.
const mockState: {
  postgresHandler: ((payload: { new: any }) => void) | null;
  authChange: ((event: string, session: any) => void) | null;
  getSession: jest.Mock;
  unsubscribeAuth: jest.Mock;
  removeChannel: jest.Mock;
  channelSubscribe: jest.Mock;
  from: jest.Mock;
  dedupe: { hasSeen: jest.Mock; mark: jest.Mock; clear: jest.Mock };
} = {
  postgresHandler: null,
  authChange: null,
  getSession: jest.fn(),
  unsubscribeAuth: jest.fn(),
  removeChannel: jest.fn(() => Promise.resolve()),
  channelSubscribe: jest.fn(),
  from: jest.fn(),
  dedupe: {
    hasSeen: jest.fn(() => false),
    mark: jest.fn(),
    clear: jest.fn(),
  },
};

jest.mock("../../lib/supabase", () => ({
  supabase: {
    channel: () => ({
      on: (_event: string, _filter: unknown, handler: (p: { new: any }) => void) => {
        mockState.postgresHandler = handler;
        return { subscribe: mockState.channelSubscribe };
      },
    }),
    removeChannel: (...args: unknown[]) => mockState.removeChannel(...args),
    from: (...args: unknown[]) => mockState.from(...args),
    auth: {
      getSession: () => mockState.getSession(),
      onAuthStateChange: (cb: (event: string, session: any) => void) => {
        mockState.authChange = cb;
        return { data: { subscription: { unsubscribe: mockState.unsubscribeAuth } } };
      },
    },
  },
}));

jest.mock("../../lib/ring-dedupe", () => ({
  hasSeenRing: (id: string) => mockState.dedupe.hasSeen(id),
  markRingSeen: (id: string) => mockState.dedupe.mark(id),
  clearSeenRings: () => mockState.dedupe.clear(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIEWER_ID = "viewer-user-id";
const CALLER_ID = "caller-user-id";

function signInAs(userId: string) {
  mockState.getSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
  });
}

function signOut() {
  mockState.getSession.mockResolvedValue({ data: { session: null } });
}

function mockParticipantsAndCircle(opts: {
  participants: Array<{
    membership_id: string;
    family_memberships:
      | { user_id: string | null; display_name: string }
      | Array<{ user_id: string | null; display_name: string }>;
  }>;
  circleName?: string;
  circleError?: { message: string };
}) {
  mockState.from.mockImplementation((table: string) => {
    if (table === "call_participants") {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: opts.participants, error: null }),
        }),
      };
    }
    if (table === "family_circles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.circleName ? { name: opts.circleName } : null,
                error: opts.circleError ?? null,
              }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

async function fireRing(row: {
  id: string;
  family_circle_id: string;
  created_by: string;
}) {
  await waitFor(() => expect(mockState.postgresHandler).not.toBeNull());
  await act(async () => {
    await mockState.postgresHandler!({ new: row });
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockState.postgresHandler = null;
  mockState.authChange = null;
  mockState.getSession.mockReset();
  mockState.unsubscribeAuth.mockReset();
  mockState.removeChannel.mockReset();
  mockState.removeChannel.mockResolvedValue(undefined as any);
  mockState.channelSubscribe.mockReset();
  // The hook assigns the .subscribe() return value to `channel` and
  // later passes it to removeChannel during teardown. Return a token
  // so `channel` is truthy and the cleanup path runs.
  mockState.channelSubscribe.mockReturnValue({ __channel: true });
  mockState.from.mockReset();
  mockState.dedupe.hasSeen.mockReset();
  mockState.dedupe.hasSeen.mockReturnValue(false);
  mockState.dedupe.mark.mockReset();
  mockState.dedupe.clear.mockReset();
  (router.push as jest.Mock).mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIncomingCallWatcher — subscription lifecycle", () => {
  it("does nothing when signed-out (no channel, no subscribe)", async () => {
    signOut();
    renderHook(() => useIncomingCallWatcher());
    await waitFor(() => expect(mockState.getSession).toHaveBeenCalled());
    expect(mockState.channelSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes once signed in", async () => {
    signInAs(VIEWER_ID);
    renderHook(() => useIncomingCallWatcher());
    await waitFor(() => expect(mockState.channelSubscribe).toHaveBeenCalled());
  });

  it("tears down channel + auth subscription on unmount", async () => {
    signInAs(VIEWER_ID);
    const { unmount } = renderHook(() => useIncomingCallWatcher());
    await waitFor(() => expect(mockState.channelSubscribe).toHaveBeenCalled());
    unmount();
    expect(mockState.removeChannel).toHaveBeenCalled();
    expect(mockState.unsubscribeAuth).toHaveBeenCalled();
  });

  it("clears seen-rings when the viewer changes", async () => {
    signInAs(VIEWER_ID);
    renderHook(() => useIncomingCallWatcher());
    await waitFor(() => expect(mockState.authChange).not.toBeNull());

    // First call from null → VIEWER_ID was during getSession; clear ran.
    const callsBefore = mockState.dedupe.clear.mock.calls.length;

    await act(async () => {
      mockState.authChange?.("SIGNED_IN", { user: { id: "other-user" } });
    });
    expect(mockState.dedupe.clear.mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });
});

describe("useIncomingCallWatcher — ring routing", () => {
  beforeEach(() => signInAs(VIEWER_ID));

  it("ignores self-initiated rings", async () => {
    renderHook(() => useIncomingCallWatcher());
    mockParticipantsAndCircle({ participants: [] });
    await fireRing({
      id: "call-1",
      family_circle_id: "circle-1",
      created_by: VIEWER_ID,
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("skips rings already in the shared dedupe set", async () => {
    renderHook(() => useIncomingCallWatcher());
    mockState.dedupe.hasSeen.mockReturnValueOnce(true);
    await fireRing({
      id: "call-2",
      family_circle_id: "circle-1",
      created_by: CALLER_ID,
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("warns + bails when no participants resolve after retries", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => useIncomingCallWatcher());
    mockParticipantsAndCircle({ participants: [] });

    await fireRing({
      id: "call-3",
      family_circle_id: "circle-1",
      created_by: CALLER_ID,
    });

    expect(router.push).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[m100]"),
      "call-3",
    );
    warnSpy.mockRestore();
  }, 15000);

  it("ignores rings where viewer isn't a participant", async () => {
    renderHook(() => useIncomingCallWatcher());
    mockParticipantsAndCircle({
      participants: [
        {
          membership_id: "m-caller",
          family_memberships: { user_id: CALLER_ID, display_name: "Caller" },
        },
      ],
      circleName: "Family",
    });
    await fireRing({
      id: "call-4",
      family_circle_id: "circle-1",
      created_by: CALLER_ID,
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("routes with callerName + circleName when viewer is a participant", async () => {
    renderHook(() => useIncomingCallWatcher());
    mockParticipantsAndCircle({
      participants: [
        {
          membership_id: "m-caller",
          family_memberships: { user_id: CALLER_ID, display_name: "Mom" },
        },
        {
          membership_id: "m-viewer",
          family_memberships: { user_id: VIEWER_ID, display_name: "Me" },
        },
      ],
      circleName: "The Smiths",
    });
    await fireRing({
      id: "call-5",
      family_circle_id: "circle-1",
      created_by: CALLER_ID,
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    const target = (router.push as jest.Mock).mock.calls[0][0] as string;
    expect(target).toContain("/calls/call-5/ring");
    expect(target).toContain("callerName=Mom");
    expect(target).toContain("circleName=The+Smiths");
    expect(mockState.dedupe.mark).toHaveBeenCalledWith("call-5");
  });

  it("handles family_memberships returned as an array (Supabase nested-select polymorphism)", async () => {
    renderHook(() => useIncomingCallWatcher());
    mockParticipantsAndCircle({
      participants: [
        {
          membership_id: "m-caller",
          family_memberships: [
            { user_id: CALLER_ID, display_name: "Dad" },
          ],
        },
        {
          membership_id: "m-viewer",
          family_memberships: [
            { user_id: VIEWER_ID, display_name: "Me" },
          ],
        },
      ],
      circleName: "Family",
    });
    await fireRing({
      id: "call-6",
      family_circle_id: "circle-1",
      created_by: CALLER_ID,
    });

    const target = (router.push as jest.Mock).mock.calls[0][0] as string;
    expect(target).toContain("callerName=Dad");
  });

  it("falls back to 'A family member' when caller's membership is missing", async () => {
    renderHook(() => useIncomingCallWatcher());
    mockParticipantsAndCircle({
      participants: [
        {
          membership_id: "m-viewer",
          family_memberships: { user_id: VIEWER_ID, display_name: "Me" },
        },
      ],
      circleName: "Family",
    });
    await fireRing({
      id: "call-7",
      family_circle_id: "circle-1",
      created_by: CALLER_ID,
    });

    const target = (router.push as jest.Mock).mock.calls[0][0] as string;
    // URLSearchParams encodes spaces as `+`, not `%20`.
    expect(target).toContain("callerName=A+family+member");
  });

  it("warns when family_circles lookup returns an error", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => useIncomingCallWatcher());
    mockParticipantsAndCircle({
      participants: [
        {
          membership_id: "m-viewer",
          family_memberships: { user_id: VIEWER_ID, display_name: "Me" },
        },
        {
          membership_id: "m-caller",
          family_memberships: { user_id: CALLER_ID, display_name: "Mom" },
        },
      ],
      circleError: { message: "RLS denied" },
    });
    await fireRing({
      id: "call-8",
      family_circle_id: "circle-1",
      created_by: CALLER_ID,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("family_circles"),
      "RLS denied",
    );
    expect(router.push).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
