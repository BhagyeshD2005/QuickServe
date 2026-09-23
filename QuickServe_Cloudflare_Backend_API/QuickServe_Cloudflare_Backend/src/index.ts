import { Hono } from "hono";
import { cors } from "hono/cors";
import { createToken, requireAuth, roles } from "./auth";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { hashPassword, verifyPassword } from "./security";
import { audit, nextRequestNumber } from "./db";
import type { Env, AppVariables, Role, Status, Priority } from "./types";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", async (c, next) => {
  const origin = c.env.CORS_ORIGINS || "*";
  return cors({
    origin: origin === "*" ? "*" : origin.split(",").map(x => x.trim()),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400
  })(c, next);
});

app.use("*", async (c, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error", err instanceof Error ? err.message : String(err));
    try { await audit(c.env, null, "DATABASE_ERROR", undefined, undefined, { path: c.req.path }); } catch {}
    return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
  }
});

app.get("/", c => c.json({
  success: true,
  name: c.env.APP_NAME || "QuickServe API",
  version: "1.0.0",
  status: "online",
  docs: "/api"
}));

app.get("/health", async c => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first();
  return c.json({ success: true, status: row?.ok === 1 ? "healthy" : "degraded" });
});

app.get("/api", c => c.json({
  success: true,
  endpoints: {
    auth: ["/api/auth/register","/api/auth/login","/api/auth/google","/api/auth/me","/api/auth/change-password"],
    services: ["/api/services"],
    requests: ["/api/requests","/api/requests/:id","/api/requests/:id/status","/api/requests/:id/notes"],
    agent: ["/api/agent/requests","/api/agent/requests/:id","/api/agent/requests/:id/accept","/api/agent/requests/:id/reject","/api/agent/requests/:id/start","/api/agent/requests/:id/complete","/api/agent/requests/:id/notes"],
    admin: ["/api/admin/dashboard","/api/admin/users","/api/admin/users/:userId/role","/api/admin/requests","/api/admin/requests/:id/assign","/api/admin/audit-logs"]
  }
}));

function cleanEmail(v: unknown) { return String(v ?? "").trim().toLowerCase(); }
function str(v: unknown) { return String(v ?? "").trim(); }

const googleJWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function verifyGoogleIdToken(idToken: string, clientId: string) {
  const { payload } = await jwtVerify(idToken, googleJWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"]
  });

  const sub = str(payload.sub);
  const email = cleanEmail(payload.email);
  const name = str(payload.name) || email.split("@")[0] || "Google User";
  const picture = str(payload.picture) || null;
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";

  if (!sub || !email || !emailVerified) {
    throw new Error("GOOGLE_IDENTITY_INVALID");
  }

  return { sub, email, name, picture };
}


app.patch("/api/admin/users/:userId/role", requireAuth, roles("ADMIN"), async (c) => {
  const requestId = c.req.header("X-Request-ID") || crypto.randomUUID();
  const admin = c.get("user");
  const userId = c.req.param("userId");

  let body: { role?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        request_id: requestId
      }
    }, 400);
  }

  const requestedRole = String(body?.role ?? "").toUpperCase();

  // This endpoint intentionally supports only CUSTOMER -> AGENT promotion.
  if (requestedRole !== "AGENT") {
    return c.json({
      success: false,
      error: {
        code: "INVALID_ROLE",
        message: "Only CUSTOMER to AGENT promotion is allowed",
        request_id: requestId
      }
    }, 400);
  }

  const target = await c.env.DB.prepare(`
    SELECT id, email, full_name, phone, role, is_active, created_at
    FROM users
    WHERE id = ?
  `).bind(userId).first<{
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: Role;
    is_active: number;
    created_at: string;
  }>();

  if (!target) {
    return c.json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Target user not found",
        request_id: requestId
      }
    }, 404);
  }

  if (target.role !== "CUSTOMER") {
    return c.json({
      success: false,
      error: {
        code: "INVALID_ROLE_TRANSITION",
        message: `Only CUSTOMER users can be promoted to AGENT. Current role: ${target.role}`,
        request_id: requestId
      }
    }, 409);
  }

  await c.env.DB.prepare(`
    UPDATE users
    SET role = 'AGENT'
    WHERE id = ? AND role = 'CUSTOMER'
  `).bind(userId).run();

  const updated = await c.env.DB.prepare(`
    SELECT id, email, full_name, phone, role, is_active, created_at
    FROM users
    WHERE id = ?
  `).bind(userId).first();

  try {
    await audit(
      c.env,
      admin.id,
      "USER_ROLE_UPDATED",
      "USER",
      userId,
      {
        previous_role: "CUSTOMER",
        new_role: "AGENT"
      }
    );
  } catch (auditError) {
    console.error("Failed to write role-change audit log", {
      request_id: requestId,
      admin_id: admin.id,
      target_user_id: userId,
      error: auditError instanceof Error ? auditError.message : String(auditError)
    });
  }

  return c.json({
    success: true,
    data: {
      user: updated
    },
    message: "Customer promoted to service agent successfully"
  });
});

