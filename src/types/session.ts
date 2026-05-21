// src/types/session.ts
import type { IronSessionData } from "iron-session";

export interface SessionData {
  user?: {
    id: string;
    name: string;
    isLoggedIn: boolean;
  };
}

declare module "iron-session" {
  interface IronSessionData extends SessionData {}
}
