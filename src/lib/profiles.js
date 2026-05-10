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
      'agentic-philosophy',
      'agentic-ground',
      'agentic-audit',
      'agentic-next',
      'agentic-spike',
      'agentic-tdg',
      'agentic-domain',
      'agentic-grill',
      'agentic-diagnose',
    ],
    conditional: {
      'agentic-design': 'blocked',
      'agentic-subagent': 'blocked',
      'agentic-skill': 'blocked',
      'agentic-hooks': 'blocked',
    },
    note: 'PoC / spike / experiment. Nine universals — posture (philosophy), research (ground), drift (audit), navigation (next), spike + tdg + grill + domain + diagnose process scaffolds. No mandatory artifact-producing skills (no bootstrap / spec / task / adr / architecture). Adds discipline you can grow into; never pre-imposes ceremony.',
  },
  solo: {
    universal: [
      'agentic-philosophy',
      'agentic-ground',
      'agentic-audit',
      'agentic-next',
      'agentic-spike',
      'agentic-tdg',
      'agentic-bootstrap',
      'agentic-spec',
      'agentic-task',
      'agentic-review',
      'agentic-domain',
      'agentic-grill',
      'agentic-diagnose',
      'agentic-commit',
      'agentic-pr',
      'agentic-merge',
    ],
    conditional: {
      'agentic-architecture': false,
      'agentic-adr': false,
      'agentic-design': 'frontend',
      'agentic-subagent': 'claude-code',
      'agentic-skill': false,
      'agentic-hooks': false,
    },
    note: 'Solo developer shipping a real product. Specs and tasks are universal; ADRs and architecture are opt-in for binding decisions only.',
  },
  team: {
    universal: [
      'agentic-bootstrap',
      'agentic-philosophy',
      'agentic-architecture',
      'agentic-adr',
      'agentic-spec',
      'agentic-task',
      'agentic-audit',
      'agentic-review',
      'agentic-ground',
      'agentic-next',
      'agentic-spike',
      'agentic-tdg',
      'agentic-domain',
      'agentic-grill',
      'agentic-deepen',
      'agentic-diagnose',
      'agentic-commit',
      'agentic-pr',
      'agentic-merge',
    ],
    conditional: {
      'agentic-design': 'frontend',
      'agentic-subagent': 'claude-code',
      'agentic-skill': false,
      'agentic-hooks': false,
    },
    note: 'Team product. Full universal stack including deepening (architectural refactor surfacing) and the v0.15 grill/domain/diagnose trio. Conditional skills auto-detect by signal. This was the v0.7 default and is the migration target for existing installs.',
  },
  mature: {
    universal: [
      'agentic-bootstrap',
      'agentic-philosophy',
      'agentic-architecture',
      'agentic-adr',
      'agentic-spec',
      'agentic-task',
      'agentic-audit',
      'agentic-review',
      'agentic-ground',
      'agentic-next',
      'agentic-spike',
      'agentic-tdg',
      'agentic-domain',
      'agentic-grill',
      'agentic-deepen',
      'agentic-diagnose',
      'agentic-commit',
      'agentic-pr',
      'agentic-merge',
    ],
    conditional: {
      'agentic-design': 'frontend',
      'agentic-subagent': 'claude-code',
      'agentic-skill': false,
      'agentic-hooks': true,
    },
    note: 'Mature / regulated product. Recommends agentic-hooks alongside the team stack for deterministic gates per WORKFLOW §11. Includes deepening + the v0.15 grill/domain/diagnose trio.',
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
