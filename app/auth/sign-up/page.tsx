import { signUpAction } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/card";

export default async function SignUpPage({
  searchParams
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const fromInvite = !!params.email;

  return (
    <main className="page-shell">
      <div className="container form-shell">
        <Card>
          <div className="stack-md">
            <span className="eyebrow">{fromInvite ? "Accept your invite" : "Start free"}</span>
            <h1>
              {fromInvite
                ? "Create your account to join the Family Circle."
                : "Create a warm home for family calls."}
            </h1>
            <p className="lede">
              {fromInvite
                ? "Use the email address your invite was sent to so Kynfowk can connect you to the right Family Circle automatically."
                : "Set up your account, create a Family Circle, and start planning Time Together around the moments people can actually make."}
            </p>
            <AuthForm action={signUpAction} defaultEmail={params.email} mode="sign-up" />
          </div>
        </Card>
      </div>
    </main>
  );
}
