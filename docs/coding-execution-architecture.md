# Sandboxed coding execution — architecture decision

## Status

**Approved for implementation.** The Coding Gym is a Next.js application deployed on Vercel, with
question content and drafts stored in the browser. It has no server-side execution boundary today.
A browser runner is useful only for the explicitly-public Pyodide pilot; it cannot keep tests
private. A Vercel Route Handler is a control plane, not an untrusted-code runtime.

Vercel Sandbox is the deployable V1 runtime only within Vercel's **Hobby/free-tier included
allowance**. It runs submitted code in a disposable Firecracker microVM. This avoids the Workers
Paid prerequisite for Cloudflare Sandbox and avoids adding a second provider/control plane. Do not
upgrade a plan, enable paid overages, or expose the production runner until the free-tier guardrails
below are in place.

## Existing constraints

- `CodingTaskCard` stores a draft in localStorage and explicitly does not execute it.
- Coding content is client-readable JSON. The current question type has a solution but no formal
  function contract or test-case schema.
- The question bank includes Python, Java, TypeScript, and SQL tasks. A single interpreter cannot
  safely support all of them.
- The app has no user accounts, so any public execution endpoint needs bot protection and strict
  anonymous quotas before it creates a paid compute surface.

## Decision: Vercel Route Handler + Vercel Sandbox

Use a server-only `POST /api/runs` Route Handler as the control plane and Vercel Sandbox as the
execution plane. The handler is the only component allowed to create a microVM. The browser never
receives a shell, service credentials, hidden tests, or a sandbox identifier.

```text
Vercel Next.js browser UI
  -> Turnstile token + candidate code
  -> server-only POST /api/runs Route Handler
       -> validate origin, request size, language, Turnstile
       -> rate limit by anonymized client key
       -> select private test spec by question id
       -> one fresh, deny-all-egress Vercel Sandbox microVM
       -> return sanitized aggregate result
```

The Route Handler source and private test definitions are server-only and not part of the browser
bundle. The microVM receives no environment secrets or credentials. It is stopped in a `finally`
block after every execution.

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
  visibleTests: Array<{ name: string; args: unknown[]; expected: unknown }>;
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

1. Browser sends `{ questionId, language, source, turnstileToken }` to `POST /api/runs`.
2. The Route Handler rejects unknown ids/languages, non-JSON payloads, code over 32 KiB, invalid origin,
   unauthenticated bot checks, and exhausted rate limits before provisioning compute.
3. The Route Handler creates a fresh Sandbox and writes a generated candidate file plus a trusted
   harness under `/tmp`. It passes arguments as an array rather than interpolating source or input
   into a shell command.
4. The Sandbox is created with a `deny-all` network policy; no server secret is set in the
   microVM. Each command has a short deadline (initial target: 2 seconds per test, 8 seconds total).
5. In `finally`, the Route Handler stops the sandbox. SDK/request timeouts do not replace explicit
   cleanup, so cleanup is mandatory.
6. Response contains only aggregate outcomes: compile/runtime/timeout status, visible test result,
   hidden pass count, and a bounded sanitized error for the visible case. It never returns hidden
   inputs, expected outputs, stack traces containing harness paths, or raw sandbox stdout.

## Security and abuse controls

- Explicit allowlist CORS for the production Vercel origin and reviewed preview origins; deny all
  other origins.
- Cloudflare Turnstile validates every anonymous run server-side. The route is disabled unless
  `CODING_RUNNER_ENABLED=true`, and its process-local circuit breaker enforces the configured
  per-client window and concurrent-run cap before microVM allocation. It is deliberately not a
  durable cross-instance quota: do not enable public production grading until a suitable
  free-tier durable limiter has been selected and verified.
- Enforce request and response byte limits, code-size limit, fixed language allowlist, command
  timeout, max concurrent microVM count, and destruction after every run.
- Disable all outbound Internet access with Vercel Sandbox `deny-all`; do not inject secrets into
  the microVM. Use the stock Python runtime or a reviewed snapshot containing only the selected
  language runtime and trusted harness dependencies.
- Emit only non-sensitive operational metrics (outcome, duration bucket, language, rate-limited
  count). Do not persist candidate source by default.

