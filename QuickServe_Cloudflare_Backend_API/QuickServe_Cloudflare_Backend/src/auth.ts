import { createMiddleware } from "hono/factory";
import { SignJWT, jwtVerify } from "jose";
import type { Env, AppVariables, AuthUser, Role } from "./types";

const enc = new TextEncoder();

function secret(env: Env) {
  return enc.encode(env.JWT_SECRET);
}

export async function createToken(env: Env, user: AuthUser) {
  return new SignJWT({ email: user.email, full_name: user.full_name, role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(env.JWT_ISSUER || "quickserve-api")
    .setAudience(env.JWT_AUDIENCE || "quickserve-client")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret(env));
}

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Bearer token required" } }, 401);
  }
  try {
    const token = header.slice(7);
    const verified = await jwtVerify(token, secret(c.env), {
      issuer: c.env.JWT_ISSUER || "quickserve-api",
      audience: c.env.JWT_AUDIENCE || "quickserve-client"
    });
    const payload = verified.payload;
    const user: AuthUser = {
      id: String(payload.sub),
      email: String(payload.email),
      full_name: String(payload.full_name),
      role: String(payload.role) as Role
    };
    c.set("user", user);
    return next();
  } catch {
    return c.json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } }, 401);
  }
});

export function roles(...allowed: Role[]) {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
    const user = c.get("user");
    if (!allowed.includes(user.role)) {
      return c.json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, 403);
    }
    return next();
  });
}
