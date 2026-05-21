import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation";
import { getIronSession } from "@/lib/session";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getIronSession();
  const body = await req.json();
  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.issues[0].message }), { status: 400 });
  }
  const { email, password } = parseResult.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
  }
  session.user = { id: user.id, name: user.name, isLoggedIn: true };
  await session.save();
  return new Response(JSON.stringify({ id: user.id, name: user.name }), { status: 200 });
}