app.post("/api/auth/register", async c => {
  const body = await c.req.json<any>();
  const email = cleanEmail(body.email);
  const password = str(body.password);
  const full_name = str(body.full_name);
  const phone = str(body.phone) || null;

  if (!email || !password || !full_name) {
    return c.json({ success:false, error:{code:"VALIDATION_ERROR",message:"email, password and full_name are required"}},400);
  }
  if (password.length < 8) {
    return c.json({ success:false,error:{code:"VALIDATION_ERROR",message:"Password must be at least 8 characters"}},400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return c.json({success:false,error:{code:"EMAIL_EXISTS",message:"Email is already registered"}},409);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const hash = await hashPassword(password);

  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO users (id,email,password_hash,full_name,phone,role,is_active,created_at,updated_at)
      VALUES (?,?,?,?,?,'CUSTOMER',1,?,?)`).bind(id,email,hash,full_name,phone,now,now),
    c.env.DB.prepare(`INSERT INTO profiles (user_id) VALUES (?)`).bind(id)
  ]);
  await audit(c.env,id,"REGISTER_SUCCESS","USER",id);

  const user = {id,email,full_name,role:"CUSTOMER" as Role};
  const token = await createToken(c.env,user);
  return c.json({success:true,data:{user,token}},201);
});

app.post("/api/auth/login", async c => {
  const body = await c.req.json<any>();
  const email = cleanEmail(body.email);
  const password = str(body.password);
  const row = await c.env.DB.prepare(`
    SELECT id,email,password_hash,full_name,role,is_active FROM users WHERE email = ?
  `).bind(email).first<any>();

  if (!row || !row.is_active || !(await verifyPassword(password,row.password_hash))) {
    await audit(c.env,row?.id ?? null,"LOGIN_FAILED","USER",row?.id ?? undefined);
    return c.json({success:false,error:{code:"INVALID_CREDENTIALS",message:"Invalid email or password"}},401);
  }

  const user = {id:row.id,email:row.email,full_name:row.full_name,role:row.role as Role};
  const token = await createToken(c.env,user);
  await audit(c.env,row.id,"LOGIN_SUCCESS","USER",row.id);
  return c.json({success:true,data:{user,token}});
});

app.post("/api/auth/google", async c => {
  const body = await c.req.json<any>();
  const idToken = str(body.id_token);
  const clientId = str(c.env.GOOGLE_CLIENT_ID);

  if (!idToken) {
    return c.json({ success:false, error:{ code:"VALIDATION_ERROR", message:"id_token is required" } }, 400);
  }
  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID is not configured");
    return c.json({ success:false, error:{ code:"GOOGLE_AUTH_NOT_CONFIGURED", message:"Google authentication is not configured" } }, 500);
  }

  let google;
  try {
    google = await verifyGoogleIdToken(idToken, clientId);
  } catch (err) {
    console.error("Google token verification failed", err instanceof Error ? err.message : String(err));
    await audit(c.env, null, "LOGIN_FAILED", "AUTH", undefined, { provider:"GOOGLE" });
    return c.json({ success:false, error:{ code:"INVALID_GOOGLE_TOKEN", message:"Invalid Google ID token" } }, 401);
  }

  let row = await c.env.DB.prepare(`
    SELECT id,email,password_hash,full_name,phone,role,is_active,google_id
    FROM users WHERE google_id=?
  `).bind(google.sub).first<any>();

  if (!row) {
    row = await c.env.DB.prepare(`
      SELECT id,email,password_hash,full_name,phone,role,is_active,google_id
      FROM users WHERE email=?
    `).bind(google.email).first<any>();
  }

  const now = new Date().toISOString();

  if (row) {
    if (!row.is_active) {
      await audit(c.env, row.id, "LOGIN_FAILED", "USER", row.id, { provider:"GOOGLE", reason:"INACTIVE_USER" });
      return c.json({ success:false, error:{ code:"ACCOUNT_DISABLED", message:"This account is disabled" } }, 403);
    }

    if (row.google_id && row.google_id !== google.sub) {
      await audit(c.env, row.id, "AUTHORIZATION_FAILED", "USER", row.id, { provider:"GOOGLE", reason:"GOOGLE_ACCOUNT_MISMATCH" });
      return c.json({ success:false, error:{ code:"GOOGLE_ACCOUNT_MISMATCH", message:"This email is linked to a different Google account" } }, 409);
    }

    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE users SET google_id=?,updated_at=? WHERE id=?").bind(google.sub, now, row.id),
      c.env.DB.prepare("UPDATE profiles SET avatar_url=? WHERE user_id=?").bind(google.picture, row.id)
    ]);

    const user = { id:row.id, email:row.email, full_name:row.full_name, role:row.role as Role };
    const token = await createToken(c.env, user);
    await audit(c.env, row.id, "LOGIN_SUCCESS", "USER", row.id, { provider:"GOOGLE" });
    return c.json({ success:true, data:{ user, token } });
  }

  const id = crypto.randomUUID();
  // Google-only accounts still satisfy the existing NOT NULL password_hash schema.
  // This value is intentionally not a usable password and cannot be used to sign in.
  const unusablePasswordHash = `google-only$${crypto.randomUUID()}`;

  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO users (id,email,password_hash,full_name,role,is_active,google_id,created_at,updated_at)
      VALUES (?,?,?,?, 'CUSTOMER',1,?,?,?)`).bind(id,google.email,unusablePasswordHash,google.name,google.sub,now,now),
    c.env.DB.prepare("INSERT INTO profiles (user_id,avatar_url) VALUES (?,?)").bind(id,google.picture)
  ]);

  const user = { id, email:google.email, full_name:google.name, role:"CUSTOMER" as Role };
  const token = await createToken(c.env, user);
  await audit(c.env, id, "REGISTER_SUCCESS", "USER", id, { provider:"GOOGLE" });
  await audit(c.env, id, "LOGIN_SUCCESS", "USER", id, { provider:"GOOGLE" });
  return c.json({ success:true, data:{ user, token } }, 201);
});

