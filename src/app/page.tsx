import { redirect } from "next/navigation";
import { getIronSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getIronSession();
  if (session?.user?.isLoggedIn) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
