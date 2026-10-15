# ADR-0093: Cap skill descriptions at 200 characters

**Status:** accepted
**Date:** 2026-10-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0085 — decision 3's per-description cap falls from 350 to 200 characters; the 1,024-character specification maximum, the use-case-first rule and the absence of a whole-collection total are unchanged.

## Context

The kit's 46 descriptions totalled about 13,600 characters per host at a median of 303, against a listing budget of about 8,000 characters on a 200k window that the host's own skills also share (RESEARCH-0030 measured the overflow). The reference skill collections run far shorter: `mattpocock/skills` has a median of 149 characters and `obra/superpowers` 107. The kit's descriptions also restated mechanism that the skill body already carries, which costs listing space in every session without improving routing.

## Decision

1. Every skill description, in either host, is at most 200 characters: the use case first, then two to four trigger phrases, with no mechanism the body already states.
2. The two hosts carry the same description for the same skill unless the host changes what the skill does for the user.
3. `test/skills.test.js` enforces the cap on both hosts.
4. After release, the RESEARCH-0030 listing probe is rerun (task-0120); if the listing still overflows on a 200k window, ADR-0085 decision 4 (name-only demotion of setup skills) applies as written.

## Consequences

Positive:

- The descriptions fall to 7,099 characters per host, near half of before, in every session.
- Descriptions read as routing cues, closer to the reference collections.

Negative:

- Shorter descriptions carry fewer trigger phrases; a routing miss is caught by the eval corpus and by the listing probe, not prevented.
- A description cap alone does not guarantee the fit on a 200k window, because the host's built-in skills share the budget.

## Alternatives Considered

- **Keep 350 and demote skills to name-only.** Rejected as the first step: demotion hides descriptions entirely, while a shorter description keeps every skill routable.
- **Merge `ad-brief`, `ad-next` and `ad-roadmap`.** Rejected by the owner on 2026-10-15: the cap removes most of the cost without rewriting three daily skills.
