# Collaboration channel capabilities

Use this as a conservative baseline, not as a substitute for checking the exact
target. Human UI and API or bot surfaces can expose different features. When a
requested feature is not listed, verify it against current official documentation
or the actual destination before using it.

## Slack

- Human messages support Slack's formatting controls. App messages use `mrkdwn`,
  which is Markdown-inspired but has different rules.
- App surfaces may use Block Kit. Image blocks require a public `image_url` or a
  Slack file and require plain-text `alt_text`.
- Do not assume GitHub-only HTML, tables, collapsed `<details>`, or Mermaid source
  will render. For a useful diagram, upload or attach a real supported image.
- Keep a thread reply concise and legible as plain text before adding blocks.

Official references:

- https://docs.slack.dev/messaging/formatting-message-text/
- https://docs.slack.dev/reference/block-kit/blocks/image-block/

## Discord

- Human chat supports Discord's documented Markdown subset, including emphasis,
  headings, lists, links, code blocks, block quotes, and spoilers.
- The API message `content` field is limited to 2000 characters. API messages may
  also carry attachments and embeds; those are a different posting surface from a
  pasted human message.
- Do not assume collapsed `<details>` or Mermaid source will render. Attach an
  actual image when a diagram materially helps.

Official references:

- https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline
- https://docs.discord.com/developers/resources/message

## GitHub issues and pull requests

- Issue and pull-request descriptions and comments support GitHub Flavored
  Markdown, tables, code blocks, links, references, task lists, and images.
- `<details>` and `<summary>` provide collapsed supporting depth.
- Mermaid diagrams render in issues, discussions, pull requests, wikis, and
  Markdown files. Add accessible prose because not every diagram is fully
  accessible and render behavior can vary by Mermaid version.
- Files and images can be attached to issue and pull-request conversations.

Official references:

- https://docs.github.com/en/get-started/writing-on-github
- https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections
- https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams
- https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files

## Selection gate

1. Identify service, human UI versus API or bot surface, and any hard limit.
2. Start with the smallest plain-text answer that works everywhere.
3. Add structure or media only when it materially improves comprehension.
4. Use only a capability documented for that exact surface.
5. Provide alternative text for images and a prose equivalent for diagrams.
6. If support is uncertain, fall back to plain text or verify before return.
