# Report composition contracts

`ad-report` owns the editorial plan, factual ledger, template coverage, and final
end-to-end report verification. It calls every specialist through its public
contract. A source-read, template-write, content, local-write, format, or export
approval does not imply another approval. The stricter gate wins.

## Reasoning and voice

- `ad-ground` retires a bounded method or implementation gap. Preserve its sources,
  grades, deviations, and limitations.
- `ad-research` owns an open question and durable study. Do not convert uncertainty
  into a stronger report conclusion.
- `ad-voice` receives settled facts, evidence limits, and structure for every final
  editorial report before rendering. It owns the confirmed personal profile and
  mandatory naturalization pass, preferring an installed `humanizer` and using its
  bundled equivalent otherwise. It may adjust expression but not alter the
  editorial contract or evidence.
- `ad-template-tune` owns all template mutation and runs only when explicitly
  requested. Ordinary reporting remains read-only.

## Artifact capabilities

Select the available capability matching the requested format: document/DOCX,
PDF, presentation/slides, visualization, site/HTML, Markdown, or another explicit
format. Pass it the final editorial plan, content, target, and accessibility needs.
Do not copy its renderer, mutable state, or format-specific implementation.

The artifact capability must run its normal rendering and verification workflow.
Require visual inspection for paginated, slide, chart, or site output and its
format-specific accessibility checks. A file existing on disk is not proof that it
rendered correctly. After a content revision that can affect layout, render and
inspect again.

When the requested capability is unavailable, return the best usable editorial
form and name the missing renderer. Do not fabricate the artifact or verification.

## Export boundary

The agreed local target is part of framing. A different path, service, recipient,
published URL, or exported format requires a new receipt showing the final artifact
and exact destination. Execute only after explicit approval.
