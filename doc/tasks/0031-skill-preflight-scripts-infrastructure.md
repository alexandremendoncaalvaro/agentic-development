# task-0031: Skill preflight-scripts infrastructure

**Status:** proposed
**Date:** 2026-08-05
**Depends on:** ADR-0047 (which ships the minimal embedded-snippet version this task supersedes)

## Goal

Let a skill ship executable preflight scripts (`scripts/` beside `SKILL.md`) that install with the skill and that the skill text invokes by path — replacing embedded shell blocks copy-maintained per host. First consumer: `ad-audit`'s deterministic resolution probe (ADR-0047 Decision 1); second candidate: a changed-files enumerator for the file-coverage axis (ADR-0046).

## Checklist

- [ ] Decide install routing: extend `manifest.json` (today: `subagents` only) with a `scripts` list, or install the whole skill dir verbatim. Weigh against the idempotency contract (byte-compare + `confirmReplace`) in `src/lib/install.js`.
- [ ] Wire packaging: confirm `package.json#files` covers script paths (Gotcha: adding a dir under `src/skills/` does nothing for npm consumers unless listed). Verify with `npm pack --dry-run`.
- [ ] Portability bar: scripts must run on macOS + Linux + Windows contributors' shells (the CRLF/`core.symlinks` gotchas apply); decide bash-only-with-guard vs Node scripts (`node:` ESM, matching house style).
- [ ] Parity tests: extend `test/skills.test.js` so a skill script present in `src/skills/claude-code/<skill>/scripts/` must have its codex twin (or a documented single-source exception), mirroring the dual-host rule for SKILL.md.
- [ ] Migrate `ad-audit`'s embedded resolution probe (both hosts) to the shipped script; remove the duplicated inline blocks; update ADR-0047's "minimal realization" note.
- [ ] Dogfood: `node bin/agentic.js update --yes` refreshes installed scripts; state files track their SHAs.
- [ ] Self-audit the change with `/ad-audit` before PR.

## Notes

- 2026-08-05 — Created from ADR-0047. The minimal embedded-snippet version is live in `ad-audit` Step 1 (claude) / Step 2 (codex); this task exists so the duplication does not become permanent. The practice's originator ships `references/`, `scripts/`, and posting targets inside skills and names preflight scripts as the highest-leverage under-adopted lever; the kit's leak-guard (ADR-0033) is the in-repo precedent for "deterministic gate as code + tests".
