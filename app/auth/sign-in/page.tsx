import { signInAction } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/card";

export default function SignInPage() {
  return (
    <main className="page-shell">
      <div className="container form-shell">
        <Card>
          <div className="stack-md">
            <span className="eyebrow">Welcome back</span>
            <h1>Open your Family Circle dashboard.</h1>
            <p className="lede">
              Sign in to view upcoming calls, recent family activity, and your latest
              Time Together stats.
            </p>
            <AuthForm action={signInAction} mode="sign-in" />
          </div>
        </Card>
      </div>
    </main>
  );
}
