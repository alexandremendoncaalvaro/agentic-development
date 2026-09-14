# GROUND-0011: Store conversation and publication language preferences

**Status:** recorded
**Decision:** Add one optional, closed `languages` object to the machine-local personal voice profile, containing `conversation` and `publication` BCP 47 tags. Use the conversation language for direct collaboration and publication previews; use the publication language as the default outward language. An explicit language in the current request overrides the stored default for that request only.
**Decision ref:** doc/tasks/0070-native-language-review-before-publication.md
**Confidence:** Strong

## Decision and confidence

The happy path is to keep two distinct per-person defaults in the existing outside-git profile: `languages.conversation` and `languages.publication`. This follows Mastodon's separation of a user's interface locale from the default language of new posts (B1), uses standard BCP 47 tags validated by the JavaScript runtime (A1, A2), and extends the repository's existing closed, machine-local profile rather than adding a second personal store (C1). `WORKFLOW.md` will make the conversation preference visible to every session, while `ad-voice`, `ad-publish`, and `ad-report` will apply the publication flow (C2, C3). When the languages differ, the first approval is the conversation-language preview and the second is the exact publication-language text. The only deviation from B1 is using full BCP 47 tags instead of ISO 639-1 codes because this product already distinguishes regional language forms such as `pt-BR`; A1 supports that choice. Axis 2 is Strong: the storage, precedence, validation, privacy, and approval paths are defined and testable without a spike.

## Evidence

### E1 — Conversation language and publication language are separate user preferences

**Strength:** High
**Provenance:** B1, C1, C2, D1

Mastodon keeps the user locale separate from a default posting language and resolves the posting value through a preference cascade. The repository already has one outside-git, per-person profile with a closed schema and publication skills that resolve the target language. Adding one closed `languages` object preserves those boundaries and avoids hard-coding one owner's languages into the shared kit.

### E2 — Language preference values should use validated BCP 47 tags

**Strength:** High
**Provenance:** A1, A2, C1

RFC 5646 defines language tags for communication objects. ECMA-402 makes `Intl.Locale` reject a malformed tag, so Node 20 can validate the contract without a dependency. This is stricter than the profile's current non-empty-string checks and supports region-specific values such as `pt-BR`.

### E3 — Two fields are sufficient when the preview follows the conversation language

**Strength:** High
**Provenance:** B1, C2, D1

The owner explicitly selected two preferences: conversation and publication. A separate review-language field would duplicate the conversation preference for the requested workflow. The publication flow already has distinct draft, verification, and final-action gates, so it can use the conversation language for the first review and the publication language for the final text without a third setting.

### E4 — Private deliberation remains a non-configurable publication invariant

**Strength:** High
**Provenance:** C2, D2

The current publication and voice contracts classify private owner-agent deliberation separately and exclude it unless the owner explicitly promotes a specific item. Language selection must not weaken that invariant, and the existing held-out collaboration-reply fixtures already exercise it.

## Source register

- **A1:** [RFC 5646, Tags for Identifying Languages](https://www.rfc-editor.org/rfc/rfc5646.html), sections 2 and 2.1.1 (accessed 2026-09-09 via web search and rendered RFC)
- **A2:** [ECMA-402, ECMAScript Internationalization API Specification](https://402.ecma-international.org/), section 15.1.1: `Intl.Locale` rejects a tag that is not well formed (accessed 2026-09-09 via web search)
- **B1:** [`mastodon/mastodon:app/models/concerns/user/has_settings.rb:22-24`](https://github.com/mastodon/mastodon/blob/main/app/models/concerns/user/has_settings.rb#L22-L24) and [`app/serializers/rest/preferences_serializer.rb:3-26`](https://github.com/mastodon/mastodon/blob/main/app/serializers/rest/preferences_serializer.rb#L3-L26): the implementation exposes `posting:default:language` and resolves it from the posting setting, user locale, then runtime locale (accessed 2026-09-09 via `gh api`; relevant identifiers: `posting_default_language`, `preferred_posting_language`)
- **C1:** `src/skills/codex/ad-voice-tune/scripts/voice-profile.mjs:88-118` and `src/skills/codex/ad-voice-tune/references/profile-contract.md:17-43`: the existing machine-local profile has a closed, validated schema (accessed 2026-09-09 via `rg`, `sed`, and `nl`)
- **C2:** `src/skills/codex/ad-publish/SKILL.md:19-54,104-150` and `src/skills/codex/ad-voice/SKILL.md:16-49`: publication language is framed per request, private deliberation is excluded, and exact outward text is approval-gated (accessed 2026-09-09 via `rg`, `sed`, and `nl`)
- **C3:** `src/lib/global-rules.js:17-34` and `WORKFLOW.md:1-40`: every user-scoped installation imports the kit's universal workflow into host-global instructions, providing the existing session-wide instruction path (accessed 2026-09-09 via `rg` and `sed`)
- **D1:** `git show afaaafa -- doc/adr/0075-native-language-review-before-publication.md doc/tasks/0070-native-language-review-before-publication.md`: the prior plan added only `reviewLanguage`; the owner's correction replaces that incomplete shape before implementation (accessed 2026-09-09 via git)
- **D2:** `git show bd9c2cc -- src/skills/codex/ad-publish/SKILL.md` and `git show f692af6 -- src/skills/codex/ad-voice/SKILL.md`: publication and personal-voice boundaries already exist; no prior implementation of conversation/publication defaults was found (accessed 2026-09-09 via git)

## Limitations and reversal

This record establishes the storage and instruction contract, not statistical proof that every host model will follow advisory text on every response. Contract tests, dogfood installation, and one end-to-end publication exercise mitigate that limitation. Reverse the decision if a supported host provides a smaller native per-user preference mechanism that is loaded across sessions and can preserve the same outside-git privacy boundary.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0011-ground-language-preferences.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
