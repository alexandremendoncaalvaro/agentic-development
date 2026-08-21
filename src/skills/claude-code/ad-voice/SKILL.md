---
name: ad-voice
description: |
  Apply a confirmed machine-local personal voice profile when drafting, rewriting, or translating text. Use when the user asks "write like me", "make this sound like me", "use my voice", "adjust this for Slack/Discord/docs/email", "translate this but keep my personality", or invokes /ad-voice. Preserves facts first, carries owner communicative identity through functional language equivalents, applies separately attributed team/community accommodation, and returns one usable draft. Read-only: never learns from the request or changes the profile. Routes profile creation and corrections to ad-voice-tune.
summary: Draft, rewrite, or translate through a confirmed local personal-voice profile. Preserves facts; layers owner identity, community accommodation, and context; never changes the profile. Falls back honestly when evidence is missing.
allowed-tools: Read, Bash
---

# /ad-voice

Apply a confirmed personal voice without changing it. The profile is machine-local; the draft may come from the conversation or an explicitly named file.

<prime-directive>
Preserve meaning before style. Keep every claim, name, number, date, citation, URL, identifier, commitment, uncertainty, and requested action. Never invent a detail to make the result sound personal. This skill is read-only: ordinary use and user reactions do not update the profile.
</prime-directive>

## Step 1: Frame the draft

Determine the source text or brief, destination, audience, relationship, language, intent, and any hard length or format limit. Infer values already clear from context. Ask only when a missing value would materially change the draft and cannot be grounded.

Build a silent invariant ledger before rewriting. The ledger is for self-checking and does not appear in normal output.

## Step 2: Resolve and validate the profile

Run from the current working directory:

```bash
node <skill-base-dir>/scripts/voice-profile.mjs resolve [--profile <path>]
node <skill-base-dir>/scripts/voice-profile.mjs validate [--profile <path>]
```

Resolution order is an explicit `--profile` path, `$AGENTIC_VOICE_DIR/profile.md`, then `~/.agentic/voice/profile.md`. A path inside any Git repository is invalid. Read [references/profile-contract.md](references/profile-contract.md) before selecting profile rules.

If the profile is absent or invalid, do not load it partially. Apply the generic baseline in [references/human-writing-baseline.md](references/human-writing-baseline.md), state briefly that personal matching was unavailable when that limitation matters, and route calibration to `/ad-voice-tune`. Never claim the result matches the user.

## Step 3: Select the active slice

Read [references/application.md](references/application.md). Load only patterns whose scope and provenance match the request.

Apply in this order:

1. factual and safety invariants;
2. destination shape and hard constraints;
3. owner communicative identity;
4. target-community accommodation;
5. audience, relationship, and channel context;
6. target-language surface conventions.

A later layer cannot erase an earlier one. Team or community evidence may shape vocabulary, formality, brevity, and politeness, but never supplies identity. Cross-language identity uses a functional equivalent, not literal transfer of fillers, syntax, idioms, or learner errors.

A matching rule does not force a rewrite. When the input already satisfies the rule, leave it alone. When personalization has no demonstrated benefit, keep the simpler generic result.

## Step 4: Draft and verify

Use the generic baseline to remove model-writing artifacts, then apply the selected profile slice. Audit every active profile pattern before returning: account for each pattern by ID, revise every unmet pattern, and repeat until each instruction is satisfied or has a concrete higher-priority override. Then compare the result to the silent invariant ledger and restore any changed or omitted invariant. Re-run the pattern audit after any restoration.

The audit is a private quality gate, not an output score. Normal output is one usable draft and nothing else. Show analysis, active rules, audit details, confidence, or a Portuguese pragmatic gloss only when the user asks or when a material override prevents an honest result.

## Boundary

- `ad-voice` applies confirmed state and never writes it.
- `ad-voice-tune` negotiates sources, proposes corrections, and owns every profile write.
- A request to imitate another person is outside this skill. A team corpus informs accommodation only.
