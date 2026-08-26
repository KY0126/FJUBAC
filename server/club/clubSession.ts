import type { Request, Response } from "express";
import { parse } from "cookie";
import { jwtVerify, SignJWT } from "jose";
import type { User } from "../../drizzle/schema";
import { getUserById } from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";

const CLUB_SESSION_COOKIE = "club_session";
const CLUB_SETUP_COOKIE = "club_setup";
const encoder = new TextEncoder();

function secret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for club account sessions");
  return encoder.encode(ENV.cookieSecret);
}

async function signToken(subject: number, tokenType: "club_session" | "club_setup", expiresIn: string) {
  return new SignJWT({ type: tokenType })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(subject))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

async function resolveToken(req: Request, cookieName: string, expectedType: "club_session" | "club_setup") {
  const value = parse(req.headers.cookie ?? "")[cookieName];
  if (!value) return null;
  try {
    const { payload } = await jwtVerify(value, secret());
    if (payload.type !== expectedType || !payload.sub) return null;
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

export async function getClubSessionUser(req: Request) {
  const userId = await resolveToken(req, CLUB_SESSION_COOKIE, "club_session");
  if (!userId) return null;
  const user = await getUserById(userId);
  return user?.accountStatus === "active" ? user : null;
}

export async function getClubSetupUserId(req: Request) {
  return resolveToken(req, CLUB_SETUP_COOKIE, "club_setup");
}

export async function setClubSession(res: Response, req: Request, user: User) {
  const token = await signToken(user.id, "club_session", "7d");
  res.cookie(CLUB_SESSION_COOKIE, token, { ...getSessionCookieOptions(req), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function setClubSetupSession(res: Response, req: Request, userId: number) {
  const token = await signToken(userId, "club_setup", "15m");
  res.cookie(CLUB_SETUP_COOKIE, token, { ...getSessionCookieOptions(req), maxAge: 15 * 60 * 1000 });
}

export function clearClubSession(res: Response, req: Request) {
  const options = getSessionCookieOptions(req);
  res.clearCookie(CLUB_SESSION_COOKIE, { ...options, maxAge: -1 });
  res.clearCookie(CLUB_SETUP_COOKIE, { ...options, maxAge: -1 });
}

export function clearClubSetupSession(res: Response, req: Request) {
  res.clearCookie(CLUB_SETUP_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
}