app.get("/api/auth/me", requireAuth, async c => {
  const u = c.get("user");
  const row = await c.env.DB.prepare(`
    SELECT u.id,u.email,u.full_name,u.phone,u.role,p.address,p.avatar_url,u.created_at
    FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?
  `).bind(u.id).first();
  return c.json({success:true,data:row});
});

app.post("/api/auth/change-password", requireAuth, async c => {
  const body = await c.req.json<any>();
  const current = str(body.current_password);
  const next = str(body.new_password);
  if (next.length < 8) return c.json({success:false,error:{code:"VALIDATION_ERROR",message:"New password must be at least 8 characters"}},400);
  const row = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(c.get("user").id).first<any>();
  if (!row || !(await verifyPassword(current,row.password_hash))) {
    return c.json({success:false,error:{code:"INVALID_PASSWORD",message:"Current password is incorrect"}},400);
  }
  const hash = await hashPassword(next);
  await c.env.DB.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").bind(hash,new Date().toISOString(),c.get("user").id).run();
  await audit(c.env,c.get("user").id,"PASSWORD_CHANGED","USER",c.get("user").id);
  return c.json({success:true,message:"Password changed"});
});

app.get("/api/services", async c => {
  const {results} = await c.env.DB.prepare("SELECT * FROM services WHERE is_active=1 ORDER BY name").all();
  return c.json({success:true,data:results});
});

