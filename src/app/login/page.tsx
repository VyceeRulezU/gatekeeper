import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIronSession } from "@/lib/session";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In | Gatekeeper Secure Access Control",
  description: "Access your secure personal Gatekeeper dashboard. Private, local authentication built for privacy.",
};

export default async function LoginPage() {
  const session = await getIronSession();
  if (session?.user?.isLoggedIn) {
    redirect("/dashboard");
  }
  return <LoginForm />;
}
