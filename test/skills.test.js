import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { bundledSkills } from '../src/lib/install.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = join(__dirname, '..', 'src', 'skills');

// ADR-0073: every kit skill belongs to one invocation class. User-invocable
// skills are outward-facing or setup human verbs; their descriptions leave the host
// listing (`disable-model-invocation` / `allow_implicit_invocation: false`).
// The remaining skills are model-invocable and must fit the smallest
// documented listing budget (8,000 chars) at ≤350 chars each.
const USER_INVOCABLE_SKILLS = new Set([
  'ad-archive',
  'ad-architecture',
  'ad-bootstrap',
  'ad-community-docs',
  'ad-design',
  'ad-guidelines',
  'ad-hooks',
  'ad-level-up',
  'ad-merge',
  'ad-pr',
  'ad-publish',
  'ad-release',
  'ad-report',
  'ad-skill',
  'ad-subagent',
  'ad-template-tune',
  'ad-update',
  'ad-voice',
  'ad-voice-tune',
]);
const SPEC_DESCRIPTION_CAP = 1024;
const MODEL_DESCRIPTION_CAP = 350;
const MODEL_LISTING_BUDGET = 8000;

// The tests enumerate skills through the installer's own enumerator, so the
// dot-directory exclusion (task-0065) has one implementation and one test.
function listSkills(agent) {
  const root = join(SKILLS_ROOT, agent);
  return bundledSkills(agent).map((name) => ({ name, dir: join(root, name) }));
}

function parseFrontmatter(filePath) {
  const text = readFileSync(filePath, 'utf8');
  if (!text.startsWith('---\n')) {
    throw new Error(`${filePath}: missing opening frontmatter delimiter`);
  }
  const end = text.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`${filePath}: missing closing frontmatter delimiter`);
  }
  return yaml.load(text.slice(4, end));
}

function routingSurface(body, agent, skill) {
  if (skill === 'ad-next') {
    return body.split('\n').find((line) => line.includes('completion rollup')) ?? '';
  }
  if (agent === 'codex' && skill === 'ad-audit') {
    return body.match(/<next>\n([\s\S]*?)\n<\/next>/)?.[1] ?? '';
  }
  if (agent === 'codex' && skill === 'ad-tdd') {
    return body.match(/^Next: .+$/m)?.[0] ?? '';
  }
  const marker = '\n## Next\n';
  const start = body.lastIndexOf(marker);
  return start === -1 ? '' : body.slice(start + marker.length);
}

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    test(`skill ${agent}/${name}: SKILL.md frontmatter parses with required fields`, () => {
      const fm = parseFrontmatter(join(dir, 'SKILL.md'));
      assert.equal(typeof fm.name, 'string', 'name must be a string');
      assert.equal(fm.name, name, `name (${fm.name}) must match dir (${name})`);
      assert.equal(typeof fm.description, 'string', 'description must be a string');
      assert.ok(fm.description.length > 0, 'description must not be empty');
      // 1,024 is the Agent Skills specification maximum (agentskills.io);
      // 1,536 is only where Claude Code truncates the listing text (ADR-0073).
      assert.ok(
        fm.description.length <= SPEC_DESCRIPTION_CAP,
        `description must be ≤${SPEC_DESCRIPTION_CAP} chars (Agent Skills spec); got ${fm.description.length}`
      );
      // Per task-0029, every kit skill carries a kit-specific `summary:`
      // field for the managed AGENTS.md table cell. Without it, rootdoc.js
      // throws at section-build time.
      assert.equal(typeof fm.summary, 'string', 'summary must be a string (task-0029)');
      assert.ok(fm.summary.length > 0, 'summary must not be empty');
      assert.ok(
        fm.summary.length <= 320,
        `summary must be ≤320 chars (compressed table cell); got ${fm.summary.length}. ` +
          `If you need more space, you are probably pasting the Anthropic ` +
          `description verbatim — strip the trigger keywords and keep only ` +
          `the one-or-two-sentence functional summary.`
      );
    });
  }
}

test('Claude Code skills follow the local closing-section contract', () => {
  for (const { name, dir } of listSkills('claude-code')) {
    if (name === 'ad-philosophy') continue;
    const body = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    assert.match(body, /^## Output contract$/m, `${name} must declare ## Output contract`);
    assert.match(body, /^## Next$/m, `${name} must declare ## Next`);
  }
});

test('normalized Claude Code editorial skills expose numbered workflow steps', () => {
  for (const name of [
    'ad-publish',
    'ad-report',
    'ad-template-tune',
    'ad-voice',
    'ad-voice-tune',
    'ad-prism',
  ]) {
    const body = readFileSync(join(SKILLS_ROOT, 'claude-code', name, 'SKILL.md'), 'utf8');
    assert.match(body, /^## Step 1\b/m, `${name} must start a numbered workflow`);
  }
});

test('Claude Code orchestration skills pre-approve their direct tool surface', () => {
  const expected = new Map([
    ['ad-ground', 'Read, Write, Glob, Grep, Bash, WebFetch, WebSearch'],
    ['ad-review', 'Read, Write, Glob, Grep, Bash, Task'],
    ['ad-audit', 'Read, Write, Glob, Grep, Bash, Task'],
    ['ad-tdg', 'Read, Write, Edit, Glob, Grep, Bash'],
    ['ad-derisk', 'Read, Edit, Glob, Grep, Bash'],
    ['ad-publish', 'Read, Bash'],
    ['ad-report', 'Read, Write, Bash'],
  ]);

  for (const [name, tools] of expected) {
    const fm = parseFrontmatter(join(SKILLS_ROOT, 'claude-code', name, 'SKILL.md'));
    assert.equal(fm['allowed-tools'], tools, `${name} direct tool surface drifted`);
  }
});

test('Claude Code numbered workflow headings use one vocabulary per skill', () => {
  for (const { name, dir } of listSkills('claude-code')) {
    const body = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    const usesSteps = /^## Step \d+/m.test(body);
    const usesPhases = /^## Phase \d+/m.test(body);
    assert.equal(usesSteps && usesPhases, false, `${name} mixes Step and Phase headings`);
  }
});

test('skill authoring and hand-off instructions preserve host and commit contracts', () => {
  for (const agent of ['claude-code', 'codex']) {
    const read = (skill) => readFileSync(join(SKILLS_ROOT, agent, skill, 'SKILL.md'), 'utf8');
    const spike = read('ad-spike');
    const authoring = read('ad-skill');
    const subagent = parseFrontmatter(join(SKILLS_ROOT, agent, 'ad-subagent', 'SKILL.md'));

    assert.doesNotMatch(spike, /git commit -m/);
    assert.match(spike, /`\/ad-commit`/);
    assert.match(authoring, /1,024/);
    assert.match(authoring, /1,536[\s\S]*Claude Code listing/i);
    assert.match(authoring, /`when_to_use`[\s\S]*Claude Code/i);
    assert.match(authoring, /disable-model-invocation/);
    assert.match(authoring, /allow_implicit_invocation/);

    if (agent === 'claude-code') {
      assert.match(subagent.summary, /\.claude\/agents\/.*\.md/);
      assert.doesNotMatch(subagent.summary, /\.codex\/agents/);
    } else {
      assert.match(subagent.summary, /\.codex\/agents\/.*\.toml/);
      assert.doesNotMatch(subagent.summary, /\.claude\/agents/);
    }
  }

  const diagnose = readFileSync(
    join(SKILLS_ROOT, 'claude-code', 'ad-diagnose', 'SKILL.md'),
    'utf8'
  );
  const deepen = readFileSync(join(SKILLS_ROOT, 'claude-code', 'ad-deepen', 'SKILL.md'), 'utf8');
  assert.doesNotMatch(diagnose, /\[`CONTEXT\.md`\]\(CONTEXT\.md\)/);
  assert.doesNotMatch(deepen, /\[`src\/foo\.ts:42`\]\([^)]*\)/);
});

test('skill routing keeps every workflow hand-off discoverable on both hosts', () => {
  const edges = [
    ['ad-ground', ['/ad-tdd', '/ad-tdg']],
    ['ad-task', ['/ad-ground', '/ad-tdd']],
    ['ad-tdd', ['/ad-commit']],
    ['ad-tdg', ['/ad-tdd', '/ad-diagnose', '/ad-commit']],
    ['ad-review', ['/ad-question-me', '/ad-audit', '/ad-commit', '/ad-merge']],
    ['ad-audit', ['/ad-commit', '/ad-pr']],
    ['ad-philosophy', ['/ad-tdd', '/ad-tdg', '/ad-diagnose', '/ad-commit']],
    ['ad-spec', ['/ad-domain']],
    ['ad-architecture', ['/ad-domain']],
    ['ad-drift', ['/ad-domain']],
    ['ad-next', ['/ad-roadmap']],
    ['ad-grill-me', ['/ad-question-me']],
  ];

  for (const agent of ['claude-code', 'codex']) {
    for (const [skill, successors] of edges) {
      const body = readFileSync(join(SKILLS_ROOT, agent, skill, 'SKILL.md'), 'utf8');
      const routing = routingSurface(body, agent, skill);
      assert.ok(routing, `${agent}/${skill} must expose its routing surface`);
      for (const successor of successors) {
        assert.ok(routing.includes(successor), `${agent}/${skill} must route to ${successor}`);
      }
    }
  }
});

test('decision-maker briefing composition is one-way and visible in the workflow map', () => {
  const flows = readFileSync(join(__dirname, '..', 'WORKFLOW-FLOWS.md'), 'utf8');
  const section = flows.match(/^## Return To Active Work$([\s\S]*?)(?=^## )/m)?.[1] ?? '';

  assert.ok(section, 'WORKFLOW-FLOWS.md must map the return-to-session use case');
  for (const edge of [
    /Roadmap --> Brief/,
    /Handoff --> Brief/,
    /Rules --> Philosophy/,
    /Philosophy --> Corrected/,
    /Corrected --> Brief/,
    /Publish --> Voice/,
  ]) {
    assert.match(section, edge, `workflow map is missing ${edge}`);
  }

  for (const agent of ['claude-code', 'codex']) {
    const read = (skill) => readFileSync(join(SKILLS_ROOT, agent, skill, 'SKILL.md'), 'utf8');
    assert.match(read('ad-roadmap'), /settled roadmap fact packet[\s\S]*`\/?ad-brief`/i);
    assert.match(read('ad-handoff'), /settled resume fact packet[\s\S]*`\/?ad-brief`/i);
    assert.match(
      read('ad-rules'),
      /`\/?ad-philosophy`[\s\S]*settled correction fact packet[\s\S]*`\/?ad-brief`/i
    );
    assert.match(read('ad-publish'), /Every final title and body[\s\S]*`\/?ad-voice`/i);
    assert.doesNotMatch(
      read('ad-brief'),
      /(?:invoke|pass (?:a |the )?fact packet to) `\/?ad-(?:roadmap|handoff|rules|philosophy|publish|voice)`/i,
      `${agent} ad-brief must not call back into a specialist`
    );
  }
});

test('project-state collection is shared, bounded, and one-way on both hosts', () => {
  const flows = readFileSync(join(__dirname, '..', 'WORKFLOW-FLOWS.md'), 'utf8');
  const section = flows.match(/^## Return To Active Work$([\s\S]*?)(?=^## )/m)?.[1] ?? '';

  for (const edge of [
    /ProjectState --> Next/,
    /ProjectState --> Roadmap/,
    /ProjectState --> Brief/,
  ]) {
    assert.match(section, edge, `workflow map is missing ${edge}`);
  }

  for (const agent of ['claude-code', 'codex']) {
    const read = (skill) => readFileSync(join(SKILLS_ROOT, agent, skill, 'SKILL.md'), 'utf8');
    const projectStateDir = join(SKILLS_ROOT, agent, 'ad-project-state');
    const projectState = read('ad-project-state');
    const next = read('ad-next');
    const roadmap = read('ad-roadmap');
    const brief = read('ad-brief');

    assert.ok(existsSync(projectStateDir), `${agent} must ship ad-project-state`);
    assert.match(projectState, /bounded[\s\S]*fact packet/i);
    assert.match(projectState, /repository baseline/i);
    assert.doesNotMatch(
      projectState,
      /(?:invoke|pass (?:a |the )?fact packet to) `\/?ad-(?:next|roadmap|brief)`/i,
      `${agent} project-state must not call back into a consumer`
    );
    assert.match(
      next,
      /`\/?ad-project-state`[\s\S]*before .*scenario classification/i,
      `${agent} ad-next must collect configured project evidence before classification`
    );
    assert.match(
      roadmap,
      /project scope[\s\S]*`\/?ad-project-state`[\s\S]*before .*(?:plan|roadmap) evidence/i,
      `${agent} project roadmap must resolve sources before selecting plan evidence`
    );
    assert.match(
      brief,
      /no caller supplied a fact packet[\s\S]*`\/?ad-project-state`/i,
      `${agent} standalone brief must resolve configured project evidence`
    );
    for (const consumer of [next, roadmap, brief]) {
      assert.doesNotMatch(consumer, /gh (?:issue|pr) list/);
    }

    if (agent === 'claude-code') {
      assert.notEqual(
        parseFrontmatter(join(projectStateDir, 'SKILL.md'))['disable-model-invocation'],
        true
      );
    } else {
      const metadata = yaml.load(
        readFileSync(join(projectStateDir, 'agents', 'openai.yaml'), 'utf8')
      );
      assert.equal(metadata.policy.allow_implicit_invocation, true);
    }
  }
});

test('ad-prism is a discoverable generic evaluation skill on both hosts', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-prism');
    assert.ok(existsSync(skillDir), `${agent} must ship ad-prism`);

    const skillPath = join(skillDir, 'SKILL.md');
    const frontmatter = parseFrontmatter(skillPath);
    const body = readFileSync(skillPath, 'utf8');

    assert.equal(frontmatter.name, 'ad-prism');
    assert.match(frontmatter.description, /evaluat/i);
    assert.match(body, /optional project (?:domain )?adapter/i);
    assert.match(body, /\.agentic\/prism\/domain\.md/);
    assert.match(body, /absence[^\n]*(?:valid|not an error)/i);

    if (agent === 'claude-code') {
      assert.notEqual(frontmatter['disable-model-invocation'], true);
    } else {
      const metadata = yaml.load(readFileSync(join(skillDir, 'agents', 'openai.yaml'), 'utf8'));
      assert.equal(metadata.policy.allow_implicit_invocation, true);
    }
  }
});

test('ad-prism separates portable evaluation method from optional project context', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-prism');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const methodology = readFileSync(join(skillDir, 'references', 'methodology.md'), 'utf8');
    const adapter = readFileSync(join(skillDir, 'references', 'domain-adapter.md'), 'utf8');
    const brief = readFileSync(join(skillDir, 'assets', 'evaluation-brief.md'), 'utf8');

    assert.match(body, /read \[methodology\.md\].*design|design.*read \[methodology\.md\]/is);
    assert.match(
      body,
      /read \[domain-adapter\.md\].*adapter|adapter.*read \[domain-adapter\.md\]/is
    );
    assert.match(
      methodology,
      /decision[\s\S]*objective[\s\S]*evaluation question[\s\S]*claim[\s\S]*evidence[\s\S]*task[\s\S]*measure[\s\S]*data source[\s\S]*decision rule[\s\S]*next gate/i
    );
    assert.match(adapter, /absence[\s\S]*(?:valid|not an error)/i);
    assert.match(adapter, /live inspected evidence[\s\S]*(?:precedence|outranks)/i);
    assert.match(adapter, /no secrets[\s\S]*no personal data/i);
    for (const heading of [
      'Decision',
      'Objective',
      'Evaluation question',
      'Claim',
      'Evidence',
      'Tasks',
      'Measures',
      'Data sources',
      'Decision rule',
      'Limits',
      'Sources',
    ]) {
      assert.match(brief, new RegExp(`^## ${heading}$`, 'm'), `${agent} brief needs ${heading}`);
    }
  }
});

