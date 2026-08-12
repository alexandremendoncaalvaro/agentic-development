---
name: ad-community-docs
description: Scaffold or audit GitHub-conventional CONTRIBUTING.md and SECURITY.md without inventing maintainer policy or overwriting existing documents. Use when a maintainer needs contributor guidance, a security-reporting policy, community health files, contribution docs, or security docs.
summary: Scaffold or audit `CONTRIBUTING.md` and `SECURITY.md` without overwriting local policy.
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /ad-community-docs

Create the public collaboration documents contributors need without turning a maintainer's policy into an agent guess. `CONTRIBUTING.md` owns the contribution workflow; `SECURITY.md` owns security reporting. They are separate documents with separate audiences.

## Step 0 — detect existing policy

Run from the consumer repository root:

```bash
node .claude/skills/ad-community-docs/scripts/community-doc-signals.mjs
```

Parse its JSON. Surface every `unreadable[]` entry as a blocker; an unreadable document is not absent. The detector lists the conventional root, `.github/`, and `docs/` locations in `documents.contributing` and `documents.security`.

When either list is non-empty, enter audit mode for that document: read it, report only concrete gaps against its purpose, and do not overwrite it. A local security policy always wins over the kit template.

## Step 1 — scan facts, not policy

For each missing document, inspect the root `README.md`, manifest and lockfile, test and quality-gate commands, contribution instructions, issue/PR templates, and existing `AGENTS.md` / `GUIDELINES.md`. Pre-fill only observable commands and repository conventions.

Do not infer a security email address, a response-time service level, supported-version window, disclosure commitment, or support channel. These belong to the maintainer.

## Step 2 — ask only the maintainer-owned gaps

For a missing `CONTRIBUTING.md`, ask only for contributor-policy gaps that the scan cannot resolve. For a missing `SECURITY.md`, ask one question at a time for:

1. The security reporting channel.
2. The supported-version policy.
3. The disclosure expectation.

An explicit `not supported`, `not configured`, or blank answer is valid. Preserve it plainly; never replace it with a made-up contact, promise, or placeholder that looks real.

## Step 3 — draft and confirm

Use [references/contributing-template.md](references/contributing-template.md) and [references/security-template.md](references/security-template.md). Keep the documents concise, public-facing, and separate. `CONTRIBUTING.md` points vulnerability reporters to `SECURITY.md`; it never accepts security reports through public issues.

Show the completed draft and write only after user confirmation. Write new documents at the repository root unless an existing community-document convention proves another location. Never replace an existing document; offer a focused gap report instead.

## Output contract

At most one `CONTRIBUTING.md` and one `SECURITY.md`, each only when absent and explicitly confirmed. Neither file fabricates a contact, support promise, or policy. Existing files are audited, never rewritten.

## Next

- `/ad-bootstrap` for the agent operational guide.
- `/ad-guidelines` for the engineering reference.
- `/ad-review` before merging the generated policy into a shared repository.