app.post("/api/requests", requireAuth, roles("CUSTOMER","ADMIN"), async c => {
  const user = c.get("user");
  const body = await c.req.json<any>();
  const service_id = str(body.service_id);
  const description = str(body.description);
  const preferred_at = str(body.preferred_at);
  const address = str(body.address);
  const priority = str(body.priority || "MEDIUM").toUpperCase() as Priority;

  if (!service_id || !description || !preferred_at || !address || !["LOW","MEDIUM","HIGH"].includes(priority)) {
    return c.json({success:false,error:{code:"VALIDATION_ERROR",message:"service_id, description, preferred_at, address and valid priority are required"}},400);
  }
  const service = await c.env.DB.prepare("SELECT id FROM services WHERE id=? AND is_active=1").bind(service_id).first();
  if (!service) return c.json({success:false,error:{code:"SERVICE_NOT_FOUND",message:"Service not found"}},404);

  const id = crypto.randomUUID();
  const reqNo = await nextRequestNumber(c.env);
  const now = new Date().toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO service_requests
      (id,request_number,customer_id,service_id,description,preferred_at,address,priority,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?, 'CREATED',?,?)`)
      .bind(id,reqNo,user.id,service_id,description,preferred_at,address,priority,now,now),
    c.env.DB.prepare(`INSERT INTO request_status_history
      (id,request_id,old_status,new_status,changed_by,note,created_at)
      VALUES (?,?,NULL,'CREATED',?,?,?)`).bind(crypto.randomUUID(),id,user.id,"Request created",now)
  ]);
  await audit(c.env,user.id,"REQUEST_CREATED","REQUEST",id,{request_number:reqNo});
  return c.json({success:true,data:{id,request_number:reqNo}},201);
});

app.get("/api/requests", requireAuth, async c => {
  const user = c.get("user");
  const status = c.req.query("status");
  const q = c.req.query("q");
  let sql = `
    SELECT r.*, s.name service_name, u.full_name customer_name, a.full_name agent_name
    FROM service_requests r
    JOIN services s ON s.id=r.service_id
    JOIN users u ON u.id=r.customer_id
    LEFT JOIN users a ON a.id=r.assigned_agent_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (user.role === "CUSTOMER") { sql += " AND r.customer_id=?"; params.push(user.id); }
  if (user.role === "AGENT") { sql += " AND r.assigned_agent_id=?"; params.push(user.id); }
  if (status) { sql += " AND r.status=?"; params.push(status.toUpperCase()); }
  if (q) { sql += " AND (r.request_number LIKE ? OR r.description LIKE ?)"; params.push(`%${q}%`,`%${q}%`); }
  sql += " ORDER BY r.created_at DESC LIMIT 100";
  const stmt = c.env.DB.prepare(sql);
  const {results} = await stmt.bind(...params).all();
  return c.json({success:true,data:results});
});

