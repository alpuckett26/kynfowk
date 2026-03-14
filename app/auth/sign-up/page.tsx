import { signUpAction } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/card";

export default function SignUpPage() {
  return (
    <main className="page-shell">
      <div className="container form-shell">
        <Card>
          <div className="stack-md">
            <span className="eyebrow">Start free</span>
            <h1>Create a warm home for family calls.</h1>
            <p className="lede">
              Set up your account, create a Family Circle, and start planning Time Together
              around the moments people can actually make.
            </p>
            <AuthForm action={signUpAction} mode="sign-up" />
          </div>
        </Card>
      </div>
    </main>
  );
}