test('ad-prism applies a domain adapter only inside its declared scope', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-prism');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const adapter = readFileSync(join(skillDir, 'references', 'domain-adapter.md'), 'utf8');
    const cases = JSON.parse(readFileSync(join(skillDir, 'evals', 'evals.json'), 'utf8')).cases;
    const outsideScope = cases.find((entry) => entry.id === 'out-of-scope-domain-adapter');

    assert.match(
      body,
      /(?:use|apply) the adapter only when[\s\S]*evaluation[\s\S]*(?:inside|within|matches)[\s\S]*(?:declared )?scope/i
    );
    assert.match(
      adapter,
      /outside[\s\S]*(?:declared )?scope[\s\S]*(?:ignore|do not use)[\s\S]*(?:do not mention|do not echo)/i
    );
    assert.ok(outsideScope, `${agent} needs an out-of-scope adapter behavior case`);
    assert.equal(outsideScope.expected_route, 'ad-prism');
    assert.ok(
      outsideScope.expected_outcomes.some((outcome) =>
        /does not (?:mention|echo|leak)[\s\S]*(?:adapter|domain|context)/i.test(outcome)
      ),
      `${agent} must keep irrelevant adapter context out of the response`
    );
  }
});

test('ad-prism keeps evaluation settings independent and bounded to the requested context', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-prism');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const methodology = readFileSync(join(skillDir, 'references', 'methodology.md'), 'utf8');
    const cases = JSON.parse(readFileSync(join(skillDir, 'evals', 'evals.json'), 'utf8')).cases;
    const localOnly = cases.find((entry) => entry.id === 'bounded-local-bench');

    assert.match(
      methodology,
      /setting[\s\S]*claim type[\s\S]*study design[\s\S]*evidence source[\s\S]*assurance rigor/i
    );
    assert.match(
      body,
      /setting[\s\S]*claim type[\s\S]*study design[\s\S]*evidence source[\s\S]*assurance rigor[\s\S]*independent/i
    );
    assert.doesNotMatch(body, /smallest assurance level/i);
    assert.match(methodology, /not (?:a|required as) (?:maturity )?(?:ladder|sequence)/i);
    assert.match(methodology, /(?:stop|complete)[\s\S]*requested (?:setting|context)/i);
    assert.ok(localOnly, `${agent} needs a bounded local-only behavior case`);
    assert.equal(localOnly.expected_route, 'ad-prism');
    assert.ok(
      localOnly.expected_outcomes.some((outcome) =>
        /does not (?:add|require|recommend)[\s\S]*(?:staging|pilot|production|A\/B)/i.test(outcome)
      ),
      `${agent} local-only case must reject an unnecessary environment sequence`
    );
  }
});

test('ad-prism separates contextual methodology judgment from deterministic gates', () => {
  for (const agent of ['claude-code', 'codex']) {
    const methodology = readFileSync(
      join(SKILLS_ROOT, agent, 'ad-prism', 'references', 'methodology.md'),
      'utf8'
    );

    assert.match(
      methodology,
      /model[\s\S]*method fit[\s\S]*source applicability[\s\S]*fit-for-purpose/i
    );
    assert.match(
      methodology,
      /deterministic[\s\S]*structure[\s\S]*provenance[\s\S]*arithmetic[\s\S]*artifact integrity/i
    );
    assert.match(methodology, /(?:script|validator)[\s\S]*does not[\s\S]*methodological validity/i);
  }
});

test('ad-prism does not infer assurance rigor from the evidence environment', () => {
  for (const agent of ['claude-code', 'codex']) {
    const cases = JSON.parse(
      readFileSync(join(SKILLS_ROOT, agent, 'ad-prism', 'evals', 'evals.json'), 'utf8')
    ).cases;
    const environmentCase = cases.find(
      (entry) => entry.id === 'production-observation-is-not-confirmation'
    );

    assert.ok(environmentCase, `${agent} needs an environment-versus-rigor behavior case`);
    assert.equal(environmentCase.expected_route, 'ad-prism');
    assert.ok(
      environmentCase.expected_outcomes.some((outcome) =>
        /production[\s\S]*(?:does not|cannot)[\s\S]*(?:confirmatory|causal)/i.test(outcome)
      ),
      `${agent} must keep a production setting from inflating the claim`
    );
    assert.ok(
      environmentCase.expected_outcomes.some((outcome) =>
        /observational[\s\S]*(?:evidence|design|claim)/i.test(outcome)
      ),
      `${agent} must classify the evidence independently of its setting`
    );
  }
});

