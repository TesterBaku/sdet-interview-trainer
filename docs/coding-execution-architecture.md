# Sandboxed coding execution — architecture decision

## Status

**Proposed; local development only.** The Coding Gym is a static Next.js application deployed on
Vercel, with question content and drafts stored in the browser. It has no backend execution
boundary. A browser runner would be unsafe and cannot keep tests private; a Vercel function is
not an appropriate untrusted-code runtime.

Cloudflare Sandbox requires a Workers Paid plan. This project currently has Workers Free, so the
design can be built and exercised locally with Docker but cannot be deployed to the current
Cloudflare account. Do not expose a production code-runner UI until an approved paid sandbox
runtime (Cloudflare or another provider) is available.

## Existing constraints

- `CodingTaskCard` stores a draft in localStorage and explicitly does not execute it.
- Coding content is client-readable JSON. The current question type has a solution but no formal
  function contract or test-case schema.
- The question bank includes Python, Java, TypeScript, and SQL tasks. A single interpreter cannot
  safely support all of them.
- The app has no user accounts, so any public execution endpoint needs bot protection and strict
  anonymous quotas before it creates a paid compute surface.

## Decision: separate Cloudflare Worker + Sandbox service

Use a separate Cloudflare Worker with the Sandbox SDK and a purpose-built container; keep the
Next/Vercel app as the presentation layer. The Worker is the only component allowed to create a
container. The browser never receives a shell, service credentials, hidden tests, or a sandbox
identifier.

```text
Vercel Next.js browser UI
  -> Cloudflare Turnstile token + candidate code
  -> Code-runner Worker
       -> validate origin, request size, language, Turnstile
       -> Durable Object rate limit by anonymized client key
       -> select private test spec by question id
       -> one fresh, no-network Sandbox instance
       -> return sanitized aggregate result
```

The Worker source and its private test definitions are not part of the Next application bundle.
The sandbox container receives no environment secrets and no credentials. It is destroyed in a
`finally` block after every execution.

## V1 scope: Python only

Start with Python standard-library tasks. V1 accepts a function submission for a question with a
declared entry point and JSON inputs. It runs one visible test and a small private suite. Java,
TypeScript, and SQL are separate later implementations because each needs its own toolchain,
harness, and resource profile. SQL additionally needs an ephemeral database/data fixture design.

To enable deterministic grading, each runnable question must gain public runner metadata:

```ts
type RunnerQuestion = {
  id: string;
  language: "python";
  entrypoint: string;
  visibleCases: Array<{ name: string; args: unknown[]; expected: unknown }>;
};
```

Private test cases live only in the Worker project. The public JSON remains the UI source; it must
not import or reference hidden cases.

### Implemented free-tier pilot

The first Python Coding Gym task now has two **visible** cases and runs them client-side through a
fresh Pyodide Web Worker. The worker is terminated after a result or an eight-second deadline, so
the user interface stays recoverable if submitted code loops forever. This provides immediate
practice feedback without sending code to a server, but all test data is intentionally public and
the pilot must not be labeled as hidden or secure assessment grading.

## Execution contract

1. Browser sends `{ questionId, language, source, turnstileToken }` to `POST /runs`.
2. Worker rejects unknown ids/languages, non-JSON payloads, code over 32 KiB, invalid origin,
   unauthenticated bot checks, and exhausted rate limits before provisioning compute.
3. Worker creates an opaque UUID sandbox id and writes a generated candidate file plus a trusted
   harness into an execution directory. It uses argument arrays / stdin rather than interpolating
   source or input into a shell command.
4. The Sandbox subclass sets `enableInternet = false`; no Worker secret is set in the container.
   Each command has a short deadline (initial target: 2 seconds per test, 8 seconds total).
5. In `finally`, the Worker deletes the session or destroys the sandbox. SDK timeouts only close
   the caller connection; they do not stop the underlying process, so cleanup is mandatory.
6. Response contains only aggregate outcomes: compile/runtime/timeout status, visible test result,
   hidden pass count, and a bounded sanitized error for the visible case. It never returns hidden
   inputs, expected outputs, stack traces containing harness paths, or raw sandbox stdout.

## Security and abuse controls

- Explicit allowlist CORS for the production Vercel origin and reviewed preview origins; deny all
  other origins.
- Cloudflare Turnstile validates every anonymous run server-side. A Durable Object enforces a
  conservative per-client window and concurrent-run cap before container allocation.
- Enforce request and response byte limits, code-size limit, fixed language allowlist, command
  timeout, max container count, and destruction after every run.
- Disable all outbound Internet access with `enableInternet = false`; do not mount R2/KV or inject
  secrets into the sandbox. The base image contains only the selected language runtime and trusted
  harness dependencies.
- Emit only non-sensitive operational metrics (outcome, duration bucket, language, rate-limited
  count). Do not persist candidate source by default.

## Hidden-test boundary

Hidden tests are a grading-quality mechanism, not an anti-cheating guarantee. Candidate code must
receive an input to calculate an output, so a determined user can probe the scoring oracle.
Furthermore, this study app intentionally exposes reference solutions when the user asks to reveal
them. The implementation protects hidden test fixtures and assertions from routine browser access
and error leakage; it does not claim that anonymous code execution can provide secure assessment
integrity.

## Required infrastructure before implementation

- For local proof-of-concept: Docker Desktop running, Node.js, and the Worker/Sandbox project
  dependencies. Docker Desktop is running locally as of this work session.
- For production: a **Workers Paid** Cloudflare account/project with Containers/Sandbox, Durable
  Objects, and Turnstile enabled, plus an approved budget/instance limit. Workers Free can use
  Turnstile and SQLite-backed Durable Objects, but cannot use Sandbox.
- A custom Worker domain or explicitly approved Worker endpoint and exact Vercel production/preview
  origins for CORS.
- Docker running locally to build and test the container image; the current machine cannot reach
  its Docker daemon.
- A deployment secret/configuration path outside the public Next bundle. No existing `.env` value
  provides these credentials.

## Verification gates

- Unit: request validation, public/private result redaction, rate-limit decisions, and harness
  result parsing.
- Integration against the local Worker/container: passing, assertion failure, syntax error,
  runtime error, timeout/infinite loop, oversize input, blocked network, and cleanup after timeout.
- Functional: Coding Gym shows a visible-case result and aggregate hidden result without exposing
  fixture values; a failed bot/rate-limit request creates no run.
- Deployment: confirm container destruction/instance counts and dashboard metrics after a staged
  run. Do not enable the public UI until these gates pass.

## Sources

- [Cloudflare Sandbox SDK getting started](https://developers.cloudflare.com/sandbox/get-started/)
- [Cloudflare Sandbox outbound-traffic controls](https://developers.cloudflare.com/sandbox/guides/outbound-traffic/)
- [Cloudflare Sandbox command timeouts and cleanup behavior](https://developers.cloudflare.com/sandbox/guides/execute-commands/)
