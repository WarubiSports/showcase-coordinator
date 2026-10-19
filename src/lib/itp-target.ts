const CORE_HOST = "wwomwawpxmkrykybpqok.supabase.co";

export class ItpTargetUnusableError extends Error {
  constructor() {
    super("ITP Supabase target is unusable; check URL, key and schema configuration.");
    this.name = "ItpTargetUnusableError";
  }
}

export function resolveItpTarget(url: string | undefined, key: string | undefined, schemaEnv?: string) {
  const schema = schemaEnv?.trim() || "";
  let parsed: URL;
  try {
    parsed = new URL(url!);
  } catch {
    throw new ItpTargetUnusableError();
  }
  const switched = schema === "itp" && parsed.protocol === "https:" && parsed.host === CORE_HOST;
  if (!url || !key || (schema ? !switched : parsed.hostname === CORE_HOST)) {
    throw new ItpTargetUnusableError();
  }

  // Empty tuple preserves the original two-argument factories when the env is unset.
  const clientOptions: [] | [{ db: { schema: "itp" } }] = switched ? [{ db: { schema: "itp" } }] : [];
  return {
    url,
    key,
    schema: switched ? "itp" as const : "public" as const,
    clientOptions,
    restHeaders(method: string): Record<string, string> {
      if (!switched) return {};
      return ["GET", "HEAD"].includes(method.toUpperCase())
        ? { "Accept-Profile": "itp" }
        : { "Content-Profile": "itp" };
    },
  };
}

function projectRef(url: string | undefined): string | null {
  try {
    return new URL(url!).hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

// Dependency-free so the actual probe handler can be tested without Next/Supabase installed.
export async function itpMoveProbe(input: {
  authorized?: boolean;
  url: string | undefined;
  key: string | undefined;
  schema?: string;
  deployment?: string;
  fetch?: typeof fetch;
}): Promise<Response> {
  const body = {
    probe: "itp-move",
    deployment: input.deployment || null,
    ref: projectRef(input.url),
    schema: input.schema?.trim() === "itp" ? "itp" : "public",
    phase: null as string | null,
    error: null as string | null,
    paused: {},
  };
  if (!input.authorized) {
    body.error = "token_required";
    return Response.json(body, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const target = resolveItpTarget(input.url, input.key, input.schema);
    body.schema = target.schema;
    const response = await (input.fetch ?? fetch)(`${target.url.replace(/\/$/, "")}/rest/v1/rpc/move_phase`, {
      method: "POST",
      headers: {
        apikey: target.key,
        Authorization: `Bearer ${target.key}`,
        "Content-Type": "application/json",
        ...target.restHeaders("POST"),
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    const data = await response.json();
    if (response.ok) {
      body.phase = typeof data?.phase === "string" ? data.phase : null;
    } else if (typeof data?.code === "string" && /^(PGRST\d{3}|[0-9A-Z]{5})$/.test(data.code)) {
      body.error = data.code;
    }
  } catch (error) {
    if (error instanceof ItpTargetUnusableError) body.error = "target_unusable";
    else if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) body.error = "timeout";
  }
  return Response.json(body, { status: 200, headers: { "Cache-Control": "no-store" } });
}
