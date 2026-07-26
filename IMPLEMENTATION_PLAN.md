# Helix Collective Website Rebuild — Implementation Plan

**Document:** `IMPLEMENTATION_PLAN.md`  
**Status:** Ready for implementation, subject to the publishing decisions and evidence gates in this document  
**Last updated:** 26 July 2026  
**Target site:** `https://www.helixcollective.com/`  
**Recommended production platform:** Cloudflare Pages, connected directly to GitHub  
**Recommended application stack:** Astro + React + TypeScript, statically generated

---

## 1. Purpose

Rebuild the Helix Collective website as a locally runnable, Git-managed static website that preserves the existing brand’s visual energy and tone while repositioning Helix around a single, sharper promise:

> **We work with businesses to create meaningful growth in enterprise value.**

The new site should trade on Helix’s institutional track record rather than the personalities behind it. It should make both the commercial philosophy and the four-stage operating model clear, prove the proposition through selected case studies, qualify prospective partners through an interactive decision flow, and send suitable visitors to one Calendly booking action.

This is an implementation plan, not merely a creative brief. It defines:

- the research that must happen before copy or claims are published;
- where that research must live in the repository;
- the target information architecture and initial copy direction;
- the chosen front-end and deployment architecture;
- the required content models and approval controls;
- the implementation sequence;
- testing, accessibility, performance, SEO, legal, and deployment requirements;
- launch and rollback procedures.

---

## 2. Source-of-truth hierarchy

When sources conflict, use this order:

1. **Written owner decisions recorded in `docs/decisions/`.**
2. **Approved claims and copy in the repository.**
3. **This implementation plan.**
4. **The current live Helix website as a visual and tonal reference.**
5. **Public research, clearly labelled by confidence and source.**
6. **Developer or copywriter assumptions.**

No important decision should remain only in Slack, email, a call transcript, or a developer’s memory. Record it in the repository before dependent work proceeds.

---

## 3. Product objective

The website should make a qualified prospect understand six things quickly:

1. Helix is in the business of increasing enterprise value, not selling development capacity.
2. Helix has helped create more than `$500m` in value over more than ten years.
3. Helix works across product, technology, commercial execution, and capital formation when those levers are necessary to create value.
4. Before asking a business to engage, Helix invests its own time and cost to understand the company and independently build a case for how meaningful value could be created.
5. If the case is strong, Helix aligns the economics, joins the operating team, delivers against the agreed value-creation objectives, and leaves behind a result the business can sustain.
6. Helix is selective, and there is a recognisable profile of business or founder for whom the model works.

The primary conversion event is:

> A qualified visitor clicks the single site-wide CTA and opens the approved Helix Calendly booking page.

---

## 4. Non-goals

Do not turn this project into any of the following unless a later decision explicitly expands scope:

- a general software consultancy website;
- a team or founder biography site;
- a venture directory containing every historical engagement;
- a blog, news site, or editorial CMS;
- an investor portal;
- a lead-capture form with a custom backend;
- a logged-in application;
- a Webflow rebuild;
- a full rebrand;
- an opportunity to invent unsupported valuation claims;
- an opportunity to publish confidential fundraising or client information;
- a contractual promise that every engagement uses identical pricing, gain-share, governance, or exit mechanics;
- language that guarantees enterprise-value growth or implies Helix can control outcomes outside its remit;
- an animation showcase that compromises accessibility or performance.

The first release should be a focused, high-quality marketing site with one homepage, essential system pages, and one conversion action.

---

## 5. Fixed requirements

These requirements should be treated as accepted unless superseded by an explicit owner decision.

| Area | Required change | Implementation rule |
|---|---|---|
| Core proposition | Lead with meaningful growth in enterprise value | The first major headline must contain “enterprise value” and make Helix’s role explicit |
| Proof banner | Show `$500m+` and `10+ years in operation` | Remove the venture count and human count entirely |
| Institutional positioning | Trade on the business’s reputation, not individual people | No team grid, team photography, bios, human count, or “humans of Helix” language |
| Logo marquee | Remove Awayco, Perion, and Synaptico | Remove their visible logos, asset files, alt text, data entries, and stale references |
| Case studies | Feature Neara, Ferovinum, Origami, 13SICK, and Veyor Digital | Remove Xylo as a case study |
| Differentiation | Explain why the Helix model is different | Keep this as a concise manifesto about deep partnership, shared risk/upside, selectivity, and responsibility for the outcome |
| How we work | Retain a separate four-stage operating-model section | Show independent preparation at Helix’s cost; incentive and governance alignment; embedded delivery; and sustainable handover plus gain-share realisation |
| Qualification section | Replace “zero to market domination” with an interactive fit flow | Implement a real accessible decision tree, not an image of a flowchart |
| CTA | One conversion action tied to enterprise-value growth | Every primary CTA must use one label, one URL source, and one analytics event |
| Booking | Send the visitor to Calendly | Use an external link, not an embedded Calendly iframe, unless scope changes |
| Deployment | Push to Git and deploy automatically | Use a private GitHub repository connected to Cloudflare Pages |
| Visual identity | Preserve tone and brand colours | Recreate the brand system in code; do not copy the Webflow implementation blindly |
| Review | Final case-study wording requires owner approval | Production builds must not publish unapproved claims |

---

## 6. Important ambiguities and decisions required before publication

Implementation can begin before all of these are resolved, but production publication cannot.

Create one decision file per item in `docs/decisions/`, using the format `NNNN-short-title.md`.

### D-001 — Currency

The supplied figures use `$` without naming a currency. This is risky because the case studies span Australia, the United Kingdom, and crypto markets.

**Recommended default:** use `A$` wherever a number is an Australian-dollar valuation and use the actual local currency where the underlying source is in another currency. Do not aggregate mixed currencies into the `$500m+` headline without a documented conversion methodology.

The decision must specify:

- whether the headline is `A$500m+`, `US$500m+`, or deliberately currency-neutral;
- the date and source of any conversion rate;
- whether the calculation uses value at the time of engagement, current value, or value realised during the engagement.

### D-002 — “Enterprise value” versus “company valuation”

For a private venture, a disclosed post-money valuation is normally an equity valuation, not necessarily enterprise value in the finance-definition sense.

The decision must specify one of these approaches:

1. Helix uses “enterprise value” in its technical finance meaning and can substantiate it.
2. Helix uses “enterprise value created” as a defined internal marketing measure and publishes the methodology.
3. The public wording changes to “company value,” “business value,” or “valuation growth.”

**Recommended default:** retain the owner’s strategic phrase in the hero, but require finance/legal review of every quantified case-study statement.

### D-003 — Attribution

“Helix created `$X` of enterprise value” can imply sole causation. In most cases the defensible claim will be closer to:

> “Approximately `$X` in value was created during Helix’s engagement, with Helix contributing through…”

The decision must define the approved attribution language. Avoid claiming that Helix alone caused the entire valuation movement unless the evidence supports that statement.

### D-004 — EBITA or EBITDA

The qualification brief says `500k–3m EBITA / 1m–10m revenue`.

Confirm:

- whether **EBITA** is intentional or should be **EBITDA**;
- whether a prospect qualifies by satisfying either range or both;
- whether figures are annual, trailing twelve months, or run-rate;
- which currency applies;
- whether range endpoints are inclusive.

**Recommended implementation assumption until confirmed:** either `A$500k–A$3m EBITA` **or** `A$1m–A$10m annual revenue`.

### D-005 — Missing “No” branch for the capacity question

The supplied flow does not define what happens when an existing business is in range but cannot double sales through additional delivery capacity.

**Recommended route:** show a polite “not the right growth lever today” outcome, plus the Redfern address. Do not route that visitor into the “great idea” path automatically.

### D-006 — Calendly

Provide:

- the exact production Calendly URL;
- the event type;
- whether the link opens in the same tab or a new tab;
- desired UTM parameters;
- whether all three positive fit outcomes use the same event;
- a fallback contact method if Calendly is unavailable.

**Recommended default:** same tab, one event, outbound-link tracking, and a visible email fallback in the footer.

### D-007 — Locations

The current website lists Sydney, Melbourne, and Brisbane. The new qualification flow specifically refers to Vine Street, Redfern.

Confirm whether the footer should:

- retain all three locations;
- show only Redfern;
- distinguish offices from partner locations;
- use `14 Vine Street` or the current fuller form `Level 1, 2–14 Vine St`.

**Recommended default:** retain the legally/currently accurate locations in the footer and use `Level 1, 2–14 Vine Street, Redfern NSW 2016` in the no-fit outcome.

### D-008 — Xylo logo

The brief says to remove Xylo from the case studies, but does not explicitly say to remove Xylo from the logo marquee.

**Recommended default:** remove Xylo only as a case study and retain its logo until the owner says otherwise.

### D-009 — Performance-linked economics and gain-share

Confirm which parts of the commercial model are universal and which vary by engagement.

The decision must specify:

- what “we get paid as we deliver” means in practice: milestones, a retainer, delivery fees, accepted outputs, achieved operating metrics, or another mechanism;
- what forms the back-end upside may take: equity, options, a value-linked fee, profit share, revenue share, transaction payment, or another agreed instrument;
- how the value thesis and gain-share baseline are measured;
- vesting, dilution, liquidity, buyback, expiry, tax, and change-of-control treatment where relevant;
- whether “we get paid when you get paid” is literally accurate or only a shorthand for aligned upside;
- what level of executive and board approval is required;
- whether the website can describe the model broadly without creating a misleading universal promise.

**Recommended public wording, where accurate:**

> We are paid as we deliver, with additional upside tied to the value thesis playing out.

Avoid naming a specific legal or financial instrument on the public website unless it is genuinely standard across engagements and has been reviewed.

### D-010 — Font rights

The live site’s actual font family and licensing must be audited. Do not download or self-host a commercial font without a valid licence.

**Recommended fallback:** select a high-quality, approved, metrically similar typeface only if the original font cannot legally be used.

### D-011 — Analytics

