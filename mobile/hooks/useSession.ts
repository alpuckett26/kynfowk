import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { registerForPushAsync } from "@/lib/push";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

export function useSession(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    let lastRegisteredUserId: string | null = null;

    const maybeRegisterPush = (session: Session | null) => {
      if (!session?.user?.id) return;
      if (lastRegisteredUserId === session.user.id) return;
      lastRegisteredUserId = session.user.id;
      // Fire-and-forget. Idempotent server-side; permission prompt
      // appears once per device. Required for incoming-call rings —
      // ring/route.ts dispatches via Expo Push to push_subscriptions.
      void registerForPushAsync().catch(() => {});
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(
        data.session
          ? { status: "signed-in", session: data.session }
          : { status: "signed-out" }
      );
      maybeRegisterPush(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(
        session
          ? { status: "signed-in", session }
          : { status: "signed-out" }
      );
      maybeRegisterPush(session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
