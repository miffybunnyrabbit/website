# Tone-of-voice system (R-003)

<!-- Generated from src/config/toneOfVoice.ts — do not edit by hand. -->

**Plan references:** §15 (tone-of-voice system), §17.4 R-003.
**Review status:** approved — the tone system is the plan's working baseline, and its one outstanding sign-off, the §15.4 profanity decision, was recorded by the owner in `Q-0008-strategic-copy`.

The current site's voice is bold, playful, direct, and slightly
conspiratorial. Preserve that energy, but make the copy more commercially
rigorous. The retirements below are enforced at build time by
`forbiddenCopy.ts` where a keyword can catch them; the rest are Gate A
human-review calls, noted as such.

## Voice principles — the section checklist

Every section must answer “yes” to each question.

### 1. Bold, not inflated

Make plain, confident declarations (“We create meaningful growth in enterprise value”) rather than inflated abstractions (“We unlock transformative digital synergies for tomorrow’s leaders”).

- **Checklist:** Does every headline say something concrete Helix does, with no empty abstraction or synergy language?

### 2. Proof before theatre

A large claim is immediately followed by how the result was achieved; the evidence carries the drama, not the adjectives.

- **Checklist:** Is every large claim immediately backed by how it was achieved, not left as a bare superlative?

### 3. Institutional “we”

“We” means Helix Collective as an enduring business; the copy never requires the reader to know who any individual is.

- **Checklist:** Does the copy read as Helix the business, never leaning on named individuals or a people-led framing?

### 4. Selective confidence

The tone makes clear Helix is assessing fit as well as selling; it is selective, not eager for every visitor.

- **Checklist:** Does the section make clear Helix is assessing fit, rather than pitching to everyone?

### 5. Plain English beneath the headline

Headlines can be punchy; the supporting copy under them is specific and easy to understand.

- **Checklist:** Is the supporting copy beneath each headline specific and plain, not jargon padding?

### 6. Australian English

Use Australian spelling and punctuation (organisation, neighbourhood, programme where appropriate, en dashes for ranges), except when reproducing a client’s official wording.

- **Checklist:** Is every section in Australian English, with en dashes for ranges, except where a client’s official wording is reproduced?

## Vocabulary to favour (§15.2)

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
- 0 → 1 → 10
- build
- ship
- momentum
- selective
- material outcome
- credible path

## Themes to retire (§15.3)

- **humans of Helix** — enforced by `forbiddenCopy` rule `humans-of-helix`.
- **50+ ventures** — enforced by `forbiddenCopy` rule `venture-count`.
- **market domination** — enforced by `forbiddenCopy` rule `market-domination`.
- **digital transformation** — enforced by `forbiddenCopy` rule `digital-transformation`.
- **innovation partner, when unsupported by detail** — human-review (Gate A).
  - The plan bans this only “when unsupported by detail”; a keyword scan cannot judge whether the surrounding copy earns it, so it stays a Gate A human-review call.
- **end-to-end solutions** — enforced by `forbiddenCopy` rule `end-to-end-solutions`.
- **world-class** — enforced by `forbiddenCopy` rule `world-class`.
- **best-in-class** — enforced by `forbiddenCopy` rule `best-in-class`.
- **resource augmentation** — enforced by `forbiddenCopy` rule `resource-augmentation`.
- **free consulting, unless the exact promise is intentional** — human-review (Gate A).
  - The plan bans this only “unless the exact promise is intentional”; intent is a Gate A human-review call, not a keyword match.
- **guaranteed upside** — enforced by `forbiddenCopy` rule `guaranteed-upside`.
- **forced exit** — enforced by `forbiddenCopy` rule `forced-exit`.
- **“our people are our greatest asset”** — enforced by `forbiddenCopy` rule `greatest-asset`.
- **founder worship** — human-review (Gate A).
  - Founder worship is a framing, not a fixed phrase; the concrete “greatest asset” form is keyword-enforced, but the broader tone is a Gate A human-review call.
- **generic AI/Web3 trend language** — human-review (Gate A).
  - Trend language has no fixed keyword and legitimate copy may name AI in context, so this is a Gate A human-review call rather than a keyword ban.
- **claims that confuse capital raised with company value** — human-review (Gate A).
  - This is a semantic error the claims methodology governs; no single keyword captures it, so it is caught in finance/legal and Gate A review, not by a scan.

## Profanity (§15.4)

Profanity does not publish in body copy: the supplied “get shit done” phrasing is declined (owner decision, 2026-08-17, Q-0008). Copy keeps the same directness without it.

Sanctioned equivalent: “get the hard part done”.

Profanity never appears in metadata, social-preview text, or accessibility labels — and under this decision it does not appear in body copy either.

