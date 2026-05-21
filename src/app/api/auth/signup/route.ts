import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signupSchema } from "@/lib/validation";
import { getIronSession } from "@/lib/session";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getIronSession();
  const body = await req.json();
  const parseResult = signupSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.issues[0].message }), { status: 400 });
  }
  const { email, name, password } = parseResult.data;
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return new Response(JSON.stringify({ error: "Email already registered" }), { status: 409 });
  }
  const hash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, name, passwordHash: hash } });
  // Set session
  session.user = { id: user.id, name: user.name, isLoggedIn: true };
  await session.save();
  return new Response(JSON.stringify({ id: user.id, name: user.name }), { status: 201 });
}
