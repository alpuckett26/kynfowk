import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendPush } from "@/lib/send-push";

type FetchImpl = (
  url: string | URL | Request,
  init?: RequestInit,
) => Response | Promise<Response>;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("FUNCTIONS_SECRET", "test-functions-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("sendPush — environment", () => {
  it("throws when FUNCTIONS_SECRET is not set", async () => {
    vi.stubEnv("FUNCTIONS_SECRET", "");
    await expect(
      sendPush({ userIds: ["u1"], title: "t", body: "b" }),
    ).rejects.toThrow(/FUNCTIONS_SECRET/);
  });
});

describe("sendPush — request shape", () => {
  it("POSTs to /functions/v1/send-notification with bearer auth", async () => {
    const fetchMock = vi.fn<FetchImpl>(() =>
      Promise.resolve(
        jsonResponse({
          attempted: 1,
          successes: 1,
          failures: 0,
          invalidated: 0,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendPush({
      userIds: ["u1", "u2"],
      title: "Hello",
      body: "World",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://test.supabase.co/functions/v1/send-notification",
    );
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-functions-secret",
      },
    });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      user_ids: ["u1", "u2"],
      title: "Hello",
      body: "World",
      data: undefined,
    });
  });

  it("forwards data payload but strips undefined values", async () => {
    const fetchMock = vi.fn<FetchImpl>(() =>
      Promise.resolve(
        jsonResponse({
          attempted: 1,
          successes: 1,
          failures: 0,
          invalidated: 0,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendPush({
      userIds: ["u1"],
      title: "Ring",
      body: "Family",
      data: {
        type: "incoming_call",
        deepLink: "kynfowk://calls/abc",
        callId: "abc",
        ringExpiresAt: undefined,
      },
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.data).toEqual({
      type: "incoming_call",
      deepLink: "kynfowk://calls/abc",
      callId: "abc",
    });
    expect(body.data).not.toHaveProperty("ringExpiresAt");
  });
});

describe("sendPush — response handling", () => {
  it("returns parsed JSON on success", async () => {
    const expected = {
      attempted: 3,
      successes: 2,
      failures: 1,
      invalidated: 0,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse(expected))),
    );

    const result = await sendPush({
      userIds: ["u1", "u2", "u3"],
      title: "t",
      body: "b",
    });
    expect(result).toEqual(expected);
  });

  it("throws on non-OK response with the status + body in the message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("internal error", { status: 503 }),
        ),
      ),
    );

    await expect(
      sendPush({ userIds: ["u1"], title: "t", body: "b" }),
    ).rejects.toThrow(/send-notification failed: 503/);
  });
});