app.get("/api/requests/:id", requireAuth, async c => {
  const user = c.get("user");
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(`
    SELECT r.*, s.name service_name, s.description service_description,
           u.full_name customer_name,u.email customer_email,u.phone customer_phone,
           a.full_name agent_name,a.email agent_email
    FROM service_requests r
    JOIN services s ON s.id=r.service_id
    JOIN users u ON u.id=r.customer_id
    LEFT JOIN users a ON a.id=r.assigned_agent_id
    WHERE r.id=?
  `).bind(id).first<any>();
  if (!row) return c.json({success:false,error:{code:"NOT_FOUND",message:"Request not found"}},404);
  if (user.role === "CUSTOMER" && row.customer_id !== user.id) {
    await audit(c.env,user.id,"AUTHORIZATION_FAILED","REQUEST",id);
    return c.json({success:false,error:{code:"FORBIDDEN",message:"You can only access your own requests"}},403);
  }
  if (user.role === "AGENT" && row.assigned_agent_id !== user.id) {
    await audit(c.env,user.id,"AUTHORIZATION_FAILED","REQUEST",id);
    return c.json({success:false,error:{code:"FORBIDDEN",message:"You can only access assigned requests"}},403);
  }

  const history = await c.env.DB.prepare(`
    SELECT h.*,u.full_name changed_by_name FROM request_status_history h
    JOIN users u ON u.id=h.changed_by WHERE h.request_id=? ORDER BY h.created_at ASC
  `).bind(id).all();
  const notes = await c.env.DB.prepare(`
    SELECT n.*,u.full_name author_name FROM request_notes n
    JOIN users u ON u.id=n.author_id WHERE n.request_id=? ORDER BY n.created_at ASC
  `).bind(id).all();

  return c.json({success:true,data:{request:row,history:history.results,notes:notes.results}});
});

const transitions: Record<string,string[]> = {
  CREATED:["ASSIGNED","CANCELLED"],
  ASSIGNED:["ACCEPTED","CANCELLED"],
  ACCEPTED:["IN_PROGRESS","CANCELLED"],
  IN_PROGRESS:["COMPLETED","CANCELLED"],
  COMPLETED:[],
  CANCELLED:[]
};

app.patch("/api/requests/:id/status", requireAuth, async c => {
  const user = c.get("user");
  const id = c.req.param("id");
  let body: any;
  try {
    body = await c.req.json<any>();
  } catch {
    return c.json({success:false,error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},400);
  }
  const next = str(body.status).toUpperCase() as Status;
  const note = str(body.note) || null;
  if (!["CREATED","ASSIGNED","ACCEPTED","IN_PROGRESS","COMPLETED","CANCELLED"].includes(next)) {
    return c.json({success:false,error:{code:"VALIDATION_ERROR",message:"Invalid status"}},400);
  }
  const row = await c.env.DB.prepare("SELECT * FROM service_requests WHERE id=?").bind(id).first<any>();
  if (!row) return c.json({success:false,error:{code:"NOT_FOUND",message:"Request not found"}},404);

  // Generic status mutation is intentionally NOT an agent workflow API.
  // Agents must use the controlled /api/agent/requests/:id/{action} endpoints below.
  const permittedByRole =
    user.role === "ADMIN" ||
    (user.role === "CUSTOMER" && row.customer_id === user.id && next === "CANCELLED");

  if (!permittedByRole) {
    await audit(c.env,user.id,"AUTHORIZATION_FAILED","REQUEST",id,{attempted_status:next});
    return c.json({success:false,error:{code:"FORBIDDEN",message:"Agents must use the controlled agent workflow endpoints. Customers may only cancel their own requests."}},403);
  }
  if (row.status !== next && !transitions[row.status]?.includes(next) && user.role !== "ADMIN") {
    return c.json({success:false,error:{code:"INVALID_TRANSITION",message:`Cannot change ${row.status} to ${next}`}},409);
  }

  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE service_requests SET status=?,updated_at=?,completed_at=CASE WHEN ?='COMPLETED' THEN ? ELSE completed_at END WHERE id=?`)
      .bind(next,now,next,now,id),
    c.env.DB.prepare(`INSERT INTO request_status_history
      (id,request_id,old_status,new_status,changed_by,note,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(),id,row.status,next,user.id,note,now)
  ]);
  await audit(c.env,user.id,"REQUEST_UPDATED","REQUEST",id,{old_status:row.status,new_status:next});
  return c.json({success:true,message:"Status updated",data:{id,status:next}});
});

