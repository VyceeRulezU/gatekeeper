// src/lib/session.ts
import { getIronSession as getIronSessionLib } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "@/types/session";

export const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: process.env.SESSION_COOKIE_NAME || "gatekeeper_session",
  // In dev we allow http, in prod secure flag will be true automatically
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getIronSession() {
  return await getIronSessionLib<SessionData>(await cookies(), sessionOptions);
}