test('ad-prism behavior cases require auditable method-source traceability', () => {
  for (const agent of ['claude-code', 'codex']) {
    const cases = JSON.parse(
      readFileSync(join(SKILLS_ROOT, agent, 'ad-prism', 'evals', 'evals.json'), 'utf8')
    ).cases;
    const sourceCase = cases.find((entry) => entry.id === 'method-source-traceability');

    assert.ok(sourceCase, `${agent} needs a method-source traceability behavior case`);
    assert.equal(sourceCase.expected_route, 'ad-prism');
    for (const term of ['source', 'contribution', 'adaptation', 'retained limit']) {
      assert.ok(
        sourceCase.expected_outcomes.some((outcome) => new RegExp(term, 'i').test(outcome)),
        `${agent} traceability case must require ${term}`
      );
    }
    assert.ok(
      sourceCase.expected_outcomes.some((outcome) =>
        /does not (?:copy|transfer|invent)[\s\S]*(?:sample size|threshold|margin)/i.test(outcome)
      ),
      `${agent} traceability case must reject unsupported borrowed values`
    );
  }
});

test('ad-prism ships a privacy-bounded three-arm replacement protocol', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-prism');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const protocol = readFileSync(join(skillDir, 'references', 'skill-comparison.md'), 'utf8');

    assert.match(body, /skill-comparison\.md[\s\S]*(?:compare|replacement)/i);
    assert.match(
      protocol,
      /private (?:or reference )?Prism[\s\S]*generic `?ad-prism`?[\s\S]*(?:minimal )?domain adapter/i
    );
    assert.match(
      protocol,
      /(?:reference|private)[\s\S]*(?:not|never)[\s\S]*(?:ground truth|automatically correct)/i
    );
    assert.match(
      protocol,
      /freeze[\s\S]*(?:case|input)[\s\S]*(?:skill version|model)[\s\S]*(?:host|tools)/i
    );
    assert.match(protocol, /natural prompts[\s\S]*(?:do not|must not)[\s\S]*(?:skill|route)/i);
    assert.match(protocol, /outcome-shaped[\s\S]*(?:not|rather than)[\s\S]*(?:vocabulary|path)/i);
    assert.match(
      protocol,
      /randomi[sz][\s\S]*(?:repeated|multiple) trials[\s\S]*(?:blind|blinded)/i
    );
    assert.match(
      protocol,
      /private fixtures[\s\S]*outside (?:the )?repository[\s\S]*(?:saniti[sz]ed|aggregate)/i
    );
    assert.match(
      protocol,
      /pilot[\s\S]*(?:decision rule|tolerance|margin)[\s\S]*before[\s\S]*(?:comparison|candidate)/i
    );

    const methodRecords = [...protocol.matchAll(/^###\s+(M\d+)\s+(?:—|-|:)\s+.+$/gm)];
    assert.ok(
      methodRecords.length >= 2,
      `${agent} comparison protocol needs load-bearing method sources`
    );
    for (const [index, record] of methodRecords.entries()) {
      const start = record.index + record[0].length;
      const end = methodRecords[index + 1]?.index ?? protocol.length;
      const sourceMap = protocol.slice(start, end);
      for (const field of ['Source', 'Supports', 'Contribution', 'Adaptation', 'Retained limit']) {
        assert.match(
          sourceMap,
          new RegExp(`^- ${field}: \\S`, 'm'),
          `${agent} ${record[1]} needs ${field}`
        );
      }
    }
  }
});

test('ad-prism freezes and audits material evaluations without collapsing its verdicts', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-prism');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const assurance = readFileSync(join(skillDir, 'references', 'assurance.md'), 'utf8');
    const audit = readFileSync(join(skillDir, 'assets', 'audit.md'), 'utf8');

    assert.match(
      body,
      /material evaluation[\s\S]*freeze[\s\S]*skeptical[\s\S]*verify every finding[\s\S]*correct[\s\S]*freeze the final/i
    );
    assert.match(body, /validate-report\.mjs/);
    assert.match(body, /freeze-artifact\.mjs/);
    assert.match(assurance, /verification verdict[\s\S]*fit-for-purpose validation verdict/i);
    assert.match(
      assurance,
      /confirmed[\s\S]*rejected with\s+evidence[\s\S]*reserved for owner judgment/i
    );
    assert.match(assurance, /does not[\s\S]*(?:freeze|preserve)[\s\S]*external source/i);
    for (const heading of [
      'Artifact receipt',
      'Grounding and access',
      'Verification verdict',
      'Fit-for-purpose validation verdict',
      'Findings and dispositions',
      'Claims and limits for publication',
    ]) {
      assert.match(audit, new RegExp(`^## ${heading}$`, 'm'), `${agent} audit needs ${heading}`);
    }
    assert.match(audit, /^- SHA-256: /m);
    assert.match(audit, /^- Included paths: /m);
  }
});

test('ad-prism keeps methodological recommendations grounded in portable sources', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-prism');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const sources = readFileSync(join(skillDir, 'references', 'sources.md'), 'utf8');

    assert.match(body, /read \[sources\.md\][\s\S]*methodological\s+recommendation/i);
    assert.match(body, /one to three essential sources/i);
    assert.match(body, /do not transfer[\s\S]*(?:sample sizes|thresholds|margins)/i);
    assert.match(sources, /Goal\/Question\/Metric/i);
    assert.match(sources, /Evidence-Centered\s+Design/i);
    assert.match(sources, /Evaluation best\s+practices/i);
    assert.match(sources, /Aqua Book[\s\S]*Magenta\s+Book/i);
  }
});

test('material evaluation claims compose through ad-prism while ordinary publishing stays light', () => {
  for (const agent of ['claude-code', 'codex']) {
    const prism = readFileSync(join(SKILLS_ROOT, agent, 'ad-prism', 'SKILL.md'), 'utf8');
    const publish = readFileSync(join(SKILLS_ROOT, agent, 'ad-publish', 'SKILL.md'), 'utf8');
    const composition = readFileSync(
      join(SKILLS_ROOT, agent, 'ad-publish', 'references', 'composition.md'),
      'utf8'
    );
    const sourcePolicy = readFileSync(
      join(SKILLS_ROOT, agent, 'ad-publish', 'references', 'source-policy.md'),
      'utf8'
    );

    assert.match(
      prism,
      /publication packet[\s\S]*settled claims[\s\S]*material limits[\s\S]*source references/i
    );
    assert.match(prism, /return control[\s\S]*do not invoke[\s\S]*caller/i);
    assert.doesNotMatch(prism, /invoke `\/?ad-publish`/i);
    assert.match(publish, /`ad-prism`[\s\S]*material evaluation claim/i);
    assert.match(
      composition,
      /ordinary (?:comment|collaboration reply)[\s\S]*does not require `ad-prism`/i
    );
    assert.match(
      composition,
      /material evaluation claim[\s\S]*`ad-prism`[\s\S]*regains\s+control/i
    );
    assert.match(sourcePolicy, /does not[\s\S]*(?:freeze|cryptographic)[\s\S]*source/i);
    assert.match(sourcePolicy, /`ad-prism`[\s\S]*settled evaluation artifact/i);
  }
});

test('evaluation methodology routing is visible from adjacent skills and the workflow map', () => {
  const flows = readFileSync(join(__dirname, '..', 'WORKFLOW-FLOWS.md'), 'utf8');
  const section = flows.match(/^## Evaluation Design And Assurance$([\s\S]*?)(?=^## )/m)?.[1] ?? '';

  assert.ok(section, 'WORKFLOW-FLOWS.md must map evaluation design and assurance');
  for (const edge of [
    /Request --> Prism/,
    /Prism --> Research/,
    /Prism --> Ground/,
    /Prism --> Spike/,
    /Prism --> Material/,
    /Material -->\|yes\| Freeze/,
    /Freeze --> MethodAudit/,
    /MethodAudit --> Final/,
    /Final --> Packet/,
    /Packet --> Publish/,
    /Ordinary --> Publish/,
    /Publish --> Voice/,
  ]) {
    assert.match(section, edge, `evaluation workflow is missing ${edge}`);
  }
  assert.doesNotMatch(
    section,
    /MethodAudit --> Packet/,
    'a material evaluation may not bypass correction, revalidation, and the final freeze'
  );

  for (const agent of ['claude-code', 'codex']) {
    for (const skill of ['ad-ground', 'ad-research', 'ad-spike', 'ad-audit']) {
      const body = readFileSync(join(SKILLS_ROOT, agent, skill, 'SKILL.md'), 'utf8');
      assert.match(
        routingSurface(body, agent, skill),
        /\/ad-prism/,
        `${agent}/${skill} must route evaluation methodology to ad-prism`
      );
    }
    const report = readFileSync(join(SKILLS_ROOT, agent, 'ad-report', 'SKILL.md'), 'utf8');
    assert.match(report, /`ad-prism`[\s\S]*evaluation methodology/i);
  }
});

test('ad-prism ships cross-domain positive and close-negative dogfood cases', () => {
  for (const agent of ['claude-code', 'codex']) {
    const cases = JSON.parse(
      readFileSync(join(SKILLS_ROOT, agent, 'ad-prism', 'evals', 'evals.json'), 'utf8')
    ).cases;
    const positives = cases.filter((entry) => entry.expected_route === 'ad-prism');
    const negativeRoutes = new Set(
      cases
        .filter((entry) => entry.expected_route !== 'ad-prism')
        .map((entry) => entry.expected_route)
    );

    assert.ok(new Set(positives.map((entry) => entry.domain)).size >= 3);
    assert.ok(positives.every((entry) => entry.expected_outcomes.length >= 4));
    for (const route of ['ad-research', 'ad-spike', 'ad-audit', 'ordinary-tests']) {
      assert.ok(negativeRoutes.has(route), `${agent} needs a close negative for ${route}`);
    }
  }
});

test('the canonical skill guide lists every bundled skill exactly once', () => {
  const guide = readFileSync(join(__dirname, '..', 'doc', 'guides', 'skills.md'), 'utf8');
  const names = bundledSkills('claude-code');

  for (const name of names) {
    const rows = guide.split('\n').filter((line) => line.startsWith(`| \`/${name}\` |`));
    assert.equal(rows.length, 1, `doc/guides/skills.md must list /${name} exactly once`);
  }
});

test('ad-roadmap explains the delivery story as a newcomer-readable checklist on both hosts', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-roadmap');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const templates = readFileSync(join(skillDir, 'references', 'output-templates.md'), 'utf8');
    const projectSection =
      templates.match(/^## Project roadmap template$([\s\S]*?)^## Task roadmap template$/m)?.[1] ??
      '';
    const example = projectSection.match(/```(?:markdown)?\n([\s\S]*?)```/)?.[1] ?? '';

    assert.match(
      body,
      /decision-maker brief returned by `ad-brief`/i,
      `${agent} must lead with the canonical brief`
    );
    assert.match(body, /main delivery front/i, `${agent} must name the main delivery front`);
    assert.match(body, /next front/i, `${agent} must name the next delivery front`);
    assert.match(
      body,
      /working tree[^\n]*most recent commit/i,
      `${agent} must prefer live repository evidence when several tasks are marked in progress`
    );
    assert.match(
      body,
      /only[^\n]*in-progress[^\n]*`## Context`[^\n]*`## Acceptance Criteria`/i,
      `${agent} may deepen only the active task's purpose and acceptance criteria`
    );
    assert.match(
      body,
      /no (?:task|work)[^\n]*in progress[^\n]*first remaining/i,
      `${agent} must not invent current work when nothing is in progress`
    );
    assert.match(example, /^- \[x\] .+/m, `${agent} example must show delivered work as checked`);
    assert.match(example, /^- \[ \] .+/m, `${agent} example must show remaining work as open`);
    assert.match(
      example,
      /^- \[ \] .*in progress[\s\S]*?^ {2}- \[x\] .+[\s\S]*?^ {2}- \[ \] .+/im,
      `${agent} example must explain in-progress work through nested checked and open steps`
    );
    assert.ok(
      example.indexOf('<decision-maker brief returned by `ad-brief`>') <
        example.indexOf('### Roadmap checklist'),
      `${agent} must explain the delivery story before showing tier evidence`
    );
  }
});