Confirm whether the launch needs:

- Cloudflare Web Analytics;
- an existing Google Analytics or Tag Manager property;
- no analytics at all.

Only collect the minimum data needed. Do not send qualification answers as personally identifiable data.

### D-012 — Pre-engagement underwriting, embedded delivery, and exit

Confirm the factual and legal boundaries of the four-stage “How we work” model.

The decision must specify:

- whether Helix always performs the initial preparation at its own cost and without billing the prospective client;
- where unpaid qualification ends and a paid diagnostic or engagement begins;
- what “independently build our own case” means, including the information and access Helix requires;
- whether Helix shares the full pre-engagement thesis when it decides not to proceed;
- how confidentiality and intellectual property are handled during the preparation period;
- what “become part of the team” means operationally without implying that Helix personnel become employees, directors, agents, or fiduciaries unless that is actually agreed;
- what constitutes a sustainable result and a complete handover;
- whether “exit” means Helix exiting the engagement, the founders realising company value, a financing or liquidity event, or some combination;
- how Helix can realise its gain-share without implying that a company sale must occur;
- which parts of this model may be stated as a consistent principle and which need qualified wording.

**Recommended public interpretation:** Helix exits the engagement cleanly once the business can sustain the result, while any agreed back-end participation is realised through the contractually agreed mechanism. Do not imply that Helix will force or require a sale of the company.

---

## 7. Recommended information architecture

### Routes

| Route | Purpose |
|---|---|
| `/` | Main marketing page |
| `/404.html` | Branded not-found page |
| `/contact-us` | Permanent redirect to `/` to preserve existing inbound links |
| `/privacy` | Only if required by analytics, legal advice, or the chosen Calendly treatment |

Do not create separate case-study routes in the first release unless the approved copy becomes too long for concise homepage cards. The initial site should remain one coherent story.

### Homepage section order

1. Minimal header
2. Enterprise-value hero
3. Proof banner
4. Client/partner logo marquee
5. Enterprise-value case studies
6. “We’re different because…” manifesto
7. Separate “How we work” four-stage operating model
8. Interactive fit qualifier
9. Single final CTA
10. Institutional footer

---

## 8. Initial homepage copy architecture

All copy below is a working implementation baseline. Anything marked `[VERIFY]`, `[DECIDE]`, or `[APPROVE]` must not be treated as final.

### 8.1 Header

Keep the header restrained:

- Helix Collective logo;
- no team link;
- no “invest in our ventures” action;
- one optional anchor nav for `Work`, `How we work`, and `Fit`;
- one primary CTA using the globally approved CTA label.

On narrow screens, avoid a complex menu. A compact anchor menu is sufficient.

### 8.2 Hero

**Eyebrow**

> HELIX COLLECTIVE

**Primary headline**

> WE WORK WITH BUSINESSES TO CREATE MEANINGFUL GROWTH IN ENTERPRISE VALUE.

Do not soften this into generic language such as “unlocking digital potential.”

**Supporting copy — working draft**

> We partner deeply across product, technology and commercial execution—then structure our success around yours.

Alternative if stronger performance-linked wording is approved:

> We go deep, build what moves the business, and get paid when you get paid.

**Primary CTA**

> LET’S CREATE ENTERPRISE VALUE

Use this exact label for all primary CTA instances unless the copy review chooses a different single label.

**Optional supporting line**

> Selective partnerships. Aligned economics. A credible path to victory.

### 8.3 Proof banner

Use a two-column proof strip rather than trying to fill the removed metrics with new vanity numbers.

**Metric one**

> `$500M+`  
> ENTERPRISE VALUE CREATED

**Metric two**

> `10+`  
> YEARS IN OPERATION

Rules:

- Confirm currency before publication.
- Do not display `50+ ventures`.
- Do not display any human or team count.
- Do not add an unverified replacement metric merely to preserve the old four-column layout.
- On mobile, stack the two metrics with equal visual weight.

### 8.4 Logo marquee

The existing site presents a broad strip of client and venture logos. Preserve the sense of institutional proof while making the implementation accessible.

Remove:

- Awayco
- Perion
- Synaptico

Current logo assets observed on the live page include the following and should be reconciled against the final asset register:

- Canva
- Google
- 13SICK
- BCG
- CommBank
- Australia Post
- eftpos
- Sydney Airport
- Macquarie
- Neara
- Filecoin
- Veyor
- Ferovinum
- Agonics
- Spec
- Jubi
- Xylo
- Origami

Rules:

- Do not assume the presence of an old file means Helix still has permission to publish it.
- Record permission/status in `docs/research/asset-register.csv`.
- Use local optimised assets, never hotlink the Webflow CDN.
- The duplicate set used for an infinite marquee must be `aria-hidden`.
- When `prefers-reduced-motion: reduce` is enabled, render a static wrapped grid.
- On small screens, a horizontally scrollable list is acceptable if it remains keyboard accessible.
- Do not use a logo as evidence for a quantified value claim.

### 8.5 Case-study section

**Section eyebrow**

> VALUE, BUILT

**Section headline — working draft**

> VALUE DOESN’T APPEAR. IT GETS BUILT.

**Intro — working draft**

> Selected engagements where product, technology, commercial execution and capital came together to create a material step-change in business value.

Each case study must answer four questions:

1. Where was the company when Helix became involved?
2. What changed during the engagement?
3. What did Helix actually do?
4. What evidence supports the value claim?

Do not publish a case study that answers only “the company later became valuable.”

#### Case-study visual pattern

Each card or panel should contain:

- company name and logo;
- a short outcome headline;
- stage tag, such as `0 → 1 → 10`;
- the value movement or multiple;
- a concise “How we moved it” paragraph;
- optional product image or abstracted product visual;
- a small methodology/claim note where necessary.

Large numbers should be prominent, but the causal mechanism should receive equal attention.

#### Recommended order

1. Neara
2. Ferovinum
3. 13SICK
4. Origami
5. Veyor Digital

The order can change after copy review, but Neara and Ferovinum should lead because they best establish the scale of the proposition.

---

## 9. Case-study research and draft direction

### 9.1 Neara

**Owner-supplied direction**

- From idea to `$1b+` valuation.
- Helix was involved through `0 → 1 → 10`.
- Approximately `20×` increase during the relevant period.
- Approximately `$200m` in value created during Helix’s engagement.
- Helix shaped the technology and initial business development to seed momentum.

**Public research snapshot**

Public reporting in February 2026 supports an `A$1.1b` valuation following an `A$90m` Series D. That supports the current-outcome statement, but it does not by itself substantiate Helix’s entry value, exit value, attribution, or the `$200m` calculation.

**Working headline**

> FROM IDEA TO A$1B+

**Working body**

> Helix helped shape the core technology and early business development that moved Neara from concept through its formative `0 → 1 → 10` stage. During our engagement, the business achieved approximately `[VERIFY: 20×]` valuation growth and `[VERIFY: A$200m]` in value creation.

**Research required before publication**

- Exact engagement start and end dates.
- Entry and end-of-engagement valuation evidence.
- Whether `20×` refers to equity valuation, enterprise value, or another measure.
- Evidence for Helix’s role in initial business development.
- Client approval for the description.
- Permission to use the logo and product imagery.
- Whether the current `A$1.1b` outcome may be connected to the earlier Helix engagement without implying continuous involvement.

### 9.2 Ferovinum

**Owner-supplied direction**

- From idea to approximately `$500m` valuation.
- Helix was involved through `0 → 1 → 10`.
- Approximately `10×` increase.
- Approximately `$300m` in value created during the engagement.
- Helix helped shape the technology and anchor early fundraising rounds.

**Critical evidence warning**

Public materials currently support a large asset-backed securitisation or funding programme in the `$500m–$550m` range. That is not automatically the same thing as Ferovinum’s company valuation or enterprise value.

Do not publish “valued at `$500m`” until internal evidence distinguishes:

- company equity valuation;
- enterprise value;
- debt or funding capacity;
- assets financed through the platform;
- total capital deployed;
- a securitisation programme.

**Working headline, pending evidence**

> FROM IDEA TO A GLOBAL CAPITAL PLATFORM

**Working body**

> Helix helped shape the technology and anchor early fundraising, supporting Ferovinum through the formative `0 → 1 → 10` stage. `[VERIFY: approximately 10× value growth and approximately $300m created during the engagement.]`

Use a quantified headline only after the evidence gate passes.

### 9.3 13SICK

**Owner-supplied direction**

- Systems thinking and product rollout.
- Value movement from approximately `$30m` to `$150m`.
- Approximately `5×`.
- Approximately `$100m` in value created.

Note that `$30m` to `$150m` is a `$120m` increase. The brief’s `$100m` figure may be an intentionally conservative claim. Record the chosen methodology rather than silently correcting it.

**Working headline**

> A$30M → A$150M

**Working body**

> Helix applied systems thinking to the operating model and product rollout, helping turn delivery complexity into a repeatable growth engine. `[VERIFY: five-fold value growth and more than A$100m created during the engagement.]`

**Research required**

- What entity was valued.
- Dates and source of both values.
- Whether either figure comes from a transaction.
- Specific systems/product changes led by Helix.
- Whether medical advertising, confidentiality, or client-approval constraints apply.
- Permission for logo and screenshots.
- Approved use of the `13SICK` brand styling.

### 9.4 Origami

**Owner-supplied direction**

- Approximately `$50m` in enterprise value created.
- Approximately `10×` from when Helix became involved.

**Current content context**

The existing site describes Origami as an automated leverage protocol. Public metrics such as funding raised or total value locked are not equivalent to company valuation.

**Working headline**

> APPROX. 10× VALUE GROWTH

**Working body placeholder**

> Helix helped Origami move from `[VERIFY: starting state]` to `[VERIFY: outcome]` by `[RESEARCH: precise product, protocol, engineering, go-to-market or capital contribution]`, creating approximately `[VERIFY: $50m]` in value during the engagement.

Do not invent the “how” portion. This case study is blocked on internal subject-matter research.

