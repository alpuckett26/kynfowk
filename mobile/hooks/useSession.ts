import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

export function useSession(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(
        data.session
          ? { status: "signed-in", session: data.session }
          : { status: "signed-out" }
      );
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(
        session
          ? { status: "signed-in", session }
          : { status: "signed-out" }
      );
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