// ---------------------------------------------------------------------------
// Service-agent workflow API
// ---------------------------------------------------------------------------
// These endpoints are deliberately action-based instead of exposing a generic
// agent PATCH status API. Every action verifies BOTH the agent role and that
// the request is assigned to the authenticated agent.

async function getAssignedRequest(c: any, agentId: string, requestId: string)  {
  const result = await c.env.DB.prepare(`
    SELECT
      r.*,
      s.name AS service_name
    FROM service_requests r
    LEFT JOIN services s
      ON s.id = r.service_id
    WHERE r.id = ?
      AND r.assigned_agent_id = ?
  `)
    .bind(requestId, agentId)
    .first();

  return result;
}

async function agentTransition(
  c: any,
  requestId: string,
  expectedStatus: Status,
  nextStatus: Status,
  action: string,
  note: string | null = null
) {
  const agent = c.get("user");
  const row = await getAssignedRequest(c, agent.id, requestId);
  if (!row) {
    await audit(c.env, agent.id, "AUTHORIZATION_FAILED", "REQUEST", requestId, { action, reason: "NOT_ASSIGNED_TO_AGENT" });
    return c.json({success:false,error:{code:"FORBIDDEN",message:"This request is not assigned to you"}},403);
  }

  if (row.status !== expectedStatus) {
    return c.json({
      success:false,
      error:{code:"INVALID_TRANSITION",message:`Agent action '${action}' requires status ${expectedStatus}; current status is ${row.status}`}
    },409);
  }

  const now = new Date().toISOString();
  const historyNote = note || `Agent action: ${action}`;
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE service_requests
      SET status=?, updated_at=?, completed_at=CASE WHEN ?='COMPLETED' THEN ? ELSE completed_at END
      WHERE id=? AND assigned_agent_id=? AND status=?`)
      .bind(nextStatus, now, nextStatus, now, requestId, agent.id, expectedStatus),
    c.env.DB.prepare(`INSERT INTO request_status_history
      (id,request_id,old_status,new_status,changed_by,note,created_at)
      VALUES (?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(), requestId, expectedStatus, nextStatus, agent.id, historyNote, now)
  ]);
  await audit(c.env, agent.id, `AGENT_REQUEST_${action.toUpperCase()}`, "REQUEST", requestId, {
    old_status: expectedStatus,
    new_status: nextStatus
  });
  return c.json({success:true,message:`Request ${action} successful`,data:{id:requestId,status:nextStatus}});
}

app.get("/api/agent/requests", requireAuth, roles("AGENT"), async c => {
  const agent = c.get("user");
  const status = c.req.query("status");
  let sql = `
    SELECT r.*, s.name service_name, u.full_name customer_name, u.email customer_email
    FROM service_requests r
    JOIN services s ON s.id=r.service_id
    JOIN users u ON u.id=r.customer_id
    WHERE r.assigned_agent_id=?`;
  const params: any[] = [agent.id];
  if (status) { sql += " AND r.status=?"; params.push(status.toUpperCase()); }
  sql += " ORDER BY r.created_at DESC LIMIT 100";
  const {results} = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({success:true,data:results});
});

app.get("/api/agent/requests/:id", requireAuth, roles("AGENT"), async c => {
  const agent = c.get("user");
  const id = c.req.param("id");
  const row = await getAssignedRequest(c, agent.id, id);
  if (!row) {
    await audit(c.env, agent.id, "AUTHORIZATION_FAILED", "REQUEST", id, { action: "VIEW_AGENT_REQUEST" });
    return c.json({success:false,error:{code:"FORBIDDEN",message:"This request is not assigned to you"}},403);
  }
  const history = await c.env.DB.prepare(`
    SELECT h.*,u.full_name changed_by_name FROM request_status_history h
    JOIN users u ON u.id=h.changed_by WHERE h.request_id=? ORDER BY h.created_at ASC
  `).bind(id).all();
  const notes = await c.env.DB.prepare(`
    SELECT n.*,u.full_name author_name FROM request_notes n
    JOIN users u ON u.id=n.author_id WHERE n.request_id=? ORDER BY n.created_at ASC
  `).bind(id).all();
  return c.json({success:true,data:{request:row,history:history.results,notes:notes.results}});
});