test('ad-roadmap defaults to project scope and uses a separate task template only when asked', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-roadmap');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const templates = readFileSync(join(skillDir, 'references', 'output-templates.md'), 'utf8');

    assert.match(
      body,
      /project(?:-wide)? scope[^\n]*default/i,
      `${agent} must default to the project roadmap`
    );
    assert.match(
      body,
      /task scope[^\n]*only[^\n]*explicit/i,
      `${agent} must enter task scope only on an explicit request`
    );
    assert.match(
      body,
      /references\/output-templates\.md/,
      `${agent} must route rendering to the shared templates`
    );
    assert.match(
      templates,
      /^## Project roadmap template$/m,
      `${agent} needs a project-level template`
    );
    assert.match(templates, /^## Task roadmap template$/m, `${agent} needs a task-level template`);
    const projectTemplate =
      templates.match(/^## Project roadmap template$([\s\S]*?)^## Task roadmap template$/m)?.[1] ??
      '';
    const taskTemplate = templates.match(/^## Task roadmap template$([\s\S]*)/m)?.[1] ?? '';
    assert.equal(
      [...templates.matchAll(/^<decision-maker brief returned by `ad-brief`>$/gm)].length,
      2,
      `${agent} templates must compose the same canonical brief`
    );
    assert.match(
      templates,
      /^### Roadmap checklist$/m,
      `${agent} project template needs the whole roadmap checklist`
    );
    assert.match(
      templates,
      /^### Task checklist$/m,
      `${agent} task template needs its own step checklist`
    );
    assert.match(
      projectTemplate,
      /^- \[ \] .+\n {2}- \[[ x]\] .+/m,
      `${agent} project checklist must make tasks and subtasks visible`
    );
    assert.match(
      taskTemplate,
      /^- \[ \] .+\n {2}- \[[ x]\] .+/m,
      `${agent} task checklist must make tasks and subtasks visible`
    );
  }
});

test('ad-roadmap delegates the decision-maker brief and retains its checklist', () => {
  for (const agent of ['claude-code', 'codex']) {
    const briefDir = join(SKILLS_ROOT, agent, 'ad-brief');
    assert.ok(existsSync(briefDir), `${agent} must ship the ad-brief specialist`);

    const brief = readFileSync(join(briefDir, 'SKILL.md'), 'utf8');
    const roadmap = readFileSync(join(SKILLS_ROOT, agent, 'ad-roadmap', 'SKILL.md'), 'utf8');

    assert.match(
      roadmap,
      /pass(?:es)? (?:a |the )?settled roadmap fact packet to `ad-brief`/i,
      `${agent} roadmap must pass already-reconciled facts to ad-brief`
    );
    assert.match(
      roadmap,
      /regain(?:s)? control[\s\S]*append(?:s)? (?:the )?(?:project- or task-scoped )?nested checklist/i,
      `${agent} roadmap must regain control and append its specialist checklist`
    );
    assert.match(
      roadmap,
      /project scope[\s\S]*pass[^\n]*material confidence limits[^\n]*to `ad-brief`/i,
      `${agent} project roadmap must pass material confidence limits to ad-brief`
    );
    assert.match(
      roadmap,
      /task scope[\s\S]*pass[^\n]*material confidence limits[^\n]*to `ad-brief`/i,
      `${agent} task roadmap must pass material confidence limits to ad-brief`
    );
    assert.match(
      brief,
      /settled fact packet/i,
      `${agent} brief must accept facts supplied by a specialist caller`
    );
    assert.match(
      brief,
      /do not (?:reconcile|reinterpret)[^\n]*specialist/i,
      `${agent} brief must not absorb the caller's specialist reasoning`
    );
  }
});

test('ad-roadmap templates place the canonical brief before specialist checklists', () => {
  for (const agent of ['claude-code', 'codex']) {
    const templates = readFileSync(
      join(SKILLS_ROOT, agent, 'ad-roadmap', 'references', 'output-templates.md'),
      'utf8'
    );
    const project =
      templates.match(/^## Project roadmap template$([\s\S]*?)^## Task roadmap template$/m)?.[1] ??
      '';
    const task = templates.match(/^## Task roadmap template$([\s\S]*)/m)?.[1] ?? '';

    for (const [scope, template, checklist] of [
      ['project', project, '### Roadmap checklist'],
      ['task', task, '### Task checklist'],
    ]) {
      assert.match(
        template,
        /<decision-maker brief returned by `ad-brief`>/i,
        `${agent} ${scope} template must compose ad-brief`
      );
      assert.ok(
        template.indexOf('<decision-maker brief returned by `ad-brief`>') <
          template.indexOf(checklist),
        `${agent} ${scope} template must explain the work before its checklist`
      );
      assert.doesNotMatch(
        template,
        /### (?:30-second overview|Current front|Current step)/i,
        `${agent} ${scope} template must not keep a second briefing presentation`
      );
    }
  }
});

test('ad-brief restores live session context and escalates only genuine judgment', () => {
  for (const agent of ['claude-code', 'codex']) {
    const briefDir = join(SKILLS_ROOT, agent, 'ad-brief');
    const body = readFileSync(join(briefDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(briefDir, 'references', 'output-template.md'), 'utf8');

    assert.match(
      body,
      /git status[\s\S]*current branch[\s\S]*recent commit/i,
      `${agent} brief must ground itself in live repository state`
    );
    assert.match(
      body,
      /active task[\s\S]*spec[\s\S]*(?:ADR|decision)[\s\S]*(?:PRD|product)/i,
      `${agent} brief must recover the governing project artifacts`
    );
    assert.match(
      body,
      /live (?:repository )?(?:evidence|state)[^\n]*outranks[^\n]*conversation/i,
      `${agent} brief must not trust stale conversational state over the repository`
    );
    assert.match(
      body,
      /one screen[\s\S]*expand only when clarity\s+requires/i,
      `${agent} brief must be concise without sacrificing comprehension`
    );
    for (const label of [
      'Project',
      'Final objective',
      'Recent result',
      'Now',
      'Why it matters',
      'Next',
      'Done when',
      'Blocker',
      'Confidence',
      'Your attention',
    ]) {
      assert.match(template, new RegExp(`\\*\\*${label}:\\*\\*`), `${agent} brief needs ${label}`);
    }
    assert.match(
      body,
      /no decision needed[\s\S]*one question[\s\S]*recommendation first[\s\S]*value[\s\S]*risk[\s\S]*reversibility/i,
      `${agent} brief must separate autonomous progress from genuine owner judgment`
    );
  }
});

test('ad-brief ships representative evaluations for its three decision outcomes', () => {
  const expectedCases = [
    'evidence-settles-the-path',
    'owner-judgment-remains',
    'completed-decision-needs-an-audit-trail',
  ];

  for (const agent of ['claude-code', 'codex']) {
    const evalPath = join(SKILLS_ROOT, agent, 'ad-brief', 'evals', 'evals.json');
    assert.ok(existsSync(evalPath), `${agent} ad-brief must ship behavioral evaluations`);

    const evaluation = JSON.parse(readFileSync(evalPath, 'utf8'));
    assert.deepEqual(
      evaluation.cases.map(({ id }) => id),
      expectedCases,
      `${agent} ad-brief must cover each owner-decision outcome`
    );

    for (const scenario of evaluation.cases) {
      assert.equal(scenario.expected_route, 'ad-brief');
      assert.ok(
        scenario.expected_outcomes.length >= 4,
        `${scenario.id} needs an observable rubric`
      );
    }
  }
});

test('ad-brief exposes concrete examples for each semantic decision mode', () => {
  for (const agent of ['claude-code', 'codex']) {
    const briefDir = join(SKILLS_ROOT, agent, 'ad-brief');
    const body = readFileSync(join(briefDir, 'SKILL.md'), 'utf8');
    const examplesPath = join(briefDir, 'references', 'decision-examples.md');

    assert.ok(existsSync(examplesPath), `${agent} ad-brief must ship decision examples`);
    assert.match(
      body,
      /references\/decision-examples\.md/,
      `${agent} ad-brief must route decision shaping through the examples`
    );

    const examples = readFileSync(examplesPath, 'utf8');
    for (const mode of ['Settled path', 'Owner judgment', 'Completed decision']) {
      assert.ok(examples.includes(`## ${mode}`), `${agent} examples need the ${mode} mode`);
    }
  }
});

test('ad-rules validates the composed brief before correction mode returns', () => {
  for (const agent of ['claude-code', 'codex']) {
    const body = readFileSync(join(SKILLS_ROOT, agent, 'ad-rules', 'SKILL.md'), 'utf8');

    assert.match(body, /returns, verify that every output-template field/i);
    assert.match(body, /every output-template field/i);
    assert.match(body, /rendered meaning[\s\S]*decision checks/i);
    assert.match(
      body,
      /exact missing[\s\S]*correct[\s\S]*before (?:you )?regain control/i,
      `${agent} ad-rules must repair an invalid decision-maker brief before continuing`
    );
  }
});

test('ad-merge has a release-only mode that preserves the tagged commit', () => {
  for (const agent of ['claude-code', 'codex']) {
    const body = readFileSync(join(SKILLS_ROOT, agent, 'ad-merge', 'SKILL.md'), 'utf8');
    assert.match(body, /release-only/i, `${agent} ad-merge must name its release-only mode`);
    assert.match(body, /--merge/, `${agent} ad-merge must force --merge for a release`);
    assert.match(
      body,
      /<github-command> pr merge <num> --merge/,
      `${agent} ad-merge must use its preflight GitHub frontend for a release`
    );
    assert.match(body, /squash/i, `${agent} ad-merge must reject squash for a release`);
    assert.match(body, /rebase/i, `${agent} ad-merge must reject rebase for a release`);
  }
});

test('ad-bootstrap templates preserve every AGENTS to GUIDELINES pointer mapping', () => {
  const mappings = [
    ['Code Style', 2],
    ['Quality Gates', 8],
    ['Commit & PR Conventions', 10],
    ['Security & Privacy', 12],
  ];

  for (const agent of ['claude-code', 'codex']) {
    const template = readFileSync(
      join(SKILLS_ROOT, agent, 'ad-bootstrap', 'references', 'agents-template.md'),
      'utf8'
    );
    for (const [heading, guidelinesSection] of mappings) {
      const start = template.indexOf(`## ${heading}\n`);
      assert.notEqual(start, -1, `${agent} template must define the ${heading} section`);
      const end = template.indexOf('\n## ', start + 1);
      const body = template.slice(start, end === -1 ? template.length : end);
      const pointerStart = body.indexOf('<when-guidelines-md-exists>');
      const pointerEnd = body.indexOf('</when-guidelines-md-exists>');
      assert.notEqual(pointerStart, -1, `${agent} ${heading} needs a GUIDELINES-only branch`);
      assert.notEqual(pointerEnd, -1, `${agent} ${heading} must close its GUIDELINES-only branch`);
      const pointerBranch = body.slice(pointerStart, pointerEnd);
      assert.match(
        pointerBranch,
        new RegExp(`GUIDELINES\\.md[^\\n]*§\\s*${guidelinesSection}\\b`),
        `${agent} ${heading} must point to GUIDELINES.md §${guidelinesSection} when it exists`
      );
    }
  }
});

test('ad-community-docs keeps policy ownership with the maintainer on both hosts', () => {
  for (const agent of ['claude-code', 'codex']) {
    const body = readFileSync(join(SKILLS_ROOT, agent, 'ad-community-docs', 'SKILL.md'), 'utf8');
    assert.match(body, /unreadable\[\]/, `${agent} must surface unreadable policy documents`);
    assert.match(body, /do not overwrite/i, `${agent} must preserve existing policy documents`);
    assert.match(body, /not configured/i, `${agent} must preserve an explicit unconfigured policy`);
    assert.match(body, /never replace/i, `${agent} must not replace existing documents`);
  }
});

test('ad-task requires a local scope anchor before creating a task', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-task');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(skillDir, 'references', 'task-template.md'), 'utf8');

    assert.match(body, /scope preflight/i, `${agent} must establish the target repository first`);
    assert.match(body, /current repository/i, `${agent} must anchor the task to its repository`);
    assert.match(body, /scope-anchors\.mjs/, `${agent} must run deterministic anchor discovery`);
    assert.match(body, /do not write/i, `${agent} must stop when no local scope anchor exists`);
    assert.match(
      template,
      /^\*\*Scope ref:\*\*/m,
      `${agent} task template needs a Scope ref field`
    );
    assert.match(
      template,
      /^\*\*Evidence ref:\*\*/m,
      `${agent} task template needs an Evidence ref field`
    );
  }
});

test('ad-ground persists a validated evidence receipt before non-trivial work', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-ground');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(skillDir, 'references', 'record-template.md'), 'utf8');
    const philosophy = readFileSync(join(SKILLS_ROOT, agent, 'ad-philosophy', 'SKILL.md'), 'utf8');

    assert.match(
      body,
      /Persist the evidence receipt|persist the evidence receipt/i,
      `${agent} must persist ground evidence`
    );
    assert.match(body, /validate-record\.mjs/, `${agent} must validate the evidence receipt`);
    assert.match(
      body,
      /chat citations are not an audit trail/i,
      `${agent} must reject chat-only grounding`
    );
    assert.match(
      body,
      /reopen every cited source/i,
      `${agent} must distinguish a source map from source verification`
    );
    assert.match(template, /^# GROUND-<NNNN>:/m, `${agent} must ship the ground-record template`);
    assert.match(template, /^## Source register$/m, `${agent} record must register sources`);
    assert.match(template, /^## Audit path$/m, `${agent} record must explain audit replay`);
    assert.match(
      philosophy,
      /durable (project artifact|evidence record)/i,
      `${agent} philosophy must require durable evidence`
    );
    assert.match(
      philosophy,
      /chat-only citations|citations exist only in the session/i,
      `${agent} philosophy must reject chat-only grounding`
    );
  }
});

test('ad-handoff keeps preparation exhaustive but makes the resume brief concise', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-handoff');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(skillDir, 'references', 'handoff-template.md'), 'utf8');

    assert.match(
      body,
      /preparation receipt/i,
      `${agent} must require a compact preparation receipt`
    );
    assert.match(
      body,
      /private preparation pass/i,
      `${agent} must preserve exhaustive private preparation`
    );
    assert.match(
      body,
      /do not print the full applied-binding statement/i,
      `${agent} must keep the verbose posture audit out of the resumed session`
    );
    assert.match(template, /^## Resume protocol$/m, `${agent} template needs a resume protocol`);
    for (const label of ['Rules', 'Context', 'State', 'Method']) {
      assert.match(
        template,
        new RegExp(`- \\[x\\] \\*\\*${label}:\\*\\*`),
        `${agent} resume receipt must cover ${label.toLowerCase()}`
      );
    }
    assert.match(
      template,
      /At resume time, print the decision-maker brief returned by `\/?ad-brief`/i,
      `${agent} resume must use the canonical decision-maker brief`
    );
    assert.match(
      template,
      /continue immediately/i,
      `${agent} must not ask for permission when no judgment call remains`
    );
    assert.doesNotMatch(
      template,
      /Invoke `?\/?ad-philosophy`? explicitly/,
      `${agent} resume must not trigger the verbose explicit-invocation output`
    );
    if (agent === 'claude-code') {
      assert.match(
        body,
        /follow its `Resume protocol` before any work/i,
        'Claude handoff chip must use the compact resume protocol'
      );
      assert.doesNotMatch(
        body,
        /instruction to invoke `\/ad-philosophy` explicitly before any work/i,
        'Claude handoff chip must not restore the verbose explicit-invocation path'
      );
    }
  }
});

test('ad-handoff delegates the resume brief and retains the durable handoff protocol', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-handoff');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(skillDir, 'references', 'handoff-template.md'), 'utf8');

    assert.match(
      body,
      /pass(?:es)?[\s\S]*settled resume fact packet[\s\S]*`\/?ad-brief`/i,
      `${agent} handoff must pass settled resume facts to ad-brief`
    );
    assert.match(
      body,
      /regain control[\s\S]*(?:write|persist)[\s\S]*handoff/i,
      `${agent} handoff must retain ownership of the durable artifact`
    );
    assert.match(
      template,
      /At resume time, print the decision-maker brief returned by `\/?ad-brief`/i,
      `${agent} resume protocol must defer the canonical brief until resume time`
    );
    assert.match(
      body,
      /keep[\s\S]*runtime instruction[\s\S]*verbatim[\s\S]*do not replace[\s\S]*handoff creation/i,
      `${agent} handoff creation must not freeze a stale decision-maker brief`
    );
    assert.match(template, /^### Preparation$/m, `${agent} must retain the preparation receipt`);
    assert.match(template, /^## Working rules$/m, `${agent} must retain the handoff rules`);
    assert.match(template, /^## Roadmap$/m, `${agent} must retain the durable roadmap`);
    assert.match(
      template,
      /^## Asks that never landed$/m,
      `${agent} must retain the lost-ask sweep`
    );
    assert.match(body, /redact/i, `${agent} must retain secret redaction`);
  }
});

test('ad-rules separates inventory from correction and reports the corrected plan', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-rules');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');

    assert.match(
      body,
      /inventory mode[\s\S]*correction mode/i,
      `${agent} rules must distinguish inspection from a correction gesture`
    );
    assert.match(
      body,
      /(?:the rules|rules correction)[\s\S]*(?:invoke|apply)[\s\S]*`\/?ad-philosophy`[\s\S]*applied-binding/i,
      `${agent} correction mode must apply the existing philosophy recommitment`
    );
    assert.match(
      body,
      /correct[\s\S]*(?:conflicting|incompatible)[\s\S]*(?:plan|next action)/i,
      `${agent} correction mode must repair the active plan`
    );
    assert.match(
      body,
      /settled[\s\S]*(?:correction|session) fact packet[\s\S]*`\/?ad-brief`[\s\S]*regain control/i,
      `${agent} correction mode must return a canonical briefing before rules regains control`
    );
    assert.match(
      body,
      /which rules|list[\s\S]*topics[\s\S]*inventory mode/i,
      `${agent} explicit information requests must remain inventory-only`
    );
  }
});

