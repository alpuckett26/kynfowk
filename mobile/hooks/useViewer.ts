import { useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/hooks/useSession";

interface MeResponse {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    timezone: string | null;
    isSuperAdmin: boolean;
  };
  family: unknown;
}

type State =
  | { status: "loading" }
  | { status: "loaded"; isSuperAdmin: boolean; email: string | null }
  | { status: "error" };

/**
 * Lightweight wrapper around /api/native/me for components that just
 * need to know whether the viewer is a super admin (e.g. to show the
 * Admin tab). Refetches when the session changes.
 */
export function useViewer(): State {
  const session = useSession();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (session.status !== "signed-in") {
      setState({ status: "loading" });
      return;
    }
    let active = true;
    apiFetch<MeResponse>("/api/native/me")
      .then((data) => {
        if (!active) return;
        setState({
          status: "loaded",
          isSuperAdmin: Boolean(data.user.isSuperAdmin),
          email: data.user.email,
        });
      })
      .catch((e) => {
        if (!active) return;
        if (!(e instanceof ApiError)) console.warn("[useViewer] failed", e);
        setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [session.status]);

  return state;
}