### 9.5 Veyor Digital

Use the brand spelling **Veyor**, not “Veyordigital,” in public-facing copy unless the company requests otherwise.

**Owner-supplied direction**

- `0 → 1`.
- Currently a `$50m+` business.
- Approximately `10×`.
- Approximately `$50m` in enterprise value created.

**Public research snapshot**

March 2026 reporting supports an `A$50m–A$75m` valuation range associated with Veyor’s Series A. That supports the broad current valuation, but not the entry value, multiple, value attributable to Helix, or exact Helix contribution.

**Working headline**

> 0 → 1 TO A$50M+

**Working body placeholder**

> Helix helped turn Veyor from `[VERIFY: initial concept/state]` into a scalable delivery-management platform by `[RESEARCH: exact product, technology, operating and commercial contribution]`. `[VERIFY: approximately 10× growth and approximately A$50m in value created.]`

**Research required**

- Engagement dates.
- Initial value or fundraising reference point.
- Exact Helix contribution.
- Whether the public `A$50m–A$75m` range may be cited.
- Client approval and asset permission.

### 9.6 Xylo

- Remove the full Xylo case-study panel.
- Delete or archive its case-study copy and imagery from the production content collection.
- Do not accidentally remove the Xylo logo from the marquee unless D-008 decides to do so.
- Ensure Xylo does not remain in hidden SEO copy, JSON-LD, old screenshots, or social-preview artwork as a featured case study.

---

## 10. “We’re different because…” section

Retain this as a concise manifesto explaining **why** the model is different. It must not be collapsed into, or used as a substitute for, the separate step-by-step “How we work” section.

**Eyebrow**

> WE’RE DIFFERENT BECAUSE…

**Primary headline — working draft**

> WE PARTNER DEEPLY. OUR UPSIDE IS TIED TO YOURS.

**Intro — working draft**

> Helix is not a hired pair of hands at the edge of the business. We take on a small number of situations where there is a credible path to materially higher enterprise value—and structure the relationship so we win when the business wins.

Use three concise proof points:

### 10.1 We take a position, not a brief

> We form our own view of the opportunity, the constraint, and what must become true for material value to be created. We do not simply accept a scope and start billing.

### 10.2 We share the risk and the upside

> We are paid as we deliver, with additional upside tied to the value thesis playing out. The exact structure varies, but the incentives should point in the same direction.

### 10.3 We operate from inside the team

> We work alongside founders, executives, boards, and delivery teams against shared objectives—not as an adviser who hands over a deck and disappears.

This section should remain short, high-level, and emotionally persuasive. It explains the difference in philosophy. The next section explains the actual operating sequence.

Do not repeat the old service laundry list as the central argument. Capabilities may be mentioned only as mechanisms for value creation.

---

## 11. “How we work” section

This is a separate operating-model section and must remain on the homepage. It answers **how the relationship progresses**, from Helix’s initial independent preparation through delivery, handover, and realisation of the agreed gain-share.

**Eyebrow**

> HOW WE WORK

**Primary headline — working draft**

> OTHERS PROMISE. WE PUT OUR MONEY WHERE OUR MOUTH IS.

**Intro — working draft**

> Before we ask a business to back us, we back our own case. We invest our time, form an independent thesis, align the economics, and then work from inside the team to make the thesis real.

Present the model as a four-stage ordered sequence.

### 11.1 Stage one — Build the case

**Public heading**

> WE BUILD THE CASE—ON OUR OWN DIME.

**Working copy**

> We spend time getting to know the business, its founders, and its executive team. We build our own independent case for where enterprise value can be created—at our own cost and on our own time. We only move forward when we believe we can deliver on the promise.

**Meaning that must survive copy editing**

- Helix invests before asking the prospective client to commit.
- Helix forms an independent thesis rather than merely restating management’s view.
- The purpose is to determine whether there is a credible path to victory.
- If Helix cannot build a convincing case, there is no engagement.
- Do not imply that every prospective client receives a free consulting report or ownership of Helix’s pre-engagement work.

### 11.2 Stage two — Align the incentives

**Public heading**

> WE DESIGN THE DEAL SO EVERYONE WINS TOGETHER.

**Working copy**

> We agree the objectives, evidence, decision rights, and pricing model before delivery begins. Broadly, we are paid as we deliver and earn back-end upside as the thesis plays out. That requires meaningful alignment with founders and executives—and, where relevant, the board.

**Meaning that must survive copy editing**

- Helix receives current compensation for actual delivery.
- A meaningful part of Helix’s upside is contingent on the value thesis playing out.
- Objectives, baseline, measurement, governance, and realisation mechanics are agreed up front.
- The exact financial instrument or fee model may vary.
- Executive and board alignment is an operating requirement, not decorative endorsement.
- Public copy must not imply guaranteed returns, a universal equity structure, or an offer of a financial product.

### 11.3 Stage three — Join the team and deliver

**Public heading**

> WE JOIN THE TEAM AND CHASE THE OUTCOME.

**Working copy**

> We become part of the operating team and deliver with single-minded focus against the agreed objectives. Product, technology, commercial execution, capital, and operating systems are tools; the objective is the increase in enterprise value they are meant to produce.

**Meaning that must survive copy editing**

- Helix is embedded enough to influence and execute, not merely advise.
- The engagement is organised around a small number of agreed value-creation objectives.
- Workstreams should trace back to those objectives.
- “Part of the team” must not create an unintended claim that Helix personnel are employees, officers, directors, agents, or fiduciaries.
- Do not reduce this stage to a list of services.

### 11.4 Stage four — Make it sustainable and realise the upside

**Public heading**

> WE MAKE THE VALUE LAST—THEN REALISE THE UPSIDE.

**Working copy**

> We build capability, systems, and ownership that the business can sustain without Helix. We then work with the founders and leadership on a clean exit from the engagement and the agreed path for realising our back-end gain-share as the value thesis plays out.

**Meaning that must survive copy editing**

- Helix should not leave the client dependent on Helix for ordinary operations.
- Ownership, documentation, capability, and operating cadence must transfer into the business.
- “Exit” primarily means a deliberate handover and Helix leaving the active engagement.
- Gain-share realisation may occur through the agreed contractual mechanism and must not be written as though a company sale is always required.
- The site should show that Helix cares about durable enterprise value, not a short-lived metric spike.

### 11.5 Closing line

Use a short closing statement below the four stages:

> THE EXACT MECHANICS CHANGE. THE PRINCIPLE DOESN’T: WE PUT REAL TIME, UPSIDE, AND REPUTATION BEHIND THE CASE.

Alternative, if the owner wants the simplest version:

> OTHERS PROMISE. WE PUT OUR MONEY WHERE OUR MOUTH IS.

Do not repeat both at equal visual weight.

### 11.6 Visual and interaction treatment

Preserve the existing site’s sense of progression, but implement this as an accessible semantic process rather than a decorative graphic.

Requirements:

- use a real ordered list, with visible stage numbers `01` through `04`;
- use static Astro-rendered HTML and CSS; React is not required;
- on desktop, use a horizontal or alternating connected path with generous space;
- on mobile, use a vertical sequence in ordinary reading order;
- keep connector lines decorative and hidden from assistive technology;
- retain all meaning when animation and JavaScript are disabled;
- use restrained scroll-reveal or active-stage motion only if it adds clarity;
- honour `prefers-reduced-motion`;
- do not require hover to reveal the copy;
- do not compress the four stages into generic cards that lose the sense of progression.

### 11.7 Accuracy and legal guardrails

Before publication, the copywriter and legal reviewer must confirm that the section:

- describes the common Helix operating model rather than an exceptional historic deal;
- distinguishes unpaid pre-engagement preparation from paid discovery;
- does not promise to disclose Helix’s independent thesis when no engagement proceeds;
- does not create an employment, partnership, agency, directorship, or fiduciary representation;
- does not guarantee enterprise-value growth;
- does not imply that a sale or liquidity event will necessarily occur;
- does not specify a back-end instrument that may differ between engagements;
- is consistent with the actual engagement documents Helix intends to use.

The research and approved wording must be recorded in `docs/research/engagement-model.md` before this section can be marked production-ready.

---

## 12. Interactive fit qualifier

### 12.1 Section framing

**Eyebrow**

> ARE WE A FIT?

**Headline — working draft**

> LET’S FIND OUT BEFORE WE WASTE EACH OTHER’S TIME.

**Intro**

> Follow the path. It takes less than a minute.

The visual language should reinterpret the existing connected-node motif in real HTML, CSS, SVG, and React—not reuse a flattened flowchart image.

### 12.2 Recommended decision graph

Represent the flow as data, not nested component conditionals.

```text
Q1 — Existing business?
“Are you already doing A$1m–A$10m in annual revenue
or A$500k–A$3m in EBITA?”

YES → Q2
NO  → Q3

Q2 — Capacity leverage?
“If delivery capacity increased without costs increasing at the same rate,
could you roughly double sales?”

YES → RESULT_GROWTH_FIT
NO  → RESULT_NOT_CURRENT_FIT

Q3 — Strong idea?
“Got a strong idea, credible potential customers,
but no clear path from idea to product?”

YES → RESULT_IDEA_FIT
NO  → Q4

Q4 — Builder energy?
“Mostly looking to spend time around people who build,
ship and get things done?”

YES → RESULT_COMMUNITY_FIT
NO  → RESULT_NO_FIT
```

The wording above should be revised after D-004, but the state graph should remain explicit.

### 12.3 Outcomes

#### RESULT_GROWTH_FIT

**Headline**

> THERE MAY BE A REAL VALUE LEVER HERE.

**Body**

> You have an existing engine and a credible route to scale without costs rising in lockstep. That is exactly the kind of constraint we like attacking.

**CTA**

> LET’S CREATE ENTERPRISE VALUE

#### RESULT_IDEA_FIT

**Headline**

> THIS MAY BE A 0 → 1 WORTH TESTING.

**Body**

> A strong idea and credible customers are a better starting point than a polished deck. Let’s pressure-test whether there is a venture here.