test('ad-brief stays private while ad-publish retains every outward-language gate', () => {
  for (const agent of ['claude-code', 'codex']) {
    const brief = readFileSync(join(SKILLS_ROOT, agent, 'ad-brief', 'SKILL.md'), 'utf8');
    const publish = readFileSync(join(SKILLS_ROOT, agent, 'ad-publish', 'SKILL.md'), 'utf8');
    const composition = readFileSync(
      join(SKILLS_ROOT, agent, 'ad-publish', 'references', 'composition.md'),
      'utf8'
    );

    assert.match(
      brief,
      /private owner-agent context[\s\S]*not[\s\S]*intended outward content/i,
      `${agent} briefing must not become publication input by implication`
    );
    assert.match(
      brief,
      /never (?:pass|send)[\s\S]*(?:brief|briefing)[\s\S]*`\/?ad-(?:publish|voice)`/i,
      `${agent} briefing must route no private packet into publication skills`
    );
    assert.match(
      publish,
      /silent source-role ledger/i,
      `${agent} publish must classify every source role`
    );
    assert.match(
      publish,
      /conversation language[\s\S]*first approval preview[\s\S]*publication language/i,
      `${agent} publish must retain the two-language approval boundary`
    );
    assert.match(
      publish,
      /Every final title and body[\s\S]*every final collaboration reply[\s\S]*`\/?ad-voice`/i,
      `${agent} publish must route every outward text through voice`
    );
    assert.match(
      composition,
      /not private[\s\S]*deliberation[\s\S]*every final title, body, or reply/i,
      `${agent} publish-to-voice packet must exclude private deliberation`
    );
  }
});

