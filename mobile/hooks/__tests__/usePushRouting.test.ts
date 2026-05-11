/**
 * Unit tests for usePushRouting.
 *
 * The hook subscribes to expo-notifications and routes "incoming_call"
 * payloads to /calls/<id>/ring. Tests drive the listener callbacks
 * directly to verify routing behaviour.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";

import { usePushRouting } from "@/hooks/usePushRouting";
import { router } from "expo-router";

// Capture the callbacks the hook registers so we can fire them.
let responseCallback:
  | ((response: { notification: { request: { content: { data: unknown } } } }) => void)
  | null = null;
let receivedCallback:
  | ((notification: { request: { content: { data: unknown } } }) => void)
  | null = null;

beforeEach(() => {
  responseCallback = null;
  receivedCallback = null;
  (router.push as jest.Mock).mockClear();

  (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
    (cb) => {
      responseCallback = cb;
      return { remove: jest.fn() };
    },
  );
  (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(
    (cb) => {
      receivedCallback = cb;
      return { remove: jest.fn() };
    },
  );
  (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValue(
    null,
  );
});

function emitTap(data: unknown) {
  responseCallback?.({
    notification: { request: { content: { data } } },
  });
}

function emitForegroundReceive(data: unknown) {
  receivedCallback?.({
    request: { content: { data } },
  });
}

describe("usePushRouting — incoming_call payloads", () => {
  it("routes to /calls/<id>/ring on tap with caller + circle params", async () => {
    renderHook(() => usePushRouting());
    await waitFor(() => expect(responseCallback).not.toBeNull());

    emitTap({
      type: "incoming_call",
      callId: "call-123",
      callerName: "Mom",
      circleName: "The Smiths",
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    const target = (router.push as jest.Mock).mock.calls[0][0] as string;
    expect(target).toContain("/calls/call-123/ring");
    expect(target).toContain("callerName=Mom");
    expect(target).toContain("circleName=The+Smiths");
  });

  it("routes when notification arrives in foreground", async () => {
    renderHook(() => usePushRouting());
    await waitFor(() => expect(receivedCallback).not.toBeNull());

    emitForegroundReceive({
      type: "incoming_call",
      callId: "call-456",
    });

    expect(router.push).toHaveBeenCalledWith(
      expect.stringContaining("/calls/call-456/ring"),
    );
  });

  it("omits query params when callerName/circleName are missing", async () => {
    renderHook(() => usePushRouting());
    await waitFor(() => expect(responseCallback).not.toBeNull());

    emitTap({ type: "incoming_call", callId: "call-789" });

    expect(router.push).toHaveBeenCalledWith("/calls/call-789/ring");
  });
});

describe("usePushRouting — non-routing payloads", () => {
  it("does nothing when type is not 'incoming_call'", async () => {
    renderHook(() => usePushRouting());
    await waitFor(() => expect(responseCallback).not.toBeNull());

    emitTap({ type: "ring_reminder", callId: "call-1" });
    emitTap({ type: "weekly_briefing" });
    emitTap({});
    emitTap(null);

    expect(router.push).not.toHaveBeenCalled();
  });

  it("does nothing when callId is missing or not a string", async () => {
    renderHook(() => usePushRouting());
    await waitFor(() => expect(responseCallback).not.toBeNull());

    emitTap({ type: "incoming_call" });
    emitTap({ type: "incoming_call", callId: 42 });
    emitTap({ type: "incoming_call", callId: null });

    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("usePushRouting — cold-launch path", () => {
  it("processes a notification that cold-launched the app", async () => {
    (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValue(
      {
        notification: {
          request: {
            content: {
              data: {
                type: "incoming_call",
                callId: "cold-launch-call",
                callerName: "Dad",
              },
            },
          },
        },
      },
    );

    renderHook(() => usePushRouting());

    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect((router.push as jest.Mock).mock.calls[0][0]).toContain(
      "/calls/cold-launch-call/ring",
    );
  });

  it("swallows errors from getLastNotificationResponseAsync (expo-web throws)", async () => {
    (Notifications.getLastNotificationResponseAsync as jest.Mock).mockRejectedValue(
      new Error("not available on web"),
    );

    expect(() => renderHook(() => usePushRouting())).not.toThrow();
  });
});

describe("usePushRouting — cleanup", () => {
  it("removes listeners on unmount", () => {
    const responseRemove = jest.fn();
    const receivedRemove = jest.fn();
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
      remove: responseRemove,
    });
    (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
      remove: receivedRemove,
    });

    const { unmount } = renderHook(() => usePushRouting());
    unmount();

    expect(responseRemove).toHaveBeenCalled();
    expect(receivedRemove).toHaveBeenCalled();
  });
});
