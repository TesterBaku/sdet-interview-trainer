import "server-only";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

function configuredHostnames() {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean)
  );
}

export async function verifyTurnstile(token: unknown, action: string, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET;
  const hostnames = configuredHostnames();
  if (typeof token !== "string" || token.length === 0 || token.length > 2048 || !secret || hostnames.size === 0) {
    return false;
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    const result = (await response.json()) as TurnstileResponse;
    return response.ok && result.success === true && result.action === action && typeof result.hostname === "string" && hostnames.has(result.hostname);
  } catch {
    return false;
  }
}