test('GitHub workflow skills reuse their preflight frontend for every GitHub command', () => {
  for (const agent of ['claude-code', 'codex']) {
    for (const skill of ['ad-pr', 'ad-merge']) {
      const body = readFileSync(join(SKILLS_ROOT, agent, skill, 'SKILL.md'), 'utf8');
      assert.match(
        body,
        /AGENTIC_GH=<wrapper>/,
        `${agent}/${skill} must accept the repository's executable GitHub wrapper`
      );
      assert.match(
        body,
        /`github\.command`/,
        `${agent}/${skill} must retain the preflight frontend`
      );
      assert.match(
        body,
        /<github-command>/,
        `${agent}/${skill} must use the preflight frontend in later phases`
      );
      assert.match(
        body,
        /<github-command> auth login/,
        `${agent}/${skill} must recover authentication through the preflight frontend`
      );
      assert.match(
        body,
        /configured wrapper/,
        `${agent}/${skill} must distinguish an unavailable configured wrapper from a missing CLI`
      );
      assert.doesNotMatch(
        body,
        /^gh (?:api|auth login|pr (?:create|merge|view))/m,
        `${agent}/${skill} must not run a later GitHub command through a different frontend`
      );
      assert.doesNotMatch(
        body,
        /GH_CONFIG_DIR="\$HOME\/\.config\/gh-personal"/,
        `${agent}/${skill} must not ship this repository's local account configuration`
      );
    }
    const prBody = readFileSync(join(SKILLS_ROOT, agent, 'ad-pr', 'SKILL.md'), 'utf8');
    assert.match(
      prBody,
      /<github-command> pr create --draft/,
      `${agent}/ad-pr must retain the preflight frontend for a red draft`
    );
    assert.doesNotMatch(
      prBody,
      /`gh pr create --draft`/,
      `${agent}/ad-pr must not suggest a red draft through a different frontend`
    );
    const mergeBody = readFileSync(join(SKILLS_ROOT, agent, 'ad-merge', 'SKILL.md'), 'utf8');
    assert.match(
      mergeBody,
      /pullRequest\.reviews/,
      `${agent}/ad-merge must reuse reviews returned by the preflight`
    );
  }
});

// Archiving an ADR hard-deletes the file and leaves the plain-text `ADR-NNNN`
// mention as a breadcrumb resolvable via git log (576bb9d). A cited *path*
// does not survive that: it ships to every consuming project pointing at a
// file the kit no longer has. Paths inside fenced blocks are illustrative
// output, not citations, so they are skipped.
const REPO_ROOT = join(__dirname, '..');

function citedAdrPaths(filePath) {
  const cited = [];
  let inFence = false;
  let fenceCount = 0;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      fenceCount += 1;
      return;
    }
    if (inFence) return;
    for (const match of line.matchAll(/doc\/adr\/\d{4}-[a-z0-9-]+\.md/g)) {
      cited.push({ path: match[0], line: index + 1 });
    }
  });
  // An unterminated fence would silently swallow every citation after it,
  // turning this guard into a no-op exactly where it is needed.
  assert.equal(
    fenceCount % 2,
    0,
    `${filePath}: unterminated code fence (${fenceCount} markers) — ` +
      `the dead-ADR-path guard cannot read past it`
  );
  return cited;
}

// A dead path in a subagent manifest or a bundled references/ file ships just
// as widely as one in the skill body, so the guard covers every installed
// file, not only SKILL.md. references/ joined the set with the ADR-0056
// rollout: those files install alongside the skill, so a dead path inside one
// dangles in every consumer exactly like a dead path in SKILL.md.
function installedFiles(dir) {
  const files = [join(dir, 'SKILL.md')];
  for (const sub of ['agents', 'references']) {
    const subDir = join(dir, sub);
    if (!existsSync(subDir)) continue;
    for (const entry of readdirSync(subDir)) {
      if (statSync(join(subDir, entry)).isFile()) {
        files.push(join(subDir, entry));
      }
    }
  }
  return files;
}

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    test(`skill ${agent}/${name}: every cited ADR path resolves to a real file`, () => {
      for (const filePath of installedFiles(dir)) {
        for (const { path, line } of citedAdrPaths(filePath)) {
          assert.ok(
            existsSync(join(REPO_ROOT, path)),
            `${filePath.slice(REPO_ROOT.length + 1)}:${line} cites ${path}, ` +
              `which does not exist. If the ADR was archived, keep the ` +
              `plain-text ADR-NNNN breadcrumb and drop the path — a dead ` +
              `path ships to every consuming project.`
          );
        }
      }
    });
  }
}

// Documentation Discipline rule 3 (ad-philosophy) bans emoji in every shipped
// file. The references/ files added by the ADR-0056 rollout had no guard — and
// neither did SKILL.md or the agents/ briefs. installedFiles() already
// enumerates every shipped file in a skill (SKILL.md + agents/ + references/),
// so one check over it covers them all. The class targets pictographic emoji,
// regional-indicator flags, and the emoji variation selector; text-level
// dingbats are deliberately left out to avoid false positives on legitimate
// symbols.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    test(`skill ${agent}/${name}: no emoji in any installed file (Documentation Discipline)`, () => {
      for (const filePath of installedFiles(dir)) {
        readFileSync(filePath, 'utf8')
          .split('\n')
          .forEach((line, index) => {
            assert.ok(
              !EMOJI.test(line),
              `${filePath.slice(REPO_ROOT.length + 1)}:${index + 1} contains an emoji — ` +
                'Documentation Discipline rule 3 bans emoji in shipped skill files'
            );
          });
      }
    });
  }
}

for (const { name, dir } of listSkills('codex')) {
  test(`skill codex/${name}: agents/openai.yaml parses with required fields`, () => {
    const yamlPath = join(dir, 'agents', 'openai.yaml');
    assert.ok(existsSync(yamlPath), `${yamlPath} must exist (cc-sdd convention)`);
    const doc = yaml.load(readFileSync(yamlPath, 'utf8'));
    assert.equal(typeof doc?.interface?.display_name, 'string');
    assert.equal(typeof doc?.interface?.short_description, 'string');
    assert.equal(typeof doc?.policy?.allow_implicit_invocation, 'boolean');
  });
}

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    const manifestPath = join(dir, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const subagentRel of manifest.subagents || []) {
      test(`skill ${agent}/${name}: manifest subagent ${subagentRel} parses with required fields`, () => {
        const subagentPath = join(dir, subagentRel);
        if (agent === 'claude-code') {
          const fm = parseFrontmatter(subagentPath);
          assert.equal(typeof fm.name, 'string', 'subagent name must be a string');
          assert.equal(typeof fm.description, 'string', 'subagent description must be a string');
          assert.ok(fm.description.length > 0, 'subagent description must not be empty');
          assert.equal(
            typeof fm.tools,
            'string',
            'subagent tools must be a string (comma-separated)'
          );
          assert.equal(typeof fm.model, 'string', 'subagent model must be a string');
          return;
        }

        const text = readFileSync(subagentPath, 'utf8');
        assert.match(text, /^name = ".+"/m, 'Codex subagent must declare name');
        assert.match(text, /^description = ".+"/m, 'Codex subagent must declare description');
        assert.match(
          text,
          /^developer_instructions = """[\s\S]+"""$/m,
          'Codex subagent must declare developer_instructions'
        );
      });
    }
  }
}

// --- Cross-host parity: the platform-identifier guard (tasks 0005, 0032) ---

// Briefs that read a code diff can meet an identifier they cannot verify, and
// task 0005 recorded what happens without a guard: two reviewers independently
// called a real model name fabricated. `rule-candidate-reviewer` is excluded on
// purpose — it reviews proposed rule text against rule files and never sees a
// diff, so the guard would be dead weight there (task 0032 scope decision).
const DIFF_READING_BRIEFS = [
  'claude-code/ad-review/agents/fresh-context-reviewer.md',
  'claude-code/ad-audit/agents/audit-group-reviewer.md',
  'codex/ad-review/agents/fresh-context-reviewer.toml',
  'codex/ad-audit/agents/audit-group-reviewer.toml',
];

test('every diff-reading reviewer brief carries the platform-identifier guard, on both hosts', () => {
  for (const rel of DIFF_READING_BRIEFS) {
    const path = join(SKILLS_ROOT, rel);
    assert.ok(existsSync(path), `${rel} is missing`);
    const body = readFileSync(path, 'utf8').toLowerCase();
    assert.ok(
      body.includes('fabricated'),
      `${rel} does not forbid the "fabricated identifier" claim — see tasks 0005 and 0032`
    );
    assert.ok(
      body.includes('unfamiliarity') || body.includes('absence of recognition'),
      `${rel} forbids the claim but not the reasoning that produces it (unfamiliarity)`
    );
  }
});

test('fresh-context reviewers leave the repository unchanged after verification', () => {
  const briefs = [
    'claude-code/ad-review/agents/fresh-context-reviewer.md',
    'codex/ad-review/agents/fresh-context-reviewer.toml',
  ];

  for (const rel of briefs) {
    const body = readFileSync(join(SKILLS_ROOT, rel), 'utf8').toLowerCase();
    assert.match(
      body,
      /(?:operating-system|os)\s+temp(?:orary)? directory/,
      `${rel} must keep verification artifacts outside the repository`
    );
    assert.match(
      body,
      /(?:git status --porcelain[\s\S]{0,120}|repository (?:status|tree)[^\n]{0,120})\bsame\b/,
      `${rel} must require an unchanged repository after review`
    );
  }

  const claude = readFileSync(join(SKILLS_ROOT, briefs[0]), 'utf8').toLowerCase();
  assert.match(claude, /(?:delete|remove)[\s\S]{0,80}when you are\s+done/);
  assert.match(claude, /never modify tracked files/);
});

