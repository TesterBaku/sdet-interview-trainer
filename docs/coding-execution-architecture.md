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

### Current coverage and deliberate deferral

The Coding Gym currently contains **54 coding tasks**. Only `python-coding-001`,
`python-coding-004`, and `python-coding-005` are runner-enabled: each has two browser-visible
cases and one server-side private suite. The other 51 tasks intentionally remain draft-only; they
have no `runner` metadata, visible cases, or private suites, so neither runner UI is shown for them
and the server route will reject them as non-runnable.

Expanding coverage is a content-and-contract task, not a switch to flip. Each additional Python
task needs a reviewed function entry point, JSON-safe input/output contract, public cases, and a
private-suite entry. Java, TypeScript, and SQL remain separate future work because they require
their own runtimes and trusted harnesses (and SQL needs an ephemeral database fixture).

### Deferred trusted runtimes and harnesses

Java, TypeScript, and SQL must not be added to the Python route's language union, worker, or
Sandbox image. Each needs a separate, reviewed runtime factory and a language-specific harness.
No runtime below is enabled by this design; enabling one requires its own question contract,
server-only private suite parser, unit/integration tests, capacity check, and controlled production
validation.

| Language | Isolated runtime and candidate contract | Trusted harness and grading boundary | Enablement gates |
| --- | --- | --- | --- |
| Java | A pinned, prebuilt Java 21 JDK Sandbox snapshot with no Maven, Gradle, or network package installation. A task declares a package-free `Solution` class and one public static method with a server-owned, JSON-safe signature. Candidate source is written as `Solution.java`; compiler and JVM runs have independent short deadlines and JVM heap/process limits. | A separately generated `Harness.java` compiles after the candidate, invokes only the declared method through a fixed adapter, and emits one bounded JSON marker. It must not concatenate candidate source, test inputs, or expected values into shell commands. Hidden expected values remain in the Route Handler for structural comparison; compiler diagnostics and raw output are discarded or normalized. | Verify the exact snapshot/toolchain is available on the provider; test compile error, linkage error, timeout, heap exhaustion, marker spoofing, and guaranteed cleanup. Add a Java-only request/schema type and fail closed when its server-only suite is missing. |
| TypeScript | A pinned Node LTS plus TypeScript compiler snapshot with no `npm install`, package cache, or network access during a run. A task exports one named synchronous function from `candidate.ts`, accepting and returning JSON-only values. The trusted build invokes `tsc` with a fixed, generated configuration and no project files from the repository. | A trusted Node launcher loads only the compiled candidate module, calls the declared export with JSON arguments, and writes the final bounded marker. Candidate output is never treated as a protocol response. Private expected values remain in the Route Handler; no secrets, environment variables, or writable shared paths enter the VM. | Verify compiler and Node versions in the snapshot; test type error, module/export mismatch, runtime error, event-loop timeout, child-process attempt, and cleanup. Add a TypeScript-only request/schema type and keep the browser worker separate from server grading. |
| SQL | A fresh, local PostgreSQL instance per run from a pinned image/snapshot, not a shared database and not Docker nested inside the Python Sandbox. The service binds only inside the microVM. Start with a single-statement, read-only query contract against task-specific, server-owned schema and fixtures. | The trusted harness initializes one disposable database per case, connects as a non-owner role with read-only transaction, tight statement/lock/idle timeouts, row/byte caps, and no filesystem/program-copy privileges. It canonicalizes typed result rows to JSON and compares them server-side. Candidate SQL is supplied as a file/stdin to the client, never interpolated into a shell command; raw results are not returned. | Prove database teardown after pass/failure/timeout, fixture reset between cases, rejection of non-read-only/multi-statement input, role isolation, canonical ordering behavior, and bounded output. Add a SQL-only suite/parser and run a provider capacity/cost review before exposing any UI. |

All three designs retain the shared controls: fresh microVM per submission, deny-all egress,
no injected secrets, strict request/response byte limits, Turnstile plus durable rate limiting,
and unconditional `stop()` in `finally`. They deliberately do not claim assessment-grade secrecy:
a learner can probe an anonymous grading oracle, but hidden fixtures and raw outputs must not be
returned to the browser.

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
  per-client window and concurrent-run cap before microVM allocation. Production also has the
  durable Vercel WAF rule `Rate limit coding runner`: `POST /api/runs`, fixed-window IP key, three
  requests per 600 seconds, 429 when exceeded. The WAF runs before the Route Handler, so excess
  traffic cannot reach Turnstile verification or create a microVM; the process-local guard remains
  a secondary concurrency breaker rather than the durable quota.
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
- Keep `CODING_RUNNER_ENABLED` set to `false` in Production except during a deliberate, monitored
  validation window. The durable Vercel WAF limiter is already in place; use an explicit `true`
  deployment only when testing the protected endpoint. `CODING_RUNNER_MAX_RUNS_PER_HOUR` (default `5`) and
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
file, and the live `/coding-gym` route responded successfully. At that initial deployment,
`CODING_RUNNER_ENABLED` was unset, so no Sandbox execution occurred; the later production
validation record below supersedes the then-outstanding live-test status.

## Production validation record (2026-08-09)

The Vercel WAF rule `Rate limit coding runner` is published for `POST /api/runs`: fixed-window,
IP-keyed, three requests per 600 seconds, returning 429 above the limit. Production has the public
Turnstile site key, server-side Turnstile secret, allowed hostname, and sensitive hidden-suite JSON.
The runner switch normally remains `false`.

One supervised production replay completed with a genuine Turnstile token and a correct pilot
submission: 2/2 visible and 2/2 private checks passed. The browser received aggregate counts only.
The runner was immediately reset to `false` and redeployed. Vercel Sandbox lists the two validation
Python 3.13 microVMs as `stopped`, each with `deny-all` egress. A first attempt failed safely before
allocation because Windows command-line processing stripped quotation marks from the JSON supplied
to `vercel env add --value`; replace JSON secrets through standard input instead.

## Sources

- [Vercel Sandbox documentation](https://vercel.com/docs/sandbox)
- [Vercel Sandbox egress firewall](https://vercel.com/changelog/advanced-egress-firewall-filtering-for-vercel-sandbox)
- [Vercel pricing](https://vercel.com/pricing)
- [Cloudflare Sandbox availability and pricing](https://developers.cloudflare.com/sandbox/)