**CTA**

> LET’S CREATE ENTERPRISE VALUE

#### RESULT_COMMUNITY_FIT

**Headline**

> COME BORROW SOME BUILDER ENERGY.

**Body**

> Sometimes the first useful move is getting around people who ship. Book a conversation and tell us what you are working on.

**CTA**

> LET’S CREATE ENTERPRISE VALUE

#### RESULT_NOT_CURRENT_FIT

**Headline**

> WE MAY NOT BE THE RIGHT GROWTH LEVER—YET.

**Body**

> If more delivery capacity would not create more sales, the enterprise-value constraint may sit somewhere else. You are still welcome to say hello when you are nearby.

**Address**

> Level 1, 2–14 Vine Street, Redfern NSW 2016 `[VERIFY]`

#### RESULT_NO_FIT

**Headline**

> IT’S NOT US. IT’S YOU :)

**Body**

> Come say hi when you are in the neighbourhood anyway.

**Address**

> Level 1, 2–14 Vine Street, Redfern NSW 2016 `[VERIFY]`

### 12.4 Interaction requirements

The component must include:

- `Back` and `Start again` controls;
- a clear progress indicator;
- keyboard-operable yes/no buttons;
- visible focus states;
- semantic `fieldset` and `legend` where appropriate;
- an `aria-live` region for outcome changes;
- no colour-only state communication;
- a static no-JavaScript fallback with the CTA and full qualification summary;
- no local storage unless explicitly approved;
- no collection of personal data;
- reduced-motion behaviour;
- deterministic URLs and labels;
- unit tests for every branch.

### 12.5 Desktop and mobile presentation

**Desktop**

- Show a connected-node map.
- Highlight the active path.
- Keep DOM order logical for screen readers.
- Connection lines may be SVG, but questions and controls must remain real DOM elements.
- Do not make users click tiny nodes.

**Mobile**

- Present one question at a time as a stepper.
- Use large full-width answer controls.
- Keep the active outcome visible without a horizontal canvas.
- Do not shrink a desktop flowchart until it becomes illegible.

---

## 13. Final CTA

Replace the current split between “build something” and “invest in ventures” with one action.

**Headline — working draft**

> SEE A CREDIBLE PATH TO MORE ENTERPRISE VALUE?

**Supporting line**

> Let’s work out whether Helix is the right partner to move it.

**Button**

> LET’S CREATE ENTERPRISE VALUE

The button must read its URL from one central configuration value. Do not hardcode the Calendly URL in multiple components.

---

## 14. Footer

The footer should establish institutional legitimacy without introducing people.

Include:

- Helix Collective logo;
- legally accurate location information;
- legal entity name;
- ABN;
- LinkedIn and any approved social links;
- privacy link if required;
- email fallback if approved;
- copyright year generated at build time or maintained explicitly.

Remove:

- investment CTA;
- team references;
- human count;
- any stale contact form;
- unverified offices;
- old positioning that describes Helix primarily as a venture volume machine.

---

## 15. Tone-of-voice system

The current site’s voice is bold, playful, direct, and slightly conspiratorial. It uses short declarations and irreverent phrases rather than conventional consultancy language.

Preserve that energy, but make the new copy more commercially rigorous.

### 15.1 Voice principles

#### Bold, not inflated

Say:

> WE CREATE MEANINGFUL GROWTH IN ENTERPRISE VALUE.

Do not say:

> We unlock transformative digital synergies for tomorrow’s leaders.

#### Proof before theatre

Large claims should be immediately followed by how the result was achieved.

#### Institutional “we”

“We” means Helix Collective as an enduring business. It should not require the reader to know who any individual is.

#### Selective confidence

The tone should make it clear that Helix is assessing fit as well as selling.

#### Plain English beneath the headline

Headlines can be punchy. Supporting copy should be specific and easy to understand.

#### Australian English

Use:

- `organisation`, not `organization`, unless reproducing a client’s official wording;
- `neighbourhood`;
- `programme` where appropriate;
- en dashes for ranges;
- sentence punctuation consistently.

### 15.2 Words and themes to favour

- enterprise value
- value creation
- path to victory
- deep partnership
- aligned economics
- independent case
- value thesis
- gain-share
- sustainable handover
- operating leverage
- scalable delivery
- `0 → 1 → 10`
- build
- ship
- momentum
- selective
- material outcome
- credible path

### 15.3 Words and themes to avoid

- humans of Helix
- 50+ ventures
- market domination
- digital transformation
- innovation partner, when unsupported by detail
- end-to-end solutions
- world-class
- best-in-class
- resource augmentation
- free consulting, unless the exact promise is intentional
- guaranteed upside
- forced exit
- “our people are our greatest asset”
- founder worship
- generic AI/Web3 trend language
- claims that confuse capital raised with company value

### 15.4 Profanity

The supplied “get shit done” phrasing is consistent with the existing irreverence, but requires an explicit owner decision. Keep profanity out of metadata, social-preview text, and accessibility labels even if approved in body copy.

---

## 16. Visual system

### 16.1 Observed core colours

A current Helix journey asset contains the following dominant brand colours:

```css
:root {
  --color-helix-mint: #5affba;
  --color-helix-ink: #231f20;
  --color-white: #ffffff;
}
```

These are a strong starting point, not a substitute for a proper browser audit. Confirm the computed colours on the live site before locking the design tokens.

### 16.2 Neutral palette

Derive supporting neutrals from the ink and white rather than introducing unrelated brand colours.

Example working tokens:

```css
:root {
  --color-ink-900: #231f20;
  --color-ink-800: #302c2d;
  --color-ink-100: #ece9ea;
  --color-surface: #ffffff;
  --color-surface-soft: #f5f3f4;
  --color-accent: #5affba;
  --color-focus: #00a864; /* verify contrast before use */
}
```

Do not use the sample focus colour without a contrast check.

### 16.3 Typography

The design audit must record:

- exact heading family;
- exact body family;
- font weights used;
- letter spacing;
- line heights;
- whether the font is local, hosted, or licensed through Webflow;
- a legal plan for self-hosting.

Desired character:

- oversized condensed or grotesk-style display headings;
- high-impact uppercase;
- clean, highly legible body copy;
- deliberate contrast between headline and explanation.

### 16.4 Layout

Preserve:

- oversized statements;
- alternating ink, white, and mint fields;
- generous vertical rhythm;
- confident asymmetry;
- rounded case-study visuals;
- connected organic shapes;
- a sense of movement between sections.

Avoid:

- generic SaaS cards on a pale-grey background;
- stock people photography;
- team photography;
- tiny body copy;
- ornamental animation that obscures the message;
- overly polished corporate gradients unrelated to the current brand.

### 16.5 Case-study imagery

Use product, system, environment, or outcome imagery—not portraits.

For each image, record:

- owner;
- source;
- permission;
- crop;
- alt text;
- whether it contains confidential UI or customer information;
- whether it may be used in a public marketing context.

Existing Webflow imagery may be used only after it is downloaded into the repository and its rights are confirmed. Do not hotlink it.

### 16.6 Motion

Permitted motion:

- restrained logo marquee;
- section reveal;
- active qualification path;
- CTA hover/focus response;
- subtle image parallax only if it passes performance and reduced-motion requirements.

Every animation must have a reduced-motion alternative.

---

## 17. Research-first workflow

Research is a dependency, not an informal prelude. Any developer or copywriter who discovers information required by later work must write it into the repository before implementation continues.

### 17.1 Required research directory

```text
docs/
  decisions/
  research/
    current-site/
      desktop/
      tablet/
      mobile/
    current-site-audit.md
    design-tokens.md
    tone-of-voice.md
    positioning-research.md
    engagement-model.md
    claims-methodology.md
    claims-ledger.csv
    asset-register.csv
    conversion-spec.md
    seo-and-redirect-audit.md
    analytics-and-privacy.md
    case-studies/
      neara.md
      ferovinum.md
      13sick.md
      origami.md
      veyor.md
  copy/
    homepage.md
    case-studies/
  approvals/
    copy-signoff.md
    claims-signoff.md
    launch-signoff.md
```

### 17.2 R-001 — Current-site audit

**Owner:** designer or front-end developer  
**Output:** `docs/research/current-site-audit.md`

Capture the live site at:

- desktop: `1440 × 900`;
- large desktop: `1920 × 1080`;
- tablet: `768 × 1024`;
- mobile: `390 × 844`;
- small mobile: `320 × 568`.

Store full-page screenshots under `docs/research/current-site/`.

The audit must document:

- page sections and order;
- header behaviour;
- breakpoints;
- max-widths;
- spacing rhythm;
- typography;
- colour usage;
- logo marquee behaviour;
- hover/focus states;
- animation timing;
- border radii;
- image treatment;
- footer and legal content;
- existing routes;
- existing third-party scripts;
- analytics tags;
- forms;
- social links;
- metadata;
- robots and sitemap behaviour.

Do not begin final styling until this audit exists.

### 17.3 R-002 — Design-token inventory

**Output:** `docs/research/design-tokens.md`

Record computed values from browser developer tools, not visual guesses:

- colours;
- font families and files;
- font sizes;
- line heights;
- weights;
- spacing increments;
- container widths;
- radii;
- shadows;
- transition durations;
- breakpoints;
- z-index layers.

For each token, note whether it is:

- exact from the current site;
- approximated;
- newly introduced;
- legally/licensing approved.

### 17.4 R-003 — Tone-of-voice audit

**Owner:** copywriter  
**Output:** `docs/research/tone-of-voice.md`

Analyse the current site and record:

- representative headline patterns;
- sentence length;
- humour level;
- metaphors;
- capitalisation;
- degree of irreverence;
- phrases to retain;
- phrases to retire;
- how to sound like Helix without relying on “humans,” founder personalities, or generic venture-studio language.

The copywriter should then write a short checklist that every section must pass.

### 17.5 R-004 — Positioning research

**Owner:** strategist or copywriter  
**Output:** `docs/research/positioning-research.md`