test('the guard list covers every brief that exists, so a new brief cannot be forgotten', () => {
  const found = [];
  for (const agent of ['claude-code', 'codex']) {
    for (const { name, dir } of listSkills(agent)) {
      const agentsDir = join(dir, 'agents');
      if (!existsSync(agentsDir)) continue;
      for (const file of readdirSync(agentsDir)) {
        if (file.endsWith('.md') || file.endsWith('.toml')) {
          found.push(`${agent}/${name}/agents/${file}`);
        }
      }
    }
  }
  // Every brief is either guarded or explicitly excluded — nothing unaccounted for.
  const EXCLUDED = found.filter((p) => p.includes('rule-candidate-reviewer'));
  const accounted = new Set([...DIFF_READING_BRIEFS, ...EXCLUDED]);
  const unaccounted = found.filter((p) => !accounted.has(p));
  assert.deepEqual(
    unaccounted,
    [],
    `new reviewer brief(s) not classified as guarded or excluded: ${unaccounted.join(', ')}`
  );
});

// --- Cross-host parity: the anchor-echo contract (task-0033) ---

// The anchor contract has two carriers: the audit handoff template (in
// SKILL.md) and the reviewer brief. A machine with a stale installed brief
// still receives the contract through the handoff, but the shipped source
// must carry both so installs converge — the task-0033 self-audit observed a
// live dispatch running a pre-change brief while the handoff carried the
// contract.
const ANCHOR_ECHO_BRIEFS = [
  'claude-code/ad-audit/agents/audit-group-reviewer.md',
  'codex/ad-audit/agents/audit-group-reviewer.toml',
];

test('the audit-group-reviewer brief carries the anchor-echo contract, on both hosts', () => {
  for (const rel of ANCHOR_ECHO_BRIEFS) {
    const path = join(SKILLS_ROOT, rel);
    assert.ok(existsSync(path), `${rel} is missing`);
    const body = readFileSync(path, 'utf8');
    assert.ok(
      body.includes('Anchors: <file>=<sha256>, target=<SHA>'),
      `${rel} lost the anchor-echo line shape (task-0033)`
    );
    assert.ok(
      body.includes('never copied'),
      `${rel} no longer forbids copying the handoff's expected values`
    );
    assert.ok(
      body.includes('UNVERIFIED'),
      `${rel} no longer states the UNVERIFIED consequence of a missing echo`
    );
  }
});

test('the ad-audit skill carries the expected-anchors block and the UNVERIFIED rule, on both hosts', () => {
  for (const rel of ['claude-code/ad-audit/SKILL.md', 'codex/ad-audit/SKILL.md']) {
    const body = readFileSync(join(SKILLS_ROOT, rel), 'utf8');
    assert.ok(
      body.includes('EXPECTED ANCHORS'),
      `${rel} lost the EXPECTED ANCHORS handoff section (task-0033)`
    );
    assert.ok(
      body.includes('UNVERIFIED'),
      `${rel} lost the anchor-mismatch UNVERIFIED aggregation rule (task-0033)`
    );
  }
});

test('the ad-audit skill carries the empirical-falsification lane, on both hosts (ADR-0052)', () => {
  for (const rel of ['claude-code/ad-audit/SKILL.md', 'codex/ad-audit/SKILL.md']) {
    const body = readFileSync(join(SKILLS_ROOT, rel), 'utf8');
    assert.ok(
      body.includes('empirical falsification lane') ||
        body.includes('Empirical falsification lane'),
      `${rel} lost the empirical-falsification lane (ADR-0052, C4)`
    );
    assert.ok(body.includes('ADR-0052'), `${rel} no longer cites ADR-0052 for the lane`);
    // The lane's load-bearing constraints — orchestrator-only + serial — must
    // survive an edit, since ADR-0052 makes them non-negotiable.
    assert.ok(
      body.toLowerCase().includes('cannot fail'),
      `${rel} lost the lane's narrow "cannot fail" trigger`
    );
    assert.ok(
      body.toLowerCase().includes('serial'),
      `${rel} lost the lane's serial constraint (the load-113 lesson)`
    );
  }
});

test('both audit-group-reviewer briefs forbid mutation and hand the lane trigger up (ADR-0052)', () => {
  for (const rel of ANCHOR_ECHO_BRIEFS) {
    const body = readFileSync(join(SKILLS_ROOT, rel), 'utf8');
    assert.ok(body.includes('ADR-0052'), `${rel} lost the ADR-0052 mutation guard`);
    assert.ok(
      body.toLowerCase().includes('cannot fail'),
      `${rel} no longer names the "cannot fail" inference it must hand up`
    );
  }
});

// --- Skill scripts host parity (task-0031) ---
// A skill script (scripts/ beside SKILL.md) is host-agnostic executable code:
// both hosts must ship it, byte-identical, so the copy-drift that motivated
// task-0031 (inline probe blocks maintained per host) cannot re-enter through
// the scripts/ door. ADR-0057 Decision 3 permits one named exception: global
// rules resolution is host-divergent because each host's own path must win.
const HOST_DIVERGENT_SCRIPTS = new Set(['ad-rules/scripts/resolve-global-rules.mjs']);

function listSkillScripts(agent) {
  const out = new Map();
  for (const { name, dir } of listSkills(agent)) {
    const scriptsDir = join(dir, 'scripts');
    if (!existsSync(scriptsDir)) continue;
    for (const file of readdirSync(scriptsDir)) {
      out.set(`${name}/scripts/${file}`, join(scriptsDir, file));
    }
  }
  return out;
}

test('skill scripts: matching sets, byte-identical except documented host divergence', () => {
  const claude = listSkillScripts('claude-code');
  const codex = listSkillScripts('codex');
  assert.deepEqual(
    [...claude.keys()].sort(),
    [...codex.keys()].sort(),
    'script sets must match across hosts'
  );
  for (const [rel, claudePath] of claude) {
    const same = readFileSync(claudePath).equals(readFileSync(codex.get(rel)));
    if (HOST_DIVERGENT_SCRIPTS.has(rel)) continue;
    assert.ok(same, `${rel}: claude-code and codex copies must be byte-identical`);
  }
});

test('ad-rules global resolution is the sole documented host-divergent script', () => {
  const claude = listSkillScripts('claude-code');
  const codex = listSkillScripts('codex');
  for (const rel of HOST_DIVERGENT_SCRIPTS) {
    assert.ok(claude.has(rel), `Claude Code must ship ${rel}`);
    assert.ok(codex.has(rel), `Codex must ship ${rel}`);
    assert.ok(
      !readFileSync(claude.get(rel)).equals(readFileSync(codex.get(rel))),
      `${rel} must keep its intentional host-specific priority order`
    );
  }
});

test('skill scripts: at least the ad-audit resolution probe ships', () => {
  assert.ok(
    listSkillScripts('claude-code').has('ad-audit/scripts/resolve-rules.mjs'),
    'ad-audit must ship scripts/resolve-rules.mjs (task-0031 first consumer)'
  );
});

// --- The read contract: rule and delivery must not drift apart ---

// WORKFLOW.md §1 states the three-rung read contract; ad-philosophy delivers it
// as posture on both hosts. Two failure modes are being pinned. First, a host
// that carries the rule while the other does not — the copy-drift the dual-host
// source tree exists to prevent. Second, and the reason this test reads the
// constitution too: the delivery cites `WORKFLOW.md` §1 *Reading order* by name,
// so deleting or renaming that subsection would leave 25 installed skills
// pointing at a section that no longer exists. A reference into a void is the
// exact defect the read contract was written to reduce.

test('the read contract is delivered on both hosts and its cited section exists', () => {
  const workflow = readFileSync(join(REPO_ROOT, 'WORKFLOW.md'), 'utf8');
  assert.ok(
    workflow.includes('### Reading order'),
    'WORKFLOW.md lost the `### Reading order` subsection that ad-philosophy cites by name'
  );

  for (const agent of ['claude-code', 'codex']) {
    const path = join(SKILLS_ROOT, agent, 'ad-philosophy', 'SKILL.md');
    const body = readFileSync(path, 'utf8');
    assert.ok(
      body.includes('*Reading order*'),
      `${agent}/ad-philosophy does not deliver the read contract — WORKFLOW.md §1 states it, ` +
        'so a host missing it reads every layer before every change'
    );
    for (const rung of ['definition layer', 'decision records', 'looks wrong']) {
      assert.ok(
        body.includes(rung),
        `${agent}/ad-philosophy cites the read contract but drops the "${rung}" rung`
      );
    }
  }
});

// --- No skill link may climb above the skills root ---

// Skill sources live at `src/skills/<agent>/<skill>/...` but ship into a target
// repo at `.claude/skills/<skill>/...`, so a relative link is only portable if
// it stays inside the skills root. Two ad-audit files linked ADR-0052 with a
// path authored against THIS repo's layout (`../../../../doc/adr/...`) — correct
// here, and pointing outside the target repo entirely once installed. Nothing
// read the link from the installed side, so it shipped. Sibling-skill links
// (`../ad-ground/SKILL.md`) climb one level and survive; anything reaching the
// kit's own `doc/` does not, and belongs in prose as a bare `ADR-NNNN`, which is
// what the Codex twins of both files already did.
//
// The bound is deliberately the skills root, not each file's exact installed
// depth: agent briefs flatten to `.claude/agents/<name>.md` on install, so for
// them this rule is looser than reality. It still catches the whole class.

function skillFilesWithText(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      out.push(...skillFilesWithText(full, rel));
    } else if (/\.(md|toml)$/.test(entry)) {
      out.push({ rel, text: readFileSync(full, 'utf8') });
    }
  }
  return out;
}

test('no skill link escapes the skills root, so it survives installation', () => {
  const escaping = [];
  for (const agent of ['claude-code', 'codex']) {
    for (const { name, dir } of listSkills(agent)) {
      for (const { rel, text } of skillFilesWithText(dir)) {
        // Directories the file sits inside, counted from the skills root:
        // `SKILL.md` → 1 (the skill dir), `agents/brief.md` → 2.
        const depth = rel.split('/').length;
        text.split('\n').forEach((line, index) => {
          for (const link of line.matchAll(/\]\((\.\.\/[^)\s]*)\)/g)) {
            const ups = link[1].split('/').filter((seg) => seg === '..').length;
            if (ups > depth) {
              escaping.push(
                `${agent}/${name}/${rel}:${index + 1} links ${link[1]} ` +
                  `(${ups} levels up from depth ${depth})`
              );
            }
          }
        });
      }
    }
  }

  assert.deepEqual(
    escaping,
    [],
    `skill links climb above the skills root and break once installed:\n  ${escaping.join('\n  ')}`
  );
});

// --- Every WORKFLOW section a skill cites must exist ---

// Skills cite the constitution by section number (`WORKFLOW §10`,
// `WORKFLOW.md §4 + §5`). A citation is only worth its token cost if the
// reader can follow it, and a renumbered or deleted section turns twenty-odd
// pointers into dead ends silently — nothing else in the suite reads both
// sides. Section headings carry ranges (`## 4–5.`), so the range is expanded
// rather than matched literally.