## Hidden-test boundary

Hidden tests are a grading-quality mechanism, not an anti-cheating guarantee. Candidate code must
receive an input to calculate an output, so a determined user can probe the scoring oracle.
Furthermore, this study app intentionally exposes reference solutions when the user asks to reveal
them. The implementation protects hidden test fixtures and assertions from routine browser access
and error leakage; it does not claim that anonymous code execution can provide secure assessment
integrity.

The specific public/private storage and redacted-response contract is in
[`coding-test-data-boundary.md`](coding-test-data-boundary.md). It retains the existing public
learning solution while keeping all hidden fixtures out of client data and responses.

## Required infrastructure before implementation

- For local proof-of-concept: Node.js, `@vercel/sandbox`, a linked Vercel project, and a local
  development OIDC token (`vercel link` + `vercel env pull`). No Docker daemon is required.
- For production: Vercel Sandbox enabled for the deployed project, Vercel's automatic production
  OIDC authentication, a Turnstile site/secret pair, and a server-side rate-limit store with a
  fixed anonymous budget/concurrency policy.
- **Free-tier gate:** keep the project on Vercel Hobby and do not enable paid overages. Hobby
  currently includes 5 active CPU hours, 420 GB-hours of sandbox memory, 5,000 creations, and 10
  concurrent sandboxes each month. Use an application-level anonymous-run budget below those
  limits and disable the endpoint when it is exhausted; provisioned memory accrues for wall-clock
  lifetime, so every run must be stopped promptly. Any paid upgrade needs explicit user approval.
- Keep private tests and all credentials in server-only modules/environment variables. Nothing
  needed for the runner may use a `NEXT_PUBLIC_` name.
- The repository's ignored local `.env`/`.env.*` files are excluded from Vercel CLI uploads by
  `.vercelignore`. Configure production values in the Vercel project Environment Variables UI;
  never rely on a local credentials file being present during a cloud build.
- Configure `CODING_HIDDEN_TEST_SUITES_JSON` in both the ignored local environment file and
  Vercel Production. It is a compact versioned JSON document; never put it in question JSON,
  browser code, or a public repository.
- Keep `CODING_RUNNER_ENABLED` absent (or set to `false`) in Production while the endpoint is
  being deployed and reviewed. When a durable free-tier limiter is ready, enable it explicitly
  with `true`; `CODING_RUNNER_MAX_RUNS_PER_HOUR` (default `5`) and
  `CODING_RUNNER_MAX_CONCURRENT` (default `1`) remain conservative circuit-breaker limits.

## Verification gates

- Unit: request validation, public/private result redaction, rate-limit decisions, and harness
  result parsing.
- Integration against the local Route Handler/microVM: passing, assertion failure, syntax error,
  runtime error, timeout/infinite loop, oversize input, blocked network, and cleanup after timeout.
- Functional: Coding Gym shows a visible-case result and aggregate hidden result without exposing
  fixture values; a failed bot/rate-limit request creates no run.
- Deployment: confirm sandbox stop/instance counts and dashboard metrics after a staged
  run. Do not enable the public UI until these gates pass.

## Deployment record (2026-08-09)

The route and Coding Gym UI were deployed to `sdet-interview-trainer.vercel.app` after a clean
production build. An initial direct CLI deployment detected the ignored local `.env` file during
its build, so `.vercelignore` was added and a corrected production deployment was made. The
superseded deployment was removed. The corrected cloud build did not detect a local environment
file, and the live `/coding-gym` route responded successfully. `CODING_RUNNER_ENABLED` remains
unset, so no Sandbox execution has been enabled or charged while the durable limiter and live
Turnstile/Sandbox tests remain outstanding.

## Sources

- [Vercel Sandbox documentation](https://vercel.com/docs/sandbox)
- [Vercel Sandbox egress firewall](https://vercel.com/changelog/advanced-egress-firewall-filtering-for-vercel-sandbox)
- [Vercel pricing](https://vercel.com/pricing)
- [Cloudflare Sandbox availability and pricing](https://developers.cloudflare.com/sandbox/)
