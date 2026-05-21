import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIronSession } from "@/lib/session";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up | Gatekeeper Premium Access Control",
  description: "Create a secure Gatekeeper account. Built from the ground up for privacy, performance, and peace of mind.",
};

export default async function SignupPage() {
  const session = await getIronSession();
  if (session?.user?.isLoggedIn) {
    redirect("/dashboard");
  }
  return <SignupForm />;
}
