import type { Env } from "./types";

export async function audit(
  env: Env,
  actorId: string | null,
  event: string,
  entityType?: string,
  entityId?: string,
  metadata?: unknown
) {
  await env.DB.prepare(`
    INSERT INTO audit_logs (id,actor_id,event,entity_type,entity_id,metadata,created_at)
    VALUES (?,?,?,?,?,?,?)
  `).bind(
    crypto.randomUUID(),
    actorId,
    event,
    entityType ?? null,
    entityId ?? null,
    metadata ? JSON.stringify(metadata) : null,
    new Date().toISOString()
  ).run();
}

export async function nextRequestNumber(env: Env): Promise<string> {
  const year = new Date().getUTCFullYear();
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM service_requests
    WHERE request_number LIKE ?
  `).bind(`REQ-${year}-%`).first<{count:number}>();
  const n = Number(row?.count ?? 0) + 1;
  return `REQ-${year}-${String(n).padStart(6, "0")}`;
}
