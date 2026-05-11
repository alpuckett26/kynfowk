/**
 * Unit tests for useSession.
 *
 * The hook reflects supabase.auth state through a 3-state machine
 * (loading → signed-in / signed-out) and fires push-token registration
 * exactly once per signed-in user_id.
 */

import { renderHook, waitFor, act } from "@testing-library/react-native";

import { useSession } from "../useSession";

// jest.mock() factories are hoisted; only vars prefixed with "mock" are
// allowed inside them. Use a shared object so tests can swap behaviour.
const mockState: {
  authChangeCallback: ((event: string, session: any) => void) | null;
  getSession: jest.Mock;
  unsubscribe: jest.Mock;
  registerForPush: jest.Mock;
} = {
  authChangeCallback: null,
  getSession: jest.fn(),
  unsubscribe: jest.fn(),
  registerForPush: jest.fn(() => Promise.resolve()),
};

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockState.getSession(),
      onAuthStateChange: (cb: (event: string, session: any) => void) => {
        mockState.authChangeCallback = cb;
        return {
          data: { subscription: { unsubscribe: mockState.unsubscribe } },
        };
      },
    },
  },
}));

jest.mock("../../lib/push", () => ({
  registerForPushAsync: () => mockState.registerForPush(),
}));

beforeEach(() => {
  mockState.authChangeCallback = null;
  mockState.getSession.mockReset();
  mockState.unsubscribe.mockReset();
  mockState.registerForPush.mockReset();
  mockState.registerForPush.mockImplementation(() => Promise.resolve());
});

describe("useSession — initial state", () => {
  it("returns loading before getSession resolves", () => {
    mockState.getSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe("loading");
  });

  it("transitions to signed-in when an active session exists", async () => {
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    if (result.current.status === "signed-in") {
      expect(result.current.session.user.id).toBe("u1");
    }
  });

  it("transitions to signed-out when no session exists", async () => {
    mockState.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("signed-out"));
  });
});

describe("useSession — auth state changes", () => {
  it("updates state when onAuthStateChange fires", async () => {
    mockState.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("signed-out"));

    await act(async () => {
      mockState.authChangeCallback?.("SIGNED_IN", { user: { id: "u2" } });
    });
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
  });

  it("unsubscribes on unmount", async () => {
    mockState.getSession.mockResolvedValue({ data: { session: null } });
    const { unmount } = renderHook(() => useSession());
    await waitFor(() => expect(mockState.authChangeCallback).not.toBeNull());
    unmount();
    expect(mockState.unsubscribe).toHaveBeenCalled();
  });
});

describe("useSession — push registration", () => {
  it("registers push exactly once per signed-in user_id", async () => {
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    renderHook(() => useSession());
    await waitFor(() =>
      expect(mockState.registerForPush).toHaveBeenCalledTimes(1),
    );

    // Same user signing in again should not re-register.
    await act(async () => {
      mockState.authChangeCallback?.("TOKEN_REFRESHED", { user: { id: "u1" } });
    });
    expect(mockState.registerForPush).toHaveBeenCalledTimes(1);
  });

  it("does not register for a signed-out session", async () => {
    mockState.getSession.mockResolvedValue({ data: { session: null } });
    renderHook(() => useSession());
    await waitFor(() => expect(mockState.getSession).toHaveBeenCalled());
    expect(mockState.registerForPush).not.toHaveBeenCalled();
  });

  it("re-registers when a different user signs in", async () => {
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    renderHook(() => useSession());
    await waitFor(() =>
      expect(mockState.registerForPush).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      mockState.authChangeCallback?.("SIGNED_IN", { user: { id: "u2" } });
    });
    await waitFor(() =>
      expect(mockState.registerForPush).toHaveBeenCalledTimes(2),
    );
  });

  it("swallows registerForPushAsync rejections", async () => {
    mockState.registerForPush.mockReturnValueOnce(
      Promise.reject(new Error("permission denied")),
    );
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    // No throw — reaching this assertion is the test.
  });
});