function workflowSectionNumbers(text) {
  const found = new Set();
  for (const match of text.matchAll(/^## ([0-9][0-9–—-]*)\./gm)) {
    const bounds = match[1]
      .split(/[–—-]/)
      .map(Number)
      .filter((n) => Number.isInteger(n));
    if (bounds.length === 2) {
      for (let n = bounds[0]; n <= bounds[1]; n += 1) found.add(n);
    } else if (bounds.length === 1) {
      found.add(bounds[0]);
    }
  }
  return found;
}

test('every WORKFLOW.md section cited by a skill exists in WORKFLOW.md', () => {
  const sections = workflowSectionNumbers(readFileSync(join(REPO_ROOT, 'WORKFLOW.md'), 'utf8'));
  assert.ok(sections.size > 0, 'no numbered sections parsed out of WORKFLOW.md');

  const dangling = [];
  for (const agent of ['claude-code', 'codex']) {
    for (const { name, dir } of listSkills(agent)) {
      const path = join(dir, 'SKILL.md');
      if (!existsSync(path)) continue;
      const lines = readFileSync(path, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!line.includes('WORKFLOW')) return;
        for (const cite of line.matchAll(/§\s*([0-9]+)/g)) {
          const num = Number(cite[1]);
          if (!sections.has(num)) {
            dangling.push(`${agent}/${name}/SKILL.md:${index + 1} cites WORKFLOW §${num}`);
          }
        }
      });
    }
  }

  assert.deepEqual(
    dangling,
    [],
    `skills cite WORKFLOW sections that do not exist:\n  ${dangling.join('\n  ')}`
  );
});

// --- Documentation Discipline: the contract and its delivery carry the same rules ---

// WORKFLOW.md §2 states the rules; ad-philosophy is their operational delivery
// (ADR-0008) and is what actually loads into an agent's context each session.
// The two drifted apart unnoticed: the constitution declared thirteen rules
// authoritative while the skill claimed eleven and listed eleven, so the
// contract an agent obeyed was two rules short of the contract that bound it —
// and one of the missing rules had no delivery anywhere in the kit. Nothing
// read both sides, which is why the gap survived. Numbers are compared rather
// than text: the delivery compresses each rule's wording on purpose.

function disciplineRuleNumbers(text) {
  // Anchor on the section's opening line, not on the phrase: both hosts mention
  // "Documentation Discipline" in prose before the rules begin, and anchoring on
  // the first mention slices a region that holds none of them. The three sources
  // open the section three ways — `### `, `## `, and a bold lead-in.
  const opener = text.match(
    /^(#{2,3} Documentation Discipline|\*\*Documentation Discipline\.\*\*)/m
  );
  assert.ok(opener, 'no Documentation Discipline section opener found');
  const after = text.slice(opener.index);
  // WORKFLOW.md carries later numbered lists (§15's loop-construction ladder),
  // so the slice stops at the next level-2 heading. `\n## ` cannot match
  // `\n### ` — the third `#` is not the space — so the marker's own heading
  // level does not matter.
  const end = after.indexOf('\n## ', 1);
  const section = end === -1 ? after : after.slice(0, end);
  return new Set([...section.matchAll(/^(\d{1,2})\. \*\*/gm)].map((m) => Number(m[1])));
}

test('regression: task 0034 — ad-philosophy delivers every rule WORKFLOW.md declares', () => {
  const declared = disciplineRuleNumbers(readFileSync(join(REPO_ROOT, 'WORKFLOW.md'), 'utf8'));
  assert.ok(declared.size >= 13, `parsed only ${declared.size} rules out of WORKFLOW.md`);

  for (const agent of ['claude-code', 'codex']) {
    const delivered = disciplineRuleNumbers(
      readFileSync(join(SKILLS_ROOT, agent, 'ad-philosophy', 'SKILL.md'), 'utf8')
    );
    const missing = [...declared].filter((n) => !delivered.has(n)).sort((a, b) => a - b);
    const extra = [...delivered].filter((n) => !declared.has(n)).sort((a, b) => a - b);
    assert.deepEqual(
      missing,
      [],
      `${agent}/ad-philosophy does not deliver WORKFLOW.md rule(s) ${missing.join(', ')}`
    );
    assert.deepEqual(
      extra,
      [],
      `${agent}/ad-philosophy delivers rule(s) ${extra.join(', ')} that WORKFLOW.md does not declare`
    );
  }
});

// --- Amendment pairs in this repo's own ADR layer ---

// Partial supersession is declared as a header-field pair (ADR-0049): the
// amending record carries `Amends:`, the amended one carries `Amended by:`.
// An unpaired field is invisible to anything but a prose read, which is the
// cost the pair exists to remove — so the kit gates on its own rule rather
// than only advising it through `ad-drift`.

test('every ADR amendment declares both sides of the pair', () => {
  const adrDir = join(REPO_ROOT, 'doc', 'adr');
  // Relations, not files: one record can amend or be amended by several others,
  // so each side is a set of `from>to` edges rather than one entry per file.
  const amends = new Set();
  const amendedBy = new Set();

  for (const name of readdirSync(adrDir).filter((f) => /^\d{4}-.*\.md$/.test(f))) {
    const id = name.slice(0, 4);
    const body = readFileSync(join(adrDir, name), 'utf8');
    for (const m of body.matchAll(/^\*\*Amends:\*\*\s*\[?ADR-(\d{4})/gm)) {
      amends.add(`${id}>${m[1]}`);
    }
    for (const m of body.matchAll(/^\*\*Amended by:\*\*\s*\[?ADR-(\d{4})/gm)) {
      amendedBy.add(`${id}>${m[1]}`);
    }
  }

  const unpaired = [];
  for (const edge of amends) {
    const [from, to] = edge.split('>');
    if (!amendedBy.has(`${to}>${from}`)) {
      unpaired.push(
        `ADR-${from} declares Amends: ADR-${to}, but ADR-${to} has no matching Amended by:`
      );
    }
  }
  for (const edge of amendedBy) {
    const [from, to] = edge.split('>');
    if (!amends.has(`${to}>${from}`)) {
      unpaired.push(
        `ADR-${from} declares Amended by: ADR-${to}, but ADR-${to} has no matching Amends:`
      );
    }
  }

  assert.deepEqual(unpaired, [], `unpaired ADR amendment fields:\n  ${unpaired.join('\n  ')}`);
});

// A projection is only worth reading if it is current, and the same-commit
// habit that keeps it current is exactly what a hurried commit drops. The
// record count is the cheapest part to verify mechanically, and it was already
// wrong once: the ADR that introduced the projection was itself missing from
// the total. Everything else on that page needs a human; this does not.

test('the ADR projection states the number of ACCEPTED records the directory holds', () => {
  const adrDir = join(REPO_ROOT, 'doc', 'adr');
  const projection = join(adrDir, 'PROJECTION.md');
  if (!existsSync(projection)) return; // the projection is permitted, not required

  // Count only ACCEPTED ADRs, not every file. The projection projects what
  // BINDS (ADR-0049), and its own maintenance rule is "a decision that changes
  // what binds updates the projection in the same commit". A `proposed` ADR
  // binds nothing yet — it changes what binds only when it is accepted — so it
  // is out of the projection's count until then. Counting raw files instead
  // made every `proposed`-ADR commit (the normal `/ad-adr` flow) trip this
  // test against its own stated principle.
  const accepted = readdirSync(adrDir)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .filter((f) =>
      /^\*\*Status:\*\*\s*accepted\b/im.test(readFileSync(join(adrDir, f), 'utf8'))
    ).length;
  const claimed = readFileSync(projection, 'utf8').match(/All (\d+) accepted ADRs/);
  assert.ok(
    claimed,
    'PROJECTION.md no longer states an accepted total in the form "All N accepted ADRs"'
  );
  assert.equal(
    Number(claimed[1]),
    accepted,
    `PROJECTION.md claims ${claimed[1]} accepted ADRs; doc/adr/ holds ${accepted}. ` +
      'Accepting or superseding an ADR changes what binds — update the projection in the same commit. ' +
      'Merely proposing one does not.'
  );
});

// ADR-0073 — invocation class and listing budget, per host.
for (const agent of ['claude-code', 'codex']) {
  const skills = listSkills(agent);
  const names = new Set(skills.map((s) => s.name));

  test(`${agent}: every ADR-0073 user-invocable skill exists`, () => {
    for (const name of USER_INVOCABLE_SKILLS) {
      assert.ok(names.has(name), `ADR-0073 names ${name}, but no such ${agent} skill exists`);
    }
  });

  let modelListingChars = 0;
  for (const { name, dir } of skills) {
    const fm = parseFrontmatter(join(dir, 'SKILL.md'));
    const userOnly = USER_INVOCABLE_SKILLS.has(name);

    test(`skill ${agent}/${name}: invocation class matches ADR-0073`, () => {
      if (agent === 'claude-code') {
        assert.equal(
          fm['disable-model-invocation'],
          userOnly ? true : undefined,
          userOnly
            ? 'user-invocable skill must set disable-model-invocation: true'
            : 'model-invocable skill must not set disable-model-invocation'
        );
      } else {
        const doc = yaml.load(readFileSync(join(dir, 'agents', 'openai.yaml'), 'utf8'));
        assert.equal(
          doc?.policy?.allow_implicit_invocation,
          !userOnly,
          `allow_implicit_invocation must be ${!userOnly} for a ${
            userOnly ? 'user-invocable' : 'model-invocable'
          } skill`
        );
      }
    });

    if (!userOnly) {
      modelListingChars += fm.description.length;
      test(`skill ${agent}/${name}: model-invocable description fits ${MODEL_DESCRIPTION_CAP} chars`, () => {
        assert.ok(
          fm.description.length <= MODEL_DESCRIPTION_CAP,
          `model-invocable description must be ≤${MODEL_DESCRIPTION_CAP} chars (ADR-0073); got ${fm.description.length}`
        );
      });
    }
  }

  test(`${agent}: model-invocable descriptions fit the ${MODEL_LISTING_BUDGET}-char listing budget`, () => {
    assert.ok(
      modelListingChars <= MODEL_LISTING_BUDGET,
      `model-invocable descriptions total ${modelListingChars} chars; budget is ${MODEL_LISTING_BUDGET} (ADR-0073)`
    );
  });
}