Research how credible firms describe:

- enterprise-value creation;
- operating leverage;
- performance-linked fees;
- venture building;
- deep product and technology partnership.

The purpose is to sharpen differentiation and avoid category clichés, not to copy competitors.

Include:

- five to ten reference firms;
- the language pattern each uses;
- what Helix should avoid;
- where Helix has a defensible difference;
- the strongest objections a qualified prospect may have;
- copy responses to those objections.

### 17.6 R-005 — Claims methodology

**Owner:** finance lead plus copywriter  
**Output:** `docs/research/claims-methodology.md`

Define:

- what “enterprise value created” means;
- attribution standard;
- currency treatment;
- valuation-date convention;
- how a multiple is calculated;
- how debt, cash, and funding facilities are treated;
- whether current value after Helix’s engagement may be cited;
- what counts toward the `$500m+` headline;
- how double counting is prevented;
- the minimum evidence required for publication.

### 17.7 R-006 — Claims ledger

**Output:** `docs/research/claims-ledger.csv`

Required columns:

```csv
claim_id,company,public_copy,draft_value,currency,metric_type,entry_date,entry_value,end_date,end_value,calculation,source_type,source_location,source_url,confidence,client_approval,finance_approval,legal_approval,owner_approval,publish_status,notes
```

Every visible quantified claim must have one or more `claim_id` references in the content model.

Possible `publish_status` values:

- `researching`
- `internally_verified`
- `client_approved`
- `approved`
- `rejected`

Only `approved` claims may appear in a production build.

### 17.8 R-007 — Case-study dossiers

Create one file per case study under `docs/research/case-studies/`.

Use this template:

```md
# Company name

## Proposed public claim

## Why this case belongs on the site

## Engagement timeline

## Starting state

## End-of-engagement state

## Current state

## Helix contribution
- Product
- Technology
- Commercial
- Operating model
- Fundraising/capital
- Other

## Valuation or value evidence

## Calculation

## Currency treatment

## Attribution language

## Public sources

## Internal sources
Reference secure document IDs or locations. Do not commit sensitive source files
to a public repository.

## Asset permissions

## Client approval

## Risks or prohibited wording

## Draft copy

## Approval record
```

Dependent copy may not be finalised until the corresponding dossier exists.

### 17.9 R-008 — Asset register

**Output:** `docs/research/asset-register.csv`

Required columns:

```csv
asset_id,company,type,filename,source,owner,permission_status,usage,alt_text,contains_people,contains_confidential_ui,remove_from_site,notes
```

Explicitly mark the Awayco, Perion, Synaptico, Xylo-case-study, and Humans-section assets.

### 17.10 R-009 — Conversion specification

**Output:** `docs/research/conversion-spec.md`

Record:

- exact Calendly URL;
- CTA label;
- target behaviour;
- UTM convention;
- analytics event;
- fallback email;
- whether the three qualified outcomes use the same event;
- expected Calendly confirmation behaviour;
- test booking procedure;
- who receives booking notifications.

### 17.11 R-010 — SEO and redirect audit

**Output:** `docs/research/seo-and-redirect-audit.md`

Record:

- every currently indexed route;
- current title and description;
- canonical domain;
- inbound links known to the business;
- contact page behaviour;
- current sitemap and robots rules;
- social-preview image;
- schema markup;
- redirects required at launch.

### 17.12 R-011 — Analytics and privacy

**Output:** `docs/research/analytics-and-privacy.md`

Record:

- current analytics;
- desired launch analytics;
- cookie implications;
- privacy-policy requirements;
- data-retention requirements;
- events to track;
- events not to track.

Recommended events:

- `cta_click`
- `fit_flow_started`
- `fit_flow_completed`
- `fit_result_growth`
- `fit_result_idea`
- `fit_result_community`
- `fit_result_no_fit`

Do not include names, email addresses, free text, revenue figures entered by a user, or Calendly form data.

### 17.13 R-012 — Engagement-model validation

**Owners:** Helix commercial owner, copywriter, finance lead, and legal reviewer  
**Output:** `docs/research/engagement-model.md`

Document the real operating model behind the “How we work” section.

At minimum, record:

- the purpose and normal duration of pre-engagement preparation;
- who Helix normally interviews or works with during that period;
- whether it is always performed at Helix’s own cost;
- the boundary between qualification, unpaid preparation, and paid discovery;
- what information Helix needs to build an independent case;
- confidentiality, data-room, and intellectual-property treatment;
- the criteria Helix uses to decide whether it can deliver on the promise;
- examples of circumstances in which Helix would decline an engagement;
- the normal current-payment mechanics during delivery;
- the possible forms of back-end participation;
- how baseline value, target outcomes, attribution, vesting, and realisation are handled;
- what executive and board alignment means in practice;
- what authority, access, and decision rights Helix needs while embedded;
- the definition of sustainable handover;
- the distinction between Helix exiting the active engagement and the company pursuing a sale or liquidity event;
- approved public wording and wording that must not be used.

The file must include a concise, public-safe summary that the homepage copy can reference and a separate implementation note for the team. Do not commit confidential contracts or client materials; reference their secure locations instead.

**Gate:** the “How we work” section cannot be marked approved until this file has commercial, finance, legal, and owner sign-off.

---

## 18. Technical architecture

### 18.1 Chosen stack

Use:

- **Astro** for static HTML generation;
- **React** for the interactive fit qualifier;
- **TypeScript** in strict mode;
- **plain CSS with custom properties** for brand fidelity;
- **Astro content collections** for structured case-study content;
- **Vitest** for unit tests;
- **React Testing Library** for component behaviour;
- **Playwright** for end-to-end, accessibility, and visual checks;
- **Cloudflare Pages** for hosting and Git-triggered deployment;
- **GitHub Actions** for CI and branch protection;
- **npm** with a committed lockfile;
- **Node.js 24 LTS** pinned in the repository and Cloudflare build settings.

### 18.2 Why Astro rather than a React SPA

The website is primarily content and static presentation, with one meaningful interactive island.

Astro should:

- emit readable HTML at build time;
- send no JavaScript for static sections;
- hydrate only the fit qualifier;
- improve baseline SEO and resilience;
- keep the client bundle small;
- deploy to Cloudflare Pages as ordinary static assets.

A full React SPA would add unnecessary runtime JavaScript and make progressive enhancement harder.

### 18.3 Why not Next.js

The first release needs no server rendering at request time, API route, authentication, or database. Next.js would introduce unnecessary framework and Cloudflare-adapter complexity.

### 18.4 Why not Tailwind

The design needs a small, explicit brand system rather than a large utility vocabulary. Use readable component styles and shared tokens so a future designer can inspect and modify the implementation without reconstructing generated utility combinations.

Tailwind may be reconsidered only if the implementation team has a strong documented reason.

### 18.5 Hydration strategy

Use a React island only for the qualifier.

Recommended Astro directive:

```astro
<FitQualifier client:visible />
```

Render a useful static fallback before hydration. If testing shows delayed interaction when the section enters the viewport, use `client:idle` instead.

### 18.6 Content strategy

Use local content collections rather than a CMS.

Benefits:

- versioned copy reviews;
- typed frontmatter;
- build-time validation;
- no new operational system;
- easy rollback;
- direct links between case studies and claim IDs.

Do not expose research dossiers in the generated `dist` directory.

---

## 19. Proposed repository structure

```text
.
├── IMPLEMENTATION_PLAN.md
├── README.md
├── package.json
├── package-lock.json
├── astro.config.mjs
├── tsconfig.json
├── .nvmrc
├── .node-version
├── .editorconfig
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── docs/
│   ├── decisions/
│   ├── research/
│   ├── copy/
│   └── approvals/
├── public/
│   ├── _headers
│   ├── _redirects
│   ├── favicon.svg
│   ├── favicon.ico
│   ├── robots.txt
│   ├── social/
│   └── fonts/
├── scripts/
│   ├── validate-content.mjs
│   ├── validate-forbidden-copy.mjs
│   ├── validate-links.mjs
│   └── generate-social-card.mjs
├── src/
│   ├── assets/
│   │   ├── brand/
│   │   ├── logos/
│   │   └── case-studies/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── ProofBanner.astro
│   │   ├── LogoMarquee.astro
│   │   ├── CaseStudyGrid.astro
│   │   ├── CaseStudyCard.astro
│   │   ├── WhyHelix.astro
│   │   ├── HowWeWork.astro
│   │   ├── FinalCta.astro
│   │   ├── Footer.astro
│   │   └── fit/
│   │       ├── FitQualifier.tsx
│   │       ├── FitQuestion.tsx
│   │       ├── FitOutcome.tsx
│   │       ├── fitFlow.ts
│   │       └── fitFlow.test.ts
│   ├── content/
│   │   ├── config.ts
│   │   └── case-studies/
│   │       ├── neara.md
│   │       ├── ferovinum.md
│   │       ├── 13sick.md
│   │       ├── origami.md
│   │       └── veyor.md
│   ├── config/
│   │   ├── site.ts
│   │   ├── navigation.ts
│   │   ├── logos.ts
│   │   └── howWeWork.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── 404.astro
│   ├── styles/
│   │   ├── reset.css
│   │   ├── tokens.css
│   │   ├── global.css
│   │   ├── typography.css
│   │   └── utilities.css
│   └── utils/
│       ├── analytics.ts
│       ├── externalLink.ts
│       └── claims.ts
├── tests/
│   ├── e2e/
│   │   ├── homepage.spec.ts
│   │   ├── fit-flow.spec.ts
│   │   ├── accessibility.spec.ts
│   │   └── metadata.spec.ts
│   └── visual/
├── playwright.config.ts
└── .github/
    └── workflows/
        └── ci.yml
```

---

## 20. Content model

### 20.1 Case-study schema

Use a typed schema similar to:

