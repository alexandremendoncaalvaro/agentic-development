# Loop-construction recipes

Try these in roughly this order — closest-to-the-bug first, last-resort human-in-the-loop script last.

1. Failing test at the seam closest to the bug — unit, integration, or e2e.
2. Curl / HTTP script against a running dev server.
3. CLI invocation with a fixture input, diffing stdout against a known-good snapshot.
4. Headless browser script (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.
5. Replay a captured trace — save a real network request / payload / event log, replay it through the code path in isolation.
6. Throwaway harness — minimal subset of the system (one service, mocked deps) exercising the bug code path in a single function call.
7. Property / fuzz loop — for "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. Bisection harness — if the bug appeared between two known states, automate "boot at state X, check, repeat" so `git bisect run` can drive it.
9. Differential loop — same input through old vs new (or two configs), diff outputs.
10. HITL bash script — last resort. If a human must click, drive *them* with a structured loop so the signal still flows back.
