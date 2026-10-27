# hideObject error output verification

Source: pinojs/pino-pretty baseline `10aba398031e27455ece28398b13e92678f6c249`, candidate `5f40fa987d0d7c1f1a2d754230c1b9d2747d2cd3`, tree `721f5bc8450ad1a7dd8a6f61ae67b1217bb3b5b1`. The PR changes only lib/pretty.js and test/error-objects.test.js.

The documented hideObject exception retains errors. Modern Pino logs serialize errors under err or another configured key; the old top-level guard skipped that formatter entirely. The fix selects error keys at the modern call site and reuses existing formatting. It leaves ordinary hidden custom prettifiers uncalled and keeps the legacy top-level Error branch intact.

## Results

- Locally ran the configured CI commands in a Debian Linux container: Node20.20.2,22.23.4,24.14.0, each exact `npm i --ignore-scripts`, `npm i --no-save pino@^10.0.0`, `npm run ci`. All exit0. Upstream hosted Ubuntu CI has not run at proof preparation time. Node20 reporter counts388 passes;Node22/24 count361 each; no failures. All30 test files pass. Type suite9 tests/66 assertions and ATTW pack clean. Current installed Pino10.4.0.
- Same-environment Windows new regressions: baseline4 fail/5 pass;candidate9 pass. Real Pino factory/CLI on Linux and Windows: baseline3 fail/2 pass;candidate5 pass.
- The actual npm tgz is independently installed in Linux and Windows consumers. All78 shipped files match the final source. Factory,CLI and worker transport with explicitly configured fault error key each pass. Automatic Pino errorKey handling is separately verified by the direct pinoPretty stream regression; this receipt does not assert auto config forwarding for manually constructed worker transports.
- Optional unchanged `node benchmark.js` default run completes on baseline and candidate; it is informational, with no performance guarantee or CI threshold.
- Final79 tracked source bytes/modes match on Linux; Windows file bytes and Git index tree match. Canonical tar files are constructed from raw Git blobs with original modes, not checkout archive conversion.

## Windows full-run limitation and superseded attempts

Windows is extra coverage; the repository workflow targets Ubuntu. Both full Windows `npm run ci` attempts passed29 files but remained in cli-rc.test.js and were terminated by the outer harness (baseline180s,candidate488s). Those outer durations differ and do not establish the cause. The same first isolated nodeID passes on both sources. Neither full attempt is a Windows suite pass. Windows scoped regressions, real factory/CLI, installed worker proof, and type/package checks do pass.

The initial Windows cmd transport consumed the caret in pino@^10.0.0, installing10.0.0. The corrected direct npm-cli argv installed10.4.0 before all counted final checks. Logs retain both attempts. Linux pack emitted an npm warning before JSON; packaging succeeded, while the first metadata parser failed. Subsequent probe attempts used an unsupported directory worker import, an unresolved close-event await without a result report, and an omitted worker error key option. The final configured worker proof requires a real report and3 passing cases. These are harness corrections; product bytes remained unchanged.

## Files and reproduction

FINAL-RECEIPT.json maps gates and limitations. linux-matrix-states.json records actual argv,exit codes,times; linux-node*-ci.log contains complete CI output. pino-*-manifest.json and candidate.diff bind source. Runtime JSON reports embed exact input/output artifact lengths and SHA256. linux-package-meta.json binds the actual tgz. Raw npm locks preserve exact installed dependency resolution.

Extract canonical source tar files with original modes, use the listed Node versions and official install commands, then run npm run ci. The provided pino-minimal.cjs and packed-probe.cjs run real Pino serialization,bin.js stdin,and installed worker transport. linux-matrix.cjs documents the original container paths; adapt only evidence/workspace paths for another machine.

All public proof inputs and logs are copied byte-for-byte using an explicit allowlist. RAW-MANIFEST.json gives length/SHA256 for every payload other than itself. No unrelated evidence directories, credentials, environment dumps, or external service calls are included. AI assistance: implementation and verification used OpenAI Codex.