```ts
type ApprovalStatus =
  | "draft"
  | "researching"
  | "internally-verified"
  | "approved";

type CaseStudy = {
  name: string;
  slug: string;
  order: number;
  website?: string;
  approvalStatus: ApprovalStatus;
  publish: boolean;

  outcomeHeadline: string;
  currentOutcome?: string;
  engagementStage: "0-to-1" | "0-to-1-to-10" | "scale";
  valueMultiple?: string;
  valueCreated?: string;
  currency?: "AUD" | "USD" | "GBP" | "EUR" | "mixed" | "undecided";

  summary: string;
  helixContribution: string[];
  claimIds: string[];

  logo: string;
  image?: string;
  imageAlt?: string;

  clientApproval: "pending" | "approved" | "not-required";
  assetApproval: "pending" | "approved";
};
```

The production build must fail when:

- `publish: true` and `approvalStatus !== "approved"`;
- a quantified string has no `claimIds`;
- `clientApproval` is pending where required;
- `assetApproval !== "approved"`;
- a required case study is missing;
- a removed case study is present.

### 20.2 Logo schema

```ts
type LogoEntry = {
  name: string;
  asset: string;
  website?: string;
  status: "retain" | "remove" | "pending";
  permission: "approved" | "pending";
  alt: string;
};
```

The logo component should consume only entries with `status: "retain"` and `permission: "approved"`.

### 20.3 Single CTA configuration

```ts
export const primaryCta = {
  label: "LET’S CREATE ENTERPRISE VALUE",
  href: import.meta.env.PUBLIC_CALENDLY_URL,
  analyticsEvent: "cta_click",
} as const;
```

Production validation must reject:

- a missing URL;
- a non-HTTPS URL;
- a URL not on the approved Calendly domain;
- inconsistent primary CTA labels.

### 20.4 Fit-flow data model

Keep questions and transitions in a pure data structure so the logic is testable independently of the UI.

```ts
type NodeId =
  | "existing-business"
  | "capacity-leverage"
  | "strong-idea"
  | "builder-energy"
  | "growth-fit"
  | "idea-fit"
  | "community-fit"
  | "not-current-fit"
  | "no-fit";

type QuestionNode = {
  type: "question";
  id: NodeId;
  prompt: string;
  yes: NodeId;
  no: NodeId;
};

type ResultNode = {
  type: "result";
  id: NodeId;
  headline: string;
  body: string;
  qualified: boolean;
};
```

### 20.5 How-we-work model

Keep the four stages in one typed configuration file so order, wording, and required concepts can be validated.

```ts
type HowWeWorkStep = {
  number: "01" | "02" | "03" | "04";
  id: "build-case" | "align-incentives" | "deliver" | "sustain-and-realise";
  title: string;
  body: string;
  requiredConcepts: string[];
};

export const howWeWorkSteps: readonly HowWeWorkStep[] = [
  // Exactly four approved steps, in sequence.
];
```

Validation must fail if:

- there are not exactly four steps;
- the stage order changes without an explicit decision;
- stage one does not state that Helix invests its own preparation time/cost;
- stage two omits current delivery compensation, back-end upside, or executive/board alignment;
- stage three omits embedded, objective-led delivery;
- stage four omits sustainability, handover, or gain-share realisation;
- draft markers or unapproved commercial claims appear in a production build.

Render the structure as a semantic `<ol>`. The configuration is content, not a workflow engine; no client-side state is required.

---

## 21. Build commands

The final repository should expose these commands:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "npm run validate && astro build",
    "preview": "astro preview",
    "typecheck": "astro check",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "validate:content": "node scripts/validate-content.mjs",
    "validate:copy": "node scripts/validate-forbidden-copy.mjs",
    "validate:links": "node scripts/validate-links.mjs",
    "validate": "npm run typecheck && npm run lint && npm run format:check && npm run validate:content && npm run validate:copy && npm run test",
    "verify": "npm run validate && npm run build",
    "deploy:build": "npm run verify"
  }
}
```

The exact lint/test commands may change with package versions, but the intent must remain.

---

## 22. Implementation phases

## Phase 0 — Repository and governance

### P0-001 — Create a private GitHub repository

The repo should be private because research may contain non-public valuation evidence and client information.

### P0-002 — Commit this plan at the root

No implementation work should begin without the plan in the repository.

### P0-003 — Create decision, research, copy, and approval directories

Add templates so contributors do not invent incompatible formats.

### P0-004 — Establish branch rules

Use:

- `main` as production;
- feature branches for implementation;
- pull requests for all changes;
- at least one required reviewer;
- required CI checks;
- no direct pushes to `main`.

### P0-005 — Record owners

Name an owner for:

- product/strategy;
- design;
- development;
- copy;
- finance claims;
- legal;
- final publication.

**Gate:** repository exists, branch protection is active, and the unresolved decisions have owners.

---

## Phase 1 — Research and evidence

Complete R-001 through R-012.

Priority order:

1. Current-site audit
2. Design tokens and font rights
3. Engagement-model validation
4. Claims methodology
5. Claims ledger
6. Neara and Veyor dossiers
7. Ferovinum metric clarification
8. 13SICK and Origami internal research
9. Asset permissions
10. Conversion specification
11. SEO/redirect audit
12. Analytics/privacy decision

**Gate:** enough evidence exists to distinguish approved public facts from placeholders. Development may use placeholder content, but final copy may not be represented as approved.

---

## Phase 2 — Scaffold the application

### P2-001 — Create Astro project

Use the current stable Astro release and TypeScript strict mode.

### P2-002 — Add React integration

Install the official React integration and create a minimal hydration test.

### P2-003 — Pin runtime

Add:

- `.nvmrc`;
- `.node-version`;
- `engines.node` in `package.json`;
- committed `package-lock.json`.

Use Node.js 24 LTS unless Cloudflare’s supported build environment requires a documented adjustment.

### P2-004 — Add linting, formatting, type checking, and tests

CI should be functional before page implementation.

### P2-005 — Add base routes and layout

Create:

- homepage;
- 404;
- base metadata;
- global styles;
- initial redirect file.

**Gate:** `npm ci`, `npm run dev`, `npm run verify`, and `npm run preview` work on a clean machine.

---

## Phase 3 — Implement the design system

### P3-001 — CSS reset and global semantics

Use a modern minimal reset. Preserve native control behaviour.

### P3-002 — Tokens

Implement approved colours, typography, spacing, widths, radii, and motion tokens.

### P3-003 — Fonts

Self-host only approved font files. Preload only the critical weights. Use `font-display: swap`.

### P3-004 — Shared layout primitives

Create:

- page container;
- section wrapper;
- display heading;
- eyebrow;
- primary CTA;
- accessible external-link treatment;
- proof metric;
- responsive media frame.

### P3-005 — Motion system

Create one shared easing and duration scale, plus reduced-motion overrides.

**Gate:** a static internal style page or Storybook-equivalent preview demonstrates every token and primitive at desktop and mobile widths.

A full Storybook setup is optional; a local `/dev/style-guide` route excluded from production is sufficient.

---

## Phase 4 — Build static homepage sections

Build in this order:

1. Header
2. Hero
3. Proof banner
4. Logo marquee
5. Case-study container and cards
6. “We’re different because…” manifesto
7. Separate “How we work” four-stage process
8. Final CTA
9. Footer

Use temporary approved-safe copy where claims are pending.

### P4-001 — Remove people-led content

Do not port the humans image or humans section.

### P4-002 — Enforce removed logos

Add Awayco, Perion, and Synaptico as explicit `remove` records during migration, then omit them from production output. This creates an auditable record rather than silently losing track of the requirement.

### P4-003 — Keep “Why we’re different” and “How we work” separate

Implement two distinct sections:

- `WhyHelix.astro` explains the philosophy: deep partnership, shared risk/upside, selectivity, and responsibility for the outcome.
- `HowWeWork.astro` explains the four-stage operating sequence: build the case; align incentives; join the team and deliver; make the result sustainable and realise the agreed upside.

Do not merge them into one long block, reuse identical copy across both, or treat the process section as a set of generic capabilities.

### P4-004 — Implement the process as semantic static content

Render the four stages from `src/config/howWeWork.ts` as a semantic ordered list. Add the connected-path visual treatment with CSS and decorative SVG only. The complete section must work without JavaScript.

### P4-005 — Remove split CTA

Delete the investment CTA and ensure all primary actions resolve to the shared Calendly config.

**Gate:** the static homepage is complete and responsive; both model sections are visibly distinct; all four operating stages are present in the correct order; and no unapproved numeric or commercial claim is published.

---

## Phase 5 — Build the fit qualifier

### P5-001 — Implement pure state graph

Write and test `fitFlow.ts` first.

### P5-002 — Build accessible React UI

Use semantic controls and a predictable focus model.

### P5-003 — Add desktop flowchart presentation

Use CSS/SVG connections without changing semantic reading order.

### P5-004 — Add mobile stepper

Do not reuse the desktop layout if it harms usability.

### P5-005 — Add fallback

Visitors with JavaScript disabled must still see:

- the types of partner Helix is looking for;
- the single CTA;
- the Redfern address.

### P5-006 — Add analytics adapter

No-op when analytics is disabled.

**Gate:** unit tests cover every branch, Playwright covers keyboard use, and axe reports no serious or critical violations.

---

## Phase 6 — Integrate researched content

### P6-001 — Populate case-study content collection

Every case-study file must reference claim IDs and approval status.

### P6-002 — Implement draft visibility rules

Recommended behaviour:

- local development may show draft copy with an obvious `DRAFT — NOT FOR PUBLICATION` marker;
- Cloudflare preview builds should exclude confidential or unapproved claims unless previews are protected with Cloudflare Access;
- production must include approved copy only.

### P6-003 — Final copy edit

Review for:

- factual accuracy;
- attribution;
- currency;
- consistency;
- spelling;
- tone;
- repetition;
- readability;
- no hidden people-led narrative.

### P6-004 — Client and owner approval

Capture approvals in the repository. An email or signed PDF may be referenced by secure document ID if it should not be committed.

**Gate:** all five case studies are either approved for production or deliberately omitted with owner approval. No placeholder syntax remains.

---

## Phase 7 — SEO, metadata, accessibility, performance, and security

### P7-001 — Metadata

Working title:

> Helix Collective — Enterprise Value Growth Partner

Working description:

> Helix Collective partners deeply with businesses to create meaningful growth in enterprise value through product, technology and commercial execution.

Review before launch.

### P7-002 — Canonical domain

Use one canonical domain consistently, recommended:

> `https://www.helixcollective.com/`

