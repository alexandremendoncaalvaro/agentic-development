---
name: ad-voice-tune
description: Create or evolve the user's machine-local personal voice profile behind an explicit human gate. Use only when the user invokes /ad-voice-tune, asks to calibrate or refine their voice, supplies owner samples or authorized team conversations, or asks the system to learn from a correction. Separates owner communicative identity from target-community accommodation, negotiates source and retention before private reads, stores derived patterns by default, proposes one profile delta at a time, and writes only after explicit approval. Distinct from ad-voice, which applies a profile read-only.
summary: Calibrate the local personal-voice profile from authorized owner and community evidence. Separates identity from accommodation, retains derived patterns by default, and writes one explicitly approved delta at a time.
allowed-tools: Read, Write, Glob, Grep, Bash, WebFetch
---

# /ad-voice-tune

Create or refine the machine-local personal voice profile. The profile represents its owner; target-community material supplies accommodation conventions only.

<prime-directive>
HARD human gate: never read a private source before the user approves its exact scope, and never write a profile delta before the user approves that exact change. Present one consequential decision at a time. No batch ranking and no silent learning from ordinary `ad-voice` use.
</prime-directive>

## Step 1: Establish the source boundary

Before private file, message, Slack, Discord, email, or transcript access, state and obtain approval for:

- exact sources and date range;
- author filter and source role;
- intended profile scope;
- retention mode;
- connector or local path, when applicable.

Public URLs or pasted text supplied for calibration are in scope only as named. A connector is optional and may be used only when already available and explicitly authorized for the named channels, threads, people, and dates. Do not widen access because credentials exist.

Read [references/calibration.md](references/calibration.md) for source roles, filters, cross-language evaluation, and cleanup. Tell the user that the host may retain conversation/tool history even when the skill deletes temporary files.

## Step 2: Resolve the current profile

Run:

```bash
node <skill-base-dir>/scripts/voice-profile.mjs resolve [--profile <path>]
```

If a profile exists, validate it before use. A path inside any Git repository is invalid. Never repair an invalid profile silently. If none exists, use the smallest empty schema from [references/profile-contract.md](references/profile-contract.md) as the proposed starting state; creation still requires approval.

## Step 3: Curate evidence

Work in an OS temporary directory outside every repository. Filter quoted replies, signatures, boilerplate, code, logs, copied material, assistant output, and unaccepted generated drafts.

Classify evidence before deriving anything:

- owner material may support communicative identity or owner-observed surface patterns;
- accepted owner corrections may support an explicit preference;
- team or community material may support accommodation only;
- rejected or model-shaped text may support an aversion, never a positive owner pattern.

For cross-language work, derive language-portable functions from the language in which the owner is confident. Use target-language community evidence for idiomatic expression and local conventions. Never copy a teammate's distinctive phrase or preserve an accidental learner error as identity.

## Step 4: Propose one delta

Present one candidate with:

- instruction and layer;
- exact language, channel, audience, relationship, document-type, topic, and situational-tone scope;
- provenance basis, author class, non-identifying source summary, source count, and confidence;
- conflicts and limitations;
- exact old-to-new profile change.

Use approve/reject or one short pairwise choice. The user may defer; deferral leaves the profile unchanged. A single observation becomes a preference only through explicit approval, not an invented claim of recurrence.

## Step 5: Validate, write, and clean up

After explicit approval, place the complete proposed JSON in a temporary file, then run:

```bash
node <skill-base-dir>/scripts/voice-profile.mjs write [--profile <path>] --input <candidate.json>
node <skill-base-dir>/scripts/voice-profile.mjs validate [--profile <path>]
```

The script validates before writing and atomically replaces the profile. Never hand-edit around a validation failure. Delete raw samples and candidate temporary files after the operation, including on refusal or interruption when cleanup is still possible. The persisted profile contains derived patterns and non-identifying source summaries; exact owner examples require separate retention approval.

Stop after one accepted or rejected delta. Further changes require another explicit invocation or user request.
