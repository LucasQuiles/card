# Brand Foundation — Design Spec

*Quiles Solutions (dba Quiles Studio) — 2026-06-10*

> **Status:** Design, pending Lucas review.
> **Purpose:** Single source of truth that every downstream surface (quiles.studio, LinkedIn, GitHub, X, newsletter, the content pipeline) reads from. This is a **consolidation** of assets that already exist (`positioning-the-operational-ai-layer.md`, the live card copy in `src/`), not a reinvention. Where this doc and an existing asset conflict, this doc wins going forward.

---

## 0. Why this exists

The brand is ~70% built but scattered. The positioning doc holds the thesis and market analysis. The card (`src/index.html`, `src/portfolio.html`) already speaks the right language ("Forward-Deployed Agents," "one brain across your entire operation," "We embed with your team"). But there is no single artifact that defines **who we are, how we sound, what we name things, and what we look like** — so each new surface risks drifting. This spec is that artifact.

It is the prerequisite for every other sub-project in the roadmap:

1. **Brand Foundation** ← this spec
2. quiles.studio rebuild + GitHub polish (parallel)
3. LinkedIn presence
4. Content pipeline (draft → approve → post)

Nothing downstream gets written until this is approved.

---

## 1. Naming policy (decided)

### 1.1 Legal vs. brand

| Context | Name |
|---|---|
| Legal entity, contracts, invoices, MSAs, legal footers | **Quiles Solutions LLC dba Quiles Studio** |
| Public brand — site, LinkedIn, GitHub org, X, newsletter, decks | **Quiles Studio** |
| Domain | quiles.studio |
| Founder byline | **Lucas Quiles · Founder, Quiles Studio** |

Rule: public surfaces say "Quiles Studio." The legal name appears only where a legal name is required (contract parties, invoice header, website legal footer, privacy/terms).

### 1.2 Dual-track product naming

We already do this in the portfolio; this codifies it as enforceable policy so it stops drifting.

- **Public/outcome names** — what clients and prospects see. Describe the *result*, not the tool.
- **Internal/builder names** — what we call it in the repo, the team, the build logs.

| Internal (builder) | Public (outcome) |
|---|---|
| WhatSoup | Messaging Operations Platform / WhatsApp-native agent layer |
| Agent365 | Microsoft 365 Agent Bridge |
| sdlc-os | Multi-Agent Development Pipeline |
| tmup | Parallel Agent Coordinator |
| qLine | Session Observability Layer |
| Brick | (internal only — enrichment layer) |
| trinkets | Social Commerce Platform |

Policy:
- Never put an internal builder-name on a client-facing surface without its outcome translation.
- Internal names are fine — even good — in engineering content (GitHub, deep-dive posts) where the audience is technical and authenticity signals competence. The rule is *audience-matched*, not *suppress-always*.
- New work gets both names assigned at creation. The outcome name leads on marketing surfaces; the builder name leads in the repo.

---

## 2. Positioning spine (canonical)

Distilled from `positioning-the-operational-ai-layer.md`. That doc remains the long-form market analysis and source-of-record for claims; this section is the short, canonical version everything else quotes.

- **Category:** AI-native operating layer for complex businesses.
- **Enemy:** SaaS sprawl. Disconnected systems. The spreadsheet in the middle. "We have software everywhere, but the business still runs through people chasing updates."
- **One-liner:** *We replace SaaS sprawl with an operating layer built around how your business actually works.*
- **The triad (how we deliver):** **Forward-deployed · Embedded agents · One brain.** We embed with your team, build agents into the operation, and unify your tools into one operating brain.
- **What we are not:** not a SaaS product, not a staff-aug body shop, not "AI transformation" theater. We don't sell seats; we install operational capability.
- **Proof posture:** every claim ties to real deployed work (see §4). We show the build, not a deck.

### 2.1 Calibrated claims (say / don't-say)

Carried forward verbatim from the positioning doc §V — this is a hard guardrail for the content pipeline.

**Say:** SaaS is being demoted to infrastructure · the premium is shifting to the orchestration layer · AI-enabled operations compress decision cycles · companies drown in tools but still coordinate manually · custom operational software is now a quarters-not-years effort.

**Don't say:** "SaaS is dead" · "every company needs this" · "AI replaces all software" · "we are like Palantir" · "off-the-shelf tools are bad."

---

## 3. Voice guide

This is the missing piece that makes the content pipeline safe to automate. Without it, drafts drift into generic AI-hype voice.

### 3.1 Who's speaking

Lucas Quiles — lifelong tinkerer, self-taught engineer, now building enterprise agentic systems. The voice is **builder-honest**: someone who has actually shipped the thing, talks plainly about it, and has no patience for hype. Senior, calm, specific. Never breathless.

### 3.2 Principles

