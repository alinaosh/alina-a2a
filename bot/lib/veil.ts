const API = "https://a2a.claimsip.com/api/agent/v1";

export type VeilJson = Record<string, unknown>;

function token(): string {
  const value = process.env.VEIL_AGENT_KEY?.trim();
  if (!value) {
    throw new Error("VEIL_AGENT_KEY is not set");
  }
  return value;
}

export async function veilFetch(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: VeilJson; headers: Headers }> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
    return {
      status: 429,
      json: {
        error: "RATE_LIMIT_EXCEEDED",
        retry_after_seconds: retryAfter,
      },
      headers: response.headers,
    };
  }

  const text = await response.text();
  let json: VeilJson = {};
  if (text) {
    try {
      json = JSON.parse(text) as VeilJson;
    } catch {
      json = { raw: text };
    }
  }
  return { status: response.status, json, headers: response.headers };
}
