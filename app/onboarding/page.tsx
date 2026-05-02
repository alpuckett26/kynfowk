import { redirect } from "next/navigation";

import { completeOnboardingAction } from "@/app/actions";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getViewer, getViewerFamilyCircle } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";

export default async function OnboardingPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="page-shell">
        <div className="container">
          <p className="form-message">
            Add your Supabase URL and anon key first. Onboarding is ready —
            it just needs those env vars to save data.
          </p>
        </div>
      </main>
    );
  }

  const user = await getViewer();
  if (!user) {
    redirect("/auth/sign-up");
  }

  const family = await getViewerFamilyCircle(user.id);
  if (family) {
    redirect("/dashboard");
  }

  const oauthName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";
  const lastName = oauthName.trim().split(" ").at(-1) ?? "";
  const suggestedCircleName = lastName ? `${lastName} Family Circle` : "";

  return (
    <OnboardingShell
      action={completeOnboardingAction}
      defaultFullName={oauthName}
      suggestedCircleName={suggestedCircleName}
    />
  );
}
