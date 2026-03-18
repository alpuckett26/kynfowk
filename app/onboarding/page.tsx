import { redirect } from "next/navigation";

import { completeOnboardingAction } from "@/app/actions";
import { Card } from "@/components/card";
import { OnboardingForm } from "@/components/onboarding-form";
import { getViewer, getViewerFamilyCircle } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";

export default async function OnboardingPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="page-shell">
        <div className="container panel-shell">
          <Card>
            <div className="stack-lg">
              <div className="stack-md">
                <span className="eyebrow">Onboarding</span>
                <h1>Build your Family Circle in one pass.</h1>
                <p className="form-message">
                  Add your Supabase URL and anon key first. The onboarding flow is ready, but
                  it needs those env vars to save data.
                </p>
              </div>

              <OnboardingForm action={completeOnboardingAction} />
            </div>
          </Card>
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

  // Pull name from OAuth metadata (Google / Facebook both provide full_name)
  const oauthName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";

  // Suggest "[Last Name] Family Circle" from the OAuth name
  const lastName = oauthName.trim().split(" ").at(-1) ?? "";
  const suggestedCircleName = lastName ? `${lastName} Family Circle` : "";

  return (
    <main className="page-shell">
      <div className="container panel-shell">
        <Card>
          <div className="stack-lg">
            <div className="stack-md">
              <span className="eyebrow">Onboarding</span>
              <h1>Build your Family Circle in one pass.</h1>
              <p className="lede">
                Create the circle, add relatives, and share the windows that feel realistic
                for recurring or one-off calls.
              </p>
            </div>

            <OnboardingForm
              action={completeOnboardingAction}
              defaultFullName={oauthName}
              suggestedCircleName={suggestedCircleName}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}
