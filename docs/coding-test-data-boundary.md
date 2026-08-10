# Coding runner test-data boundary

## Goal

Keep the Coding Gym's public learning content separate from the private test data used by the
future server runner. The design must work entirely on Vercel Hobby/free-tier services and must
fail closed before creating a microVM if private configuration is absent or malformed.

## Public data: browser-safe by design

The existing question JSON remains client-readable. A runnable Python question may expose only
the public contract:

```ts
type PythonRunner = {
  version: 1;
  language: "python";
  entrypoint: string;
  visibleTests: Array<{ name: string; args: JsonValue[]; expected: JsonValue }>;
};
```

`question.id` is the only lookup key. Do not add a hidden-suite identifier, hidden case name,
hidden count, hidden input, expected output, assertion text, or runner secret to the public JSON.
The existing Pyodide worker continues to receive only `visibleTests`.

`solution`, `hint`, and the explanatory fields are currently deliberate learning content: the
client imports and renders them when a learner selects **Reveal solution**. They must not be
described as private. The private suite contains no reference solution. If a future assessment mode
requires solution secrecy, it must use a separate browser DTO with those fields removed and remove
Reveal solution for that mode; a TypeScript type alone cannot hide a field already imported into a
Client Component.

## Private data: Vercel environment variable

Store all hidden cases in the production-only encrypted environment variable
`CODING_HIDDEN_TEST_SUITES_JSON`. This needs no paid database, Blob store, or second provider. It
is never named `NEXT_PUBLIC_*`, committed to the repository, bundled into client code, or supplied
to the sandbox as an environment variable.

The initial small suite has this exact JSON shape:

```json
{
  "version": 1,
  "suites": {
    "python-coding-001": {
      "language": "python",
      "entrypoint": "find_duplicates",
      "tests": [{ "args": [[9, 3, 9]], "expected": [9] }]
    }
  }
}
```

Private cases have no names and no reference source code. A server-only parser must require a
known public question ID, JSON-only values, matching language and entrypoint, and at least one
case. A missing or invalid production variable disables server grading with a generic configuration
error *before* a sandbox is allocated. Local and preview grading are disabled by default; an
explicit test-only value may be injected only for automated tests.

## Module boundary

Add the following when the execution vertical slice is implemented:

- `lib/coding/contracts.ts` — browser-safe request, result, and JSON-value types.
- `lib/server/coding/hiddenSuites.ts` — starts with `import "server-only"`; parses and looks up
  the environment variable.
- `lib/server/coding/harnessProtocol.ts` — validates the trusted structured result emitted by the
  sandbox harness.
- `lib/server/coding/redactRunResult.ts` — maps trusted internal results to the browser DTO.
- `app/api/runs/route.ts` — the only route allowed to import `hiddenSuites` and create a Vercel
  Sandbox.

The route validates public question metadata first, then fetches private cases server-side. For a
private case it writes only candidate source to the microVM and passes the single case input to a
trusted invocation harness. Expected values remain in the Route Handler, which compares the
bounded harness result after the command returns. Raw candidate stdout/stderr is discarded. This
keeps the full hidden suite and expected values out of the browser response, even though a
determined candidate can probe an anonymous grading oracle; hidden tests are feedback quality, not
secure anti-cheating.

## Redacted response contract

The browser receives only this shape:

```ts
type CodeRunResponse = {
  status: "passed" | "failed" | "syntax_error" | "runtime_error" | "timeout" | "rejected";
  visible: {
    passed: number;
    total: number;
    tests: Array<{ name: string; passed: boolean; error?: string }>;
  };
  hidden: { passed: number; total: number };
};
```

Visible failures may include their already-public name and a normalized, control-character-stripped,
length-bounded error. Hidden failures never include a case name, input, expected value, actual
value, exception, stack trace, raw stdout/stderr, harness path, environment value, or sandbox ID.
Every rejection and infrastructure error is likewise generic. The route always stops the microVM
in `finally`.

## Required regression gates

- The public question-data test rejects any hidden field and preserves the visible-only Pyodide
  pilot.
- Private-suite parsing rejects missing config, invalid JSON values, unknown IDs, and
  language/entrypoint mismatches without allocating a sandbox.
- Redaction tests seed distinctive hidden sentinel values and prove none occurs in serialized
  success, failure, runtime-error, or timeout responses.
- Route tests cover malformed/oversize input, wrong language, passing/failing code, syntax/runtime
  failure, timeout, and cleanup. All private outcomes remain aggregate-only.
- A functional test verifies the page and network response never contain a sentinel fixture.
- A production build scan verifies no test-only sentinel appears in browser chunks.

## Deployment switch

`CODING_RUNNER_ENABLED` is a fail-closed production switch and defaults to disabled. Keep it
unset while deploying the route, validating Turnstile, and choosing a durable free-tier limiter.
The private-suite variable alone must never make anonymous Sandbox execution available.
