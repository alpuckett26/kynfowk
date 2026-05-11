import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendExpoPushToUsers } from "@/lib/expo-push";

// Mock the admin Supabase client so we can drive the push_subscriptions
// lookup + invalidation deletion without touching real network/DB.
const selectMock = vi.fn();
const deleteFromMock = vi.fn();
const deleteInMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => {
  return {
    createSupabaseAdminClient: () => ({
      from: (table: string) => {
        if (table !== "push_subscriptions") {
          throw new Error(`Unexpected table in test: ${table}`);
        }
        return {
          select: () => ({ in: selectMock }),
          delete: () => ({ in: deleteInMock }),
        };
      },
    }),
  };
});

beforeEach(() => {
  selectMock.mockReset();
  deleteFromMock.mockReset();
  deleteInMock.mockReset();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs?.();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOnce(impl: () => Response | Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockFetchSequence(responses: Array<() => Response | Promise<Response>>) {
  let i = 0;
  const fetchMock = vi.fn(() => {
    const r = responses[i++];
    if (!r) throw new Error(`fetch called more times than expected (${i})`);
    return r();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sendExpoPushToUsers — early exits", () => {
  it("returns zeros when userIds is empty (no admin call, no fetch)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendExpoPushToUsers({
      userIds: [],
      title: "t",
      body: "b",
    });

    expect(result).toEqual({
      attempted: 0,
      successes: 0,
      failures: 0,
      invalidated: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("returns zeros when no push_subscriptions rows match", async () => {
    selectMock.mockResolvedValueOnce({ data: [], error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendExpoPushToUsers({
      userIds: ["user-1"],
      title: "t",
      body: "b",
    });

    expect(result).toEqual({
      attempted: 0,
      successes: 0,
      failures: 0,
      invalidated: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores subscriptions whose endpoint does not start with 'expo:'", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        { id: "s1", user_id: "u1", endpoint: "https://web-push/abc" },
        { id: "s2", user_id: "u1", endpoint: "fcm://something" },
      ],
      error: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendExpoPushToUsers({
      userIds: ["u1"],
      title: "t",
      body: "b",
    });

    expect(result.attempted).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sendExpoPushToUsers — successful dispatch", () => {
  it("posts one push per expo: subscription, increments successes", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        { id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[AAA]" },
        { id: "s2", user_id: "u2", endpoint: "expo:ExponentPushToken[BBB]" },
      ],
      error: null,
    });
    const fetchMock = mockFetchSequence([
      () => jsonResponse({ data: { id: "ticket-1", status: "ok" } }),
      () => jsonResponse({ data: { id: "ticket-2", status: "ok" } }),
    ]);

    const result = await sendExpoPushToUsers({
      userIds: ["u1", "u2"],
      title: "Caller is calling you",
      body: "Family Circle",
      data: { type: "incoming_call", callId: "c-1" },
    });

    expect(result).toEqual({
      attempted: 2,
      successes: 2,
      failures: 0,
      invalidated: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      to: "ExponentPushToken[AAA]",
      title: "Caller is calling you",
      body: "Family Circle",
      sound: "default",
      priority: "high",
      data: { type: "incoming_call", callId: "c-1" },
    });
  });

  it("strips undefined values from data payload", async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[X]" }],
      error: null,
    });
    const fetchMock = mockFetchOnce(() =>
      jsonResponse({ data: { id: "t", status: "ok" } }),
    );

    await sendExpoPushToUsers({
      userIds: ["u1"],
      title: "t",
      body: "b",
      data: {
        type: "incoming_call",
        callId: "c-1",
        circleName: undefined,
      },
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.data).toEqual({ type: "incoming_call", callId: "c-1" });
    expect(body.data).not.toHaveProperty("circleName");
  });

  it("sets Authorization header when EXPO_ACCESS_TOKEN is set", async () => {
    vi.stubEnv("EXPO_ACCESS_TOKEN", "secret-token");
    selectMock.mockResolvedValueOnce({
      data: [{ id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[X]" }],
      error: null,
    });
    const fetchMock = mockFetchOnce(() =>
      jsonResponse({ data: { id: "t", status: "ok" } }),
    );

    await sendExpoPushToUsers({ userIds: ["u1"], title: "t", body: "b" });

    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-token");
  });

  it("omits Authorization header when EXPO_ACCESS_TOKEN unset", async () => {
    vi.stubEnv("EXPO_ACCESS_TOKEN", "");
    selectMock.mockResolvedValueOnce({
      data: [{ id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[X]" }],
      error: null,
    });
    const fetchMock = mockFetchOnce(() =>
      jsonResponse({ data: { id: "t", status: "ok" } }),
    );

    await sendExpoPushToUsers({ userIds: ["u1"], title: "t", body: "b" });

    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });
});

describe("sendExpoPushToUsers — failure modes", () => {
  it("counts http-non-OK responses as failures", async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[X]" }],
      error: null,
    });
    mockFetchOnce(() => new Response("server error", { status: 500 }));

    const result = await sendExpoPushToUsers({
      userIds: ["u1"],
      title: "t",
      body: "b",
    });

    expect(result.attempted).toBe(1);
    expect(result.successes).toBe(0);
    expect(result.failures).toBe(1);
    expect(result.invalidated).toBe(0);
  });

  it("counts payload.errors as failures", async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[X]" }],
      error: null,
    });
    mockFetchOnce(() =>
      jsonResponse({
        errors: [{ code: "RATE_LIMITED", message: "too many" }],
      }),
    );

    const result = await sendExpoPushToUsers({
      userIds: ["u1"],
      title: "t",
      body: "b",
    });

    expect(result.failures).toBe(1);
    expect(result.successes).toBe(0);
  });

  it("invalidates and deletes DeviceNotRegistered tokens", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        { id: "stale-id", user_id: "u1", endpoint: "expo:ExponentPushToken[OLD]" },
        { id: "good-id", user_id: "u1", endpoint: "expo:ExponentPushToken[NEW]" },
      ],
      error: null,
    });
    deleteInMock.mockResolvedValueOnce({ error: null });
    mockFetchSequence([
      () =>
        jsonResponse({
          data: {
            status: "error",
            message: "device gone",
            details: { error: "DeviceNotRegistered" },
          },
        }),
      () => jsonResponse({ data: { id: "t", status: "ok" } }),
    ]);

    const result = await sendExpoPushToUsers({
      userIds: ["u1"],
      title: "t",
      body: "b",
    });

    expect(result).toEqual({
      attempted: 2,
      successes: 1,
      failures: 0,
      invalidated: 1,
    });
    expect(deleteInMock).toHaveBeenCalledTimes(1);
    expect(deleteInMock).toHaveBeenCalledWith("id", ["stale-id"]);
  });

  it("counts non-DeviceNotRegistered ticket errors as failures (not invalidated)", async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[X]" }],
      error: null,
    });
    mockFetchOnce(() =>
      jsonResponse({
        data: {
          status: "error",
          message: "boom",
          details: { error: "MessageTooBig" },
        },
      }),
    );

    const result = await sendExpoPushToUsers({
      userIds: ["u1"],
      title: "t",
      body: "b",
    });

    expect(result.failures).toBe(1);
    expect(result.invalidated).toBe(0);
    expect(deleteInMock).not.toHaveBeenCalled();
  });

  it("counts thrown fetch errors as failures", async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ id: "s1", user_id: "u1", endpoint: "expo:ExponentPushToken[X]" }],
      error: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("network down");
      }),
    );

    const result = await sendExpoPushToUsers({
      userIds: ["u1"],
      title: "t",
      body: "b",
    });

    expect(result.failures).toBe(1);
    expect(result.attempted).toBe(1);
    expect(result.successes).toBe(0);
  });
});