app.post("/api/agent/requests/:id/accept", requireAuth, roles("AGENT"), async c => {
  return agentTransition(c, c.req.param("id"), "ASSIGNED", "ACCEPTED", "accept");
});

app.post("/api/agent/requests/:id/reject", requireAuth, roles("AGENT"), async c => {
  let body: any = {};
  try { body = await c.req.json<any>(); } catch {}
  const reason = str(body.reason);
  if (!reason) {
    return c.json({success:false,error:{code:"VALIDATION_ERROR",message:"reason is required when rejecting a request"}},400);
  }
  // The assignment schema has CANCELLED but no REJECTED state. Therefore a
  // denied assignment is recorded as CANCELLED with an explicit rejection
  // reason in status history/audit metadata.
  return agentTransition(c, c.req.param("id"), "ASSIGNED", "CANCELLED", "reject", `Agent rejected request: ${reason}`);
});

app.post("/api/agent/requests/:id/start", requireAuth, roles("AGENT"), async c => {
  return agentTransition(c, c.req.param("id"), "ACCEPTED", "IN_PROGRESS", "start");
});

app.post("/api/agent/requests/:id/complete", requireAuth, roles("AGENT"), async c => {
  let body: any = {};
  try { body = await c.req.json<any>(); } catch {}
  const note = str(body.note) || null;
  return agentTransition(c, c.req.param("id"), "IN_PROGRESS", "COMPLETED", "complete", note);
});

