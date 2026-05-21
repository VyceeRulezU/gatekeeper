import { getIronSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function POST() {
  const session = await getIronSession();
  await session.destroy();
  redirect("/login");
}
export async function GET() {
  const session = await getIronSession();
  await session.destroy();
  redirect("/login");
}