1. **Evidence over adjectives.** Show the deployment, the number, the before/after. Delete "powerful," "revolutionary," "cutting-edge," "seamless," "game-changing."
2. **Plain over clever.** Short sentences. Concrete nouns. If a sentence needs a second read, cut it.
3. **Specific over sweeping.** "Reduced a contractor's labor-analysis cycle from days to minutes" beats "drives operational efficiency."
4. **Honest about limits.** Name the tradeoff. Credibility comes from what we *won't* claim.
5. **Lead with the work, not the self.** The build is the hero. Lucas is the builder, not the brand mascot.
6. **No filler openings.** No "In today's fast-paced world," no "Let's dive in," no rhetorical questions as hooks.

### 3.3 Before / after

| Generic (reject) | Quiles Studio (ship) |
|---|---|
| "Leveraging cutting-edge AI to revolutionize your enterprise workflows." | "Your business already runs on a system hiding in spreadsheets and group chats. We turn it into software." |
| "Our powerful platform seamlessly integrates all your tools." | "We connect the tools you already pay for so the data shows up where decisions get made." |
| "Unlock unprecedented efficiency with agentic AI." | "An AI agent that knows your quoting rules can draft the quote. A human approves it. That's the whole pitch." |
| "We're passionate about helping businesses transform." | "We embed with your team for the duration. No handoff, no template, no 18-month rollout." |

### 3.4 Mechanics

- Sentence case in headers (not Title Case), except the brand name.
- Em-dashes for asides, sparingly. No exclamation points in marketing copy.
- First person singular ("I build…") for Lucas's own posts; first person plural ("We embed…") for company surfaces.
- Numbers as numerals (40%, 2,191 apps), not spelled out.

---

## 4. Proof library

The raw material every post, case study, and site section draws from. Each entry is a sanitized, reusable outcome statement grounded in real work. **No client names without permission**; lead with the problem and the result. These are drafts to be fact-checked against the actual deployments before any public use.

> **Open item for Lucas:** confirm which of these can be cited publicly, and whether any client names/logos are usable. Until confirmed, all entries stay anonymized ("a commercial contractor," "an energy-services firm").

- **Labor-cost analysis for a contractor.** Replaced a manual, multi-day labor-analysis process with an automated pipeline producing a ~$1.585M labor-cost breakdown. *(Verify figure + permission.)*
- **CRM opportunity surfacing.** Built an opportunity-detection layer that surfaced 800+ actionable opportunities from fragmented operational data. *(Verify count.)*
- **Field-operations AI coach.** Deployed an AI assistant ("CRIT coach") that operates inside a live operational workflow, not beside it. *(Sanitize / confirm scope.)*
- **Microsoft 365 agent bridge.** Connected an agent layer across the M365 stack (mail, calendar, Teams, SharePoint, Planner) so one agent acts across the whole suite.
- **WhatsApp-native agent platform.** Built a multi-instance messaging operations platform running production agents over WhatsApp.
- **Multi-agent development pipeline.** Orchestration system coordinating many agents through an adversarial review lifecycle (sdlc-os).

Each entry, when used publicly, follows the format: **Problem → what was in the gap → what we built → measurable result → reusable component it produced.**

---

## 5. Visual identity direction

Locks what the card already established into a one-page system so site/LinkedIn/X/decks stay coherent. This is *direction*, not a full design system — the card-design-system spec (`2026-05-29-card-design-system-design.md`) holds the detailed tokens; this section states the brand-level intent the site rebuild will inherit.

- **Logo:** the Q mark — `dist/assets/q-logo-dark-transparent-*.png`. Dark/transparent primary; needs a light-background variant produced during the site rebuild.
- **Founder photo:** `q-contact-photo-*.jpg` for the about/contact and LinkedIn.
- **Motion:** the "Enable Motion" treatment is a signature — restrained, intentional, not decorative. Carries the "this person builds real things" signal. Keep it; don't multiply it.
- **Tone of the visual:** engineering-serious, dark, high-contrast, minimal. Closer to a developer-tools brand than a marketing-agency brand. The aesthetic *is* a positioning statement (we build systems, we don't sell fluff).
- **Type + color:** inherit from the card design-system spec; this spec only asserts they must be identical across every public surface. One palette, one type scale, everywhere.
- **Deferred:** full logo lockup variants, social avatar/banner set, and OG-image template are produced in the site-rebuild sub-project, governed by this direction.

---

## 6. What this spec deliberately excludes (YAGNI)

- No full design-system rebuild — that lives in the card spec and the site sub-project.
- No content calendar or posting cadence — that's the content-pipeline sub-project.
- No LinkedIn profile copy — that's the LinkedIn sub-project (it will *quote* this spec).
- No new market research — the positioning doc is sufficient and current.

---

## 7. Open items for Lucas

1. **Proof library permissions (§4)** — which deployments/figures/names can go public, and which stay anonymized?
2. **Visual light-mode** — is a light-background logo variant wanted, or do we stay dark-only across all surfaces?
3. Anything in the voice guide (§3) that doesn't sound like you — flag it now, before it propagates into every post.
