/**
 * Project maturity profiles per ADR-0013.
 *
 * Each profile declares:
 * - `universal`: skills that always install for this profile.
 * - `conditional`: per-conditional-skill rules. `autoIf` is one of:
 *   - a feature predicate name from detectFeatures (`'frontend'`, `'claude-code'`)
 *   - `true` — recommended (pre-checked in TUI; auto-installed in non-interactive)
 *   - `false` — allowed but not recommended (un-checked in TUI; not auto-installed)
 *   - `'blocked'` — not available at this profile (omitted from TUI options)
 * - `note`: human-readable summary shown in the profile-selection TUI and
 *   in `agentic profile list`.
 *
 * Profiles are monotone supersets: poc ⊆ solo ⊆ team ⊆ mature.
 */

export const DEFAULT_PROFILE = 'team';

export const PROFILE_NAMES = ['poc', 'solo', 'team', 'mature'];

export const PROFILES = {
  poc: {
    universal: [
      'ad-philosophy',
      'ad-ground',
      'ad-audit',
      'ad-next',
      'ad-spike',
      'ad-tdg',
      'ad-domain',
      'ad-grill',
      'ad-diagnose',
    ],
    conditional: {
      'ad-design': 'blocked',
      'ad-subagent': 'blocked',
      'ad-skill': 'blocked',
      'ad-hooks': 'blocked',
    },
    note: 'PoC / spike / experiment. Nine universals — posture (philosophy), research (ground), drift (audit), navigation (next), spike + tdg + grill + domain + diagnose process scaffolds. No mandatory artifact-producing skills (no bootstrap / spec / task / adr / architecture). Adds discipline you can grow into; never pre-imposes ceremony.',
  },
  solo: {
    universal: [
      'ad-philosophy',
      'ad-ground',
      'ad-audit',
      'ad-next',
      'ad-spike',
      'ad-tdg',
      'ad-bootstrap',
      'ad-spec',
      'ad-task',
      'ad-review',
      'ad-domain',
      'ad-grill',
      'ad-diagnose',
      'ad-commit',
      'ad-pr',
      'ad-merge',
    ],
    conditional: {
      'ad-architecture': false,
      'ad-adr': false,
      'ad-design': 'frontend',
      'ad-subagent': 'claude-code',
      'ad-skill': false,
      'ad-hooks': false,
    },
    note: 'Solo developer shipping a real product. Specs and tasks are universal; ADRs and architecture are opt-in for binding decisions only.',
  },
  team: {
    universal: [
      'ad-bootstrap',
      'ad-philosophy',
      'ad-architecture',
      'ad-adr',
      'ad-spec',
      'ad-task',
      'ad-audit',
      'ad-review',
      'ad-ground',
      'ad-next',
      'ad-spike',
      'ad-tdg',
      'ad-domain',
      'ad-grill',
      'ad-deepen',
      'ad-diagnose',
      'ad-commit',
      'ad-pr',
      'ad-merge',
    ],
    conditional: {
      'ad-design': 'frontend',
      'ad-subagent': 'claude-code',
      'ad-skill': false,
      'ad-hooks': false,
    },
    note: 'Team product. Full universal stack including deepening (architectural refactor surfacing) and the v0.15 grill/domain/diagnose trio. Conditional skills auto-detect by signal. This was the v0.7 default and is the migration target for existing installs.',
  },
  mature: {
    universal: [
      'ad-bootstrap',
      'ad-philosophy',
      'ad-architecture',
      'ad-adr',
      'ad-spec',
      'ad-task',
      'ad-audit',
      'ad-review',
      'ad-ground',
      'ad-next',
      'ad-spike',
      'ad-tdg',
      'ad-domain',
      'ad-grill',
      'ad-deepen',
      'ad-diagnose',
      'ad-commit',
      'ad-pr',
      'ad-merge',
    ],
    conditional: {
      'ad-design': 'frontend',
      'ad-subagent': 'claude-code',
      'ad-skill': false,
      'ad-hooks': true,
    },
    note: 'Mature / regulated product. Recommends ad-hooks alongside the team stack for deterministic gates per WORKFLOW §11. Includes deepening + the v0.15 grill/domain/diagnose trio.',
  },
};

export function validateProfile(name) {
  if (!PROFILE_NAMES.includes(name)) {
    throw new Error(
      `unknown profile "${name}". Valid: ${PROFILE_NAMES.join(', ')}`
    );
  }
  return name;
}

export function profileOrDefault(name) {
  if (!name) return DEFAULT_PROFILE;
  return validateProfile(name);
}

export function requiredSkillsForProfile(name) {
  return [...PROFILES[validateProfile(name)].universal];
}

export function conditionalRulesForProfile(name) {
  return { ...PROFILES[validateProfile(name)].conditional };
}

/**
 * Returns the conditional skills available at this profile, with their
 * effective `autoIf` posture. Skipped (blocked) skills are omitted.
 */
export function availableConditionalsForProfile(profileName) {
  const rules = conditionalRulesForProfile(profileName);
  const out = [];
  for (const [skill, rule] of Object.entries(rules)) {
    if (rule === 'blocked') continue;
    out.push({ name: skill, rule });
  }
  return out;
}