Redirect the apex domain to the canonical domain or vice versa, but never serve both independently.

### P7-003 — Social preview

Create a new Open Graph image that contains:

- Helix logo;
- enterprise-value proposition;
- mint, ink, and white palette;
- no people;
- no unapproved numerical claim unless approved.

### P7-004 — Structured data

Use conservative `Organization` and `WebSite` JSON-LD.

Do not include:

- individual founder/person schema;
- fabricated ratings;
- unverified founding dates;
- unverified employee counts;
- case-study valuation data in schema unless reviewed.

### P7-005 — Accessibility

Target WCAG 2.2 AA.

Required checks:

- landmarks;
- heading order;
- skip link;
- keyboard navigation;
- focus visibility;
- contrast;
- meaningful alt text;
- decorative-image handling;
- reduced motion;
- responsive text zoom;
- touch target size;
- screen-reader announcements in the qualifier.

### P7-006 — Performance budget

Initial targets:

- Lighthouse Performance: at least 90 mobile and 95 desktop;
- Accessibility, Best Practices, and SEO: at least 95;
- LCP under 2.5 seconds on a representative mobile profile;
- CLS under 0.1;
- INP under 200 milliseconds;
- initial JavaScript under 120 KB gzip;
- no unoptimised hero image;
- no third-party iframe on initial load.

Treat these as release budgets, not vanity screenshots.

### P7-007 — Images

- Use Astro’s local image pipeline where appropriate.
- Generate responsive sizes.
- Prefer AVIF/WebP with sensible fallback.
- Set dimensions to avoid layout shift.
- Do not upscale low-resolution Webflow exports.
- Lazy-load below-the-fold case-study images.
- Keep the hero lightweight.

### P7-008 — Security headers

Create `public/_headers` after all external dependencies are known.

Candidate policy:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
```

Add a Content Security Policy only after testing fonts, analytics, and Calendly navigation. Avoid a broad policy full of wildcards.

HSTS should be managed carefully at the Cloudflare zone level after the domain is stable.

### P7-009 — Redirects

Create `public/_redirects`:

```text
/contact-us  /  301
```

Add any other routes discovered during the SEO audit.

**Gate:** automated and manual quality checks pass.

---

## Phase 8 — Testing

### 8.1 Unit tests

Test:

- every fit-flow transition;
- restart;
- back navigation;
- invalid node protection;
- CTA configuration;
- case-study schema;
- claim approval rules;
- logo inclusion/exclusion;
- removed-copy validator.

### 8.2 Integration tests

Test:

- all primary CTAs use the same label and URL;
- external CTA attributes;
- case studies render in approved order;
- only approved claims appear;
- the “Why Helix” and “How we work” sections are distinct;
- all four “How we work” stages render in the approved order;
- the process remains complete without JavaScript;
- reduced-motion marquee behaviour;
- no-JavaScript fallback;
- metadata.

### 8.3 End-to-end tests

Run at:

- `320 × 568`;
- `390 × 844`;
- `768 × 1024`;
- `1024 × 768`;
- `1440 × 900`;
- `1920 × 1080`.

Cover:

- homepage loads;
- logo appears;
- hero proposition is visible;
- proof metrics are correct;
- removed logos are absent;
- Xylo case study is absent;
- all qualifier paths;
- Calendly destination;
- keyboard-only use;
- 404;
- contact redirect.

### 8.4 Browser matrix

Manual release testing:

- current Chrome;
- current Safari;
- current Firefox;
- current Edge;
- iOS Safari;
- Android Chrome.

### 8.5 Visual regression

Create stable Playwright screenshot baselines after design approval, not before.

Baseline:

- hero;
- proof banner;
- logo marquee in static mode;
- each case-study layout pattern;
- “We’re different because…” section;
- four-stage “How we work” section;
- each fit outcome;
- final CTA;
- footer;
- mobile and desktop full page.

### 8.6 Forbidden-copy checks

The build should fail if production output contains case-insensitive variants of:

- `50+ ventures`
- `humans of helix`
- `23 humans`
- `market domination`
- old humans-section alt text
- Awayco
- Perion
- Synaptico

Do not globally forbid `Xylo` while its marquee logo remains approved. Instead, assert that no case-study entry has the Xylo slug.

Also scan:

- HTML;
- metadata;
- JSON-LD;
- image alt text;
- generated social cards;
- JavaScript payload strings;
- source maps if published.

---

## Phase 9 — CI and deployment

### 9.1 GitHub Actions CI

Run on pull requests and pushes to `main`.

Recommended sequence:

1. Checkout
2. Set up Node 24
3. Cache npm
4. `npm ci`
5. `npm run validate`
6. `npm run build`
7. Install Playwright browser
8. `npm run test:e2e`
9. Upload Playwright report and screenshots on failure

The workflow should not contain Cloudflare credentials if native Git integration is used.

### 9.2 Cloudflare Pages

Use Cloudflare Pages’ native GitHub integration.

Configuration:

| Setting | Value |
|---|---|
| Repository | Private Helix website repository |
| Production branch | `main` |
| Build command | `npm run deploy:build` |
| Build output directory | `dist` |
| Root directory | repository root |
| Node version | pinned Node 24 LTS |
| Preview deployments | enabled |
| Production auto-deploy | enabled |

Cloudflare should build every branch push and create pull-request previews. Branch protection ensures only reviewed, green code reaches `main`.

Be aware that a Git-integrated Pages project is a deliberate deployment mode choice; document any future migration to direct upload rather than assuming it is interchangeable.

### 9.3 Environment variables

At minimum:

```text
PUBLIC_SITE_URL=https://www.helixcollective.com
PUBLIC_CALENDLY_URL=https://calendly.com/[APPROVED-PATH]
PUBLIC_ANALYTICS_ENABLED=false
```

The Calendly URL is public, not a secret, but still belongs in one environment/config source.

Do not put secrets in `PUBLIC_*` variables.

### 9.4 Preview privacy

Unapproved valuation material must not leak through public preview URLs.

Choose one:

1. Exclude unapproved claims from preview builds.
2. Protect previews through Cloudflare Access.
3. Use local-only flags for confidential draft copy.

**Recommended default:** previews show only approved/public-safe copy; confidential research remains in the private repository and local environment.

---

## Phase 10 — Domain cutover

### 10.1 Before cutover

- Complete production QA on the `pages.dev` domain.
- Record current DNS records and TTLs.
- Export or archive the existing Webflow site.
- Preserve all existing assets and metadata needed for rollback.
- Confirm ownership of the Cloudflare zone.
- Confirm SSL certificate provisioning.
- Confirm canonical `www` versus apex decision.
- Run a link crawl against the preview.
- Test Calendly from production-like environment.
- Confirm all approvals.

### 10.2 Cutover procedure

1. Add the custom domain to Cloudflare Pages.
2. Confirm certificate status.
3. Configure canonical redirect.
4. Lower DNS TTL in advance if needed.
5. Update DNS from Webflow to Cloudflare Pages.
6. Confirm:
   - `https://www.helixcollective.com/`;
   - apex redirect;
   - `/contact-us` redirect;
   - SSL;
   - assets;
   - social preview;
   - robots and sitemap;
   - Calendly.
7. Submit the new sitemap in relevant webmaster tools if used.
8. Monitor errors, Web Vitals, and booking clicks.

### 10.3 Rollback

Keep the Webflow project intact for at least seven days.

Rollback if:

- DNS or certificate fails;
- critical mobile rendering is broken;
- Calendly is inaccessible;
- approved copy is missing;
- an unapproved claim is published;
- severe accessibility or security regression is found.

Rollback steps:

1. Restore the prior DNS records.
2. Purge Cloudflare cache if necessary.
3. Re-enable the Webflow domain.
4. Record the incident in `docs/decisions/` or an incident file.
5. Fix through a pull request and repeat launch checks.

---

## 23. Content and legal approval gates

### Gate A — Strategic copy

Required approver: Helix owner.

Covers:

- hero;
- partnership model;
- fit criteria;
- CTA;
- no-fit humour;
- profanity decision.

### Gate B — Financial claims

Required approvers:

- finance owner;
- legal reviewer;
- Helix owner.

Covers:

- `$500m+`;
- every case-study valuation;
- every multiple;
- every value-created figure;
- enterprise-value terminology;
- currency.

### Gate C — Client representation

Required approver: relevant client or authorised internal owner, depending on agreements.

Covers:

- logo;
- screenshots;
- description of Helix’s role;
- fundraising claims;
- current valuation;
- confidential product information.

### Gate D — Publication

Required approvers:

- product/strategy;
- design;
- development;
- copy;
- finance/legal;
- final owner.

No one approval substitutes for all of them.

---

## 24. Acceptance criteria

The rebuild is complete only when all of the following are true.

### Message

- The hero explicitly says Helix works with businesses to create meaningful growth in enterprise value.
- The site does not rely on named people or team reputation.
- `$500m+` and `10+ years` are shown in the second banner.
- No venture count or human count is shown.
- The “We’re different because…” section explains deep engagement, shared risk/upside, selectivity, and responsibility for the outcome.
- “How we work” remains a separate section rather than being merged into the differentiation statement.
- The “How we work” headline or its closing line communicates: “Others promise. We put our money where our mouth is.”
- Stage one explains that Helix gets to know the business, founders, and executives and independently builds its case at its own cost and time.
- Stage two explains current payment as Helix delivers, back-end upside as the thesis plays out, and meaningful executive/board alignment.
- Stage three explains that Helix becomes part of the operating team and delivers with single-minded focus against agreed enterprise-value objectives.
- Stage four explains sustainable capability and handover, a clean exit from the active engagement, and the agreed mechanism for realising Helix’s gain-share.
- The public wording does not imply a guaranteed result, a universal financial instrument, an employment relationship, or a mandatory sale of the company.
- There is one primary conversion action.