app.post("/api/agent/requests/:id/notes", requireAuth, roles("AGENT"), async c => {
  const agent = c.get("user");
  const id = c.req.param("id");
  let body: any;
  try { body = await c.req.json<any>(); } catch {
    return c.json({success:false,error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},400);
  }
  const note = str(body.note);
  if (!note) return c.json({success:false,error:{code:"VALIDATION_ERROR",message:"note is required"}},400);
  const row = await getAssignedRequest(c, agent.id, id);
  if (!row) {
    await audit(c.env,agent.id,"AUTHORIZATION_FAILED","REQUEST",id,{action:"ADD_AGENT_NOTE"});
    return c.json({success:false,error:{code:"FORBIDDEN",message:"This request is not assigned to you"}},403);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare("INSERT INTO request_notes (id,request_id,author_id,note,created_at) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(),id,agent.id,note,now).run();
  await audit(c.env,agent.id,"REQUEST_NOTE_ADDED","REQUEST",id,{actor_role:"AGENT"});
  return c.json({success:true,message:"Agent note added"});
});

app.post("/api/requests/:id/notes", requireAuth, roles("CUSTOMER","ADMIN"), async c => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json<any>();
  const note = str(body.note);
  if (!note) return c.json({success:false,error:{code:"VALIDATION_ERROR",message:"note is required"}},400);
  const row = await c.env.DB.prepare("SELECT customer_id,assigned_agent_id FROM service_requests WHERE id=?").bind(id).first<any>();
  if (!row) return c.json({success:false,error:{code:"NOT_FOUND",message:"Request not found"}},404);
  if (user.role === "CUSTOMER" && row.customer_id !== user.id || user.role === "AGENT" && row.assigned_agent_id !== user.id) {
    return c.json({success:false,error:{code:"FORBIDDEN",message:"Not allowed"}},403);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare("INSERT INTO request_notes (id,request_id,author_id,note,created_at) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(),id,user.id,note,now).run();
  await audit(c.env,user.id,"REQUEST_NOTE_ADDED","REQUEST",id);
  return c.json({success:true,message:"Note added"});
});

app.post("/api/requests/:id/assign", requireAuth, roles("ADMIN"), async c => {
  const id = c.req.param("id");
  const body = await c.req.json<any>();
  const agentId = str(body.agent_id);
  const agent = await c.env.DB.prepare("SELECT id,full_name FROM users WHERE id=? AND role='AGENT' AND is_active=1").bind(agentId).first<any>();
  if (!agent) return c.json({success:false,error:{code:"AGENT_NOT_FOUND",message:"Active agent not found"}},404);
  const row = await c.env.DB.prepare("SELECT status FROM service_requests WHERE id=?").bind(id).first<any>();
  if (!row) return c.json({success:false,error:{code:"NOT_FOUND",message:"Request not found"}},404);
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE service_requests SET assigned_agent_id=?,status='ASSIGNED',updated_at=? WHERE id=?").bind(agentId,now,id),
    c.env.DB.prepare(`INSERT INTO request_status_history
      (id,request_id,old_status,new_status,changed_by,note,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(),id,row.status,"ASSIGNED",c.get("user").id,`Assigned to ${agent.full_name}`,now)
  ]);
  await audit(c.env,c.get("user").id,"REQUEST_ASSIGNED","REQUEST",id,{agent_id:agentId});
  return c.json({success:true,message:"Agent assigned"});
});

app.get("/api/admin/dashboard", requireAuth, roles("ADMIN"), async c => {
  const rows = await c.env.DB.prepare(`
    SELECT status, COUNT(*) count FROM service_requests GROUP BY status
  `).all();
  const users = await c.env.DB.prepare(`
    SELECT role, COUNT(*) count FROM users WHERE is_active=1 GROUP BY role
  `).all();
  const counts: Record<string,number> = {};
  for (const r of rows.results as any[]) counts[r.status] = Number(r.count);
  return c.json({success:true,data:{requests:counts,users:users.results}});
});

app.get("/api/admin/users", requireAuth, roles("ADMIN"), async c => {
  const role = c.req.query("role");
  let sql = "SELECT id,email,full_name,phone,role,is_active,created_at FROM users WHERE 1=1";
  const params:any[] = [];
  if (role) { sql += " AND role=?"; params.push(role.toUpperCase()); }
  sql += " ORDER BY created_at DESC LIMIT 500";
  const {results} = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({success:true,data:results});
});

app.get("/api/admin/requests", requireAuth, roles("ADMIN"), async c => {
  const {results} = await c.env.DB.prepare(`
    SELECT r.*,s.name service_name,u.full_name customer_name,a.full_name agent_name
    FROM service_requests r JOIN services s ON s.id=r.service_id
    JOIN users u ON u.id=r.customer_id LEFT JOIN users a ON a.id=r.assigned_agent_id
    ORDER BY r.created_at DESC LIMIT 500
  `).all();
  return c.json({success:true,data:results});
});

app.get("/api/admin/audit-logs", requireAuth, roles("ADMIN"), async c => {
  const {results} = await c.env.DB.prepare(`
    SELECT a.*,u.full_name actor_name,u.email actor_email
    FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id
    ORDER BY a.created_at DESC LIMIT 500
  `).all();
  return c.json({success:true,data:results});
});

app.patch("/api/profile", requireAuth, async c => {
  const body = await c.req.json<any>();
  const user = c.get("user");
  const full_name = str(body.full_name);
  const phone = str(body.phone) || null;
  const address = str(body.address) || null;
  const avatar_url = str(body.avatar_url) || null;
  if (!full_name) return c.json({success:false,error:{code:"VALIDATION_ERROR",message:"full_name is required"}},400);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET full_name=?,phone=?,updated_at=? WHERE id=?").bind(full_name,phone,new Date().toISOString(),user.id),
    c.env.DB.prepare("UPDATE profiles SET address=?,avatar_url=? WHERE user_id=?").bind(address,avatar_url,user.id)
  ]);
  await audit(c.env,user.id,"PROFILE_UPDATED","USER",user.id);
  return c.json({success:true,message:"Profile updated"});
});

export default app;
