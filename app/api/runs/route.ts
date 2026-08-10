import { getQuestion } from "@/lib/questionUtils";
import type { CodeRunRequest } from "@/lib/coding/contracts";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { getHiddenSuite } from "@/lib/server/coding/hiddenSuites";
import { acquireRunPermit, anonymizeClientKey, isCodeRunnerEnabled } from "@/lib/server/coding/runPermit";
import { runPythonSuite } from "@/lib/server/coding/runPython";

const MAX_SOURCE_LENGTH = 32 * 1024;

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const hosts = (process.env.TURNSTILE_HOSTNAMES ?? "").split(",").map((host) => host.trim()).filter(Boolean);
  if (!origin || hosts.length === 0) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && hosts.includes(url.hostname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: Partial<CodeRunRequest>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid run request." }, { status: 400 }); }
  if (body.language !== "python" || typeof body.questionId !== "string" || typeof body.source !== "string" || body.source.length === 0 || body.source.length > MAX_SOURCE_LENGTH) {
    return Response.json({ error: "Invalid run request." }, { status: 400 });
  }
  if (!isAllowedOrigin(request)) return Response.json({ error: "This origin is not allowed." }, { status: 403 });
  if (!isCodeRunnerEnabled()) return Response.json({ error: "The code runner is unavailable right now." }, { status: 503 });
  const clientAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const verified = await verifyTurnstile(body.turnstileToken, "code_run", request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
  if (!verified) return Response.json({ error: "Verification failed." }, { status: 403 });
  const permit = acquireRunPermit(anonymizeClientKey(clientAddress));
  if (!permit.allowed) return Response.json({ error: "The code runner is unavailable right now." }, { status: 429 });
  try {
    const question = getQuestion(body.questionId);
    if (!question?.runner || question.runner.language !== "python") return Response.json({ error: "Unknown runnable question." }, { status: 404 });
    const hidden = getHiddenSuite(question.id, question.runner.language, question.runner.entrypoint);
    if (!hidden) return Response.json({ error: "Server grading is not configured." }, { status: 503 });
    try {
      return Response.json(await runPythonSuite(body.source, question.runner.entrypoint, question.runner.visibleTests, hidden.tests));
    } catch {
      return Response.json({ error: "The code runner is temporarily unavailable." }, { status: 503 });
    }
  } finally {
    permit.release();
  }
}