### Logos and content

- Awayco is absent.
- Perion is absent.
- Synaptico is absent.
- Xylo is absent as a case study.
- Neara, Ferovinum, Origami, 13SICK, and Veyor are represented according to approved copy.
- No case-study claim is unapproved.
- No people/team section remains.
- No old “market domination” copy remains.

### Qualification flow

- All specified branches exist.
- The missing capacity-no branch has an approved outcome.
- All positive outcomes use the same CTA.
- Back and restart work.
- Keyboard and screen-reader use work.
- Mobile flow is usable at 320 px.
- No-JavaScript users see a meaningful fallback.

### Visual fidelity

- Core mint, ink, and white brand identity is retained.
- Typography is legally usable and approved.
- Headline scale and section rhythm feel recognisably Helix.
- The four-stage process reads clearly as a progression on desktop and mobile.
- No stock-person imagery is introduced.
- Motion respects reduced-motion preferences.

### Technical

- Local setup is documented.
- `npm ci` and `npm run verify` pass.
- Production output is static in `dist`.
- The four-stage process is rendered as semantic static HTML and remains complete without client-side JavaScript.
- CI is required before merge.
- Git pushes to `main` trigger Cloudflare deployment.
- PRs receive preview deployments.
- Custom domain, canonical redirect, contact redirect, SSL, sitemap, and robots are correct.
- Performance and accessibility budgets pass.

### Operational

- Research and decisions are in the repository.
- `docs/research/engagement-model.md` is approved by commercial, finance, legal, and owner reviewers.
- Claims ledger is complete.
- Asset permissions are recorded.
- Calendly is tested.
- Webflow rollback remains available for the agreed period.
- Launch sign-off is recorded.

---

## 25. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Company valuation is confused with funding capacity | Misleading public claim | Claims methodology, finance/legal review, Ferovinum evidence gate |
| Equity valuation is called enterprise value | Credibility and legal risk | Define terminology or change wording |
| Helix is credited with all subsequent growth | Over-attribution | Use engagement dates and “during our engagement” wording |
| Mixed currencies are added together | Invalid `$500m+` claim | Document currency and conversion method |
| Confidential data appears in preview | Client/reputational harm | Private repo, safe preview copy, Cloudflare Access if needed |
| Old logo use is not authorised | Trademark/client issue | Asset register and permission gate |
| Original font is unlicensed | Copyright/licensing issue | Audit licence and use approved fallback |
| React flow is inaccessible | Excludes users and harms quality | Semantic state machine, keyboard tests, no-JS fallback |
| Marquee causes motion discomfort | Accessibility issue | Reduced-motion static layout |
| External Calendly link fails | Lost conversion | Validation, test booking, fallback email |
| Removing `/contact-us` breaks links | SEO and user friction | Permanent redirect |
| Hotlinked Webflow assets disappear | Broken site | Store approved local assets |
| Native Pages deploy publishes bad main commit | Production regression | Branch protection and build-time validation |
| Generic rewrite loses Helix character | Brand dilution | Tone audit and owner copy gate |
| “Get paid when you get paid” is not universally true | Misrepresentation | Commercial-model decision and qualified language |
| “At our own cost” is not true for every pre-engagement process | Misleading promise or scope dispute | Define the boundary between unpaid underwriting and paid discovery |
| “Become part of the team” implies employment, agency, or fiduciary status | Legal and governance confusion | Describe embedded operating behaviour without assigning a legal status that is not agreed |
| Back-end gain-share is described too specifically or as guaranteed | Financial, tax, or legal risk | Keep public wording instrument-neutral and require finance/legal review |
| “Exit” is read as requiring a company sale | Misaligned founder expectations | Distinguish Helix’s engagement handover from any company liquidity event |
| Board alignment is asserted without a real governance mechanism | Delivery failure or credibility risk | Define objectives, decision rights, reporting, and approvals before engagement |
| Q1 fit ranges are ambiguous | Wrong prospect qualification | Resolve EBITA/EBITDA, currency, and OR/AND logic |
| Site becomes a team story again over time | Strategic drift | Forbidden-copy checks and content guidelines |

---

## 26. Suggested first implementation pull requests

Keep pull requests small enough to review meaningfully.

### PR 1 — Project foundation

- Astro + React + TypeScript
- lint, format, typecheck, test
- base layout
- CI
- Cloudflare-ready build
- repository docs structure

### PR 2 — Research inventory

- current-site audit
- token audit
- tone audit
- engagement-model validation
- route/SEO audit
- asset register
- decisions opened

### PR 3 — Design system

- colour tokens
- typography
- layout primitives
- CTA
- motion/reduced motion
- local style guide

### PR 4 — Static homepage skeleton

- header
- hero
- proof banner
- placeholder logo marquee
- placeholder case-study section
- “We’re different because…” section
- separate four-stage “How we work” section
- final CTA
- footer

No unapproved figures or commercial-model promises.

### PR 5 — Fit qualifier

- state graph
- React island
- desktop and mobile layouts
- tests
- analytics adapter

### PR 6 — Approved assets and logos

- local assets
- optimisation
- removed-logo tests
- permissions recorded

### PR 7 — Case-study content

- claims ledger
- dossiers
- approved copy
- typed content collection
- build gate

### PR 8 — SEO, accessibility, performance

- metadata
- OG image
- JSON-LD
- redirects
- headers
- Playwright and axe
- image optimisation
- performance work

### PR 9 — Production deployment

- Cloudflare Pages connection
- production environment
- preview QA
- domain cutover
- launch sign-off

---

## 27. Exact next actions

1. Create the private GitHub repository and commit this file.
2. Appoint owners for the unresolved decisions.
3. Create `docs/research/current-site-audit.md` and capture the live site at all required breakpoints.
4. Inspect the live Webflow site in browser developer tools and record exact fonts, colours, spacing, scripts, metadata, routes, and the existing “How we work” visual treatment.
5. Create and approve `docs/research/engagement-model.md`, including the boundary between unpaid preparation and paid discovery, current compensation, back-end participation, governance, sustainable handover, and gain-share realisation.
6. Create the claims methodology and claims ledger before final case-study copy is written.
7. Resolve the Ferovinum `$500m` figure before describing it as a valuation.
8. Gather internal evidence for Origami and 13SICK.
9. Confirm Neara and Veyor engagement-period calculations, not merely their current valuations.
10. Confirm the exact Calendly URL and the EBITA/EBITDA qualification rule.
11. Scaffold Astro with React and make CI green.
12. Implement the approved visual system and static page shell, keeping “Why we’re different” and “How we work” separate.
13. Implement the four-stage process as semantic static content and validate all required concepts.
14. Implement and test the fit state machine.
15. Integrate approved case-study copy and assets.
16. Run the full launch checklist on a Cloudflare preview.
17. Cut over the domain with Webflow retained as a rollback path.

---

## 28. Research snapshot used to prepare this plan

This snapshot is directional. The repository research phase must re-check sources at implementation time.

### Current Helix site

- The current homepage is a Webflow-hosted build.
- It uses oversized, irreverent statements and an institutional logo strip.
- It currently presents `50+ ventures`, `$500m total value created`, a human count, and `10+ years`.
- It currently features Ferovinum, Neara, Xylo, and Origami case-study content.
- It currently has a separate contact route and a split build/invest CTA pattern.
- A current brand asset uses mint `#5AFFBA`, ink `#231F20`, and white.

Reference:

- `https://www.helixcollective.com/`
- `https://www.helixcollective.com/contact-us`

### Neara

Public reporting in February 2026 supports an `A$1.1b` valuation following an `A$90m` Series D.

References:

- `https://neara.com/resources/press/neara-raises-90-million-to-solve-the-global-infrastructure-crisis-with-ai/`
- `https://www.smartcompany.com.au/startupsmart/neara-powers-up-to-unicorn-status-with-90-million-capital-raise/`

### Ferovinum

Public materials support a large asset-backed financing/securitisation programme. They do not, on their own, establish a `$500m` company valuation.

References:

- `https://www.ferodrinks.com/posts/ferovinum-announces-the-completion-of-its-ps17-5m-series-a-funding-round`
- `https://alternativecreditinvestor.com/2025/06/30/ferovinum-secures-world-first-550m-abs-for-drinks-industry/`

### Veyor

March 2026 reporting supports an `A$50m–A$75m` valuation range associated with its Series A.

References:

- `https://www.smartcompany.com.au/startupsmart/veyor-11-million-series-a-raise-us-expansion/`
- `https://www.veyordigital.com/news/australian-investors-back-construction-app-with-4m-over-subscribed-equity-raise`

### Technical references

Astro and React:

- `https://docs.astro.build/en/guides/integrations-guide/react/`
- `https://docs.astro.build/en/guides/content-collections/`

Cloudflare Pages:

- `https://developers.cloudflare.com/pages/configuration/git-integration/`
- `https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/`
- `https://developers.cloudflare.com/pages/configuration/build-configuration/`

Node.js:

- `https://nodejs.org/en/download`
- `https://nodejs.org/en/about/previous-releases`

---

## 29. Final definition of done

The site is done when a new visitor can answer, without knowing any person at Helix:

- what Helix is trying to increase;
- why Helix is credible;
- how Helix creates that value;
- why Helix’s incentives differ from an ordinary consultancy;
- why Helix invests in an independent case before engaging;
- how the relationship moves from incentive alignment to embedded delivery, sustainable handover, and gain-share realisation;
- whether they are likely to be a fit;
- exactly what to do next.

And the implementation team can answer, from the repository:

- where every public claim came from;
- who approved it;
- which asset may be used;
- how to run the site locally;
- how to test it;
- how a Git push reaches production;
- how to roll back safely.
