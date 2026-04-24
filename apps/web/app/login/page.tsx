import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Kynfowk to access your family's connection score.",
};

export default function LoginPage() {
  return <LoginForm />;
}
