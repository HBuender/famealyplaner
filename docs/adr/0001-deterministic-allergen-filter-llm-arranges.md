# Allergy safety is enforced in deterministic code, not by the LLM

The 4-year-old has a true nut allergy (hazelnut, macadamia), so allergen exclusion is a
safety constraint, not a preference. We split the planner: deterministic code computes
the pool of **eligible** Recipes per Slot — enforcing allergen exclusion, cooldown, and
effort ≤ tier — and the LLM only *arranges and ranks among that already-safe pool*
(variety, season/weather mood, kid-friendliness, ratings). The LLM physically cannot
place an unsafe Recipe because unsafe ones are never in its candidate list.

Allergen tags are set at **Recipe Import** time with mandatory human confirmation, so by
planning time safety is known data, not an LLM judgment call.

## Considered options
- **Let the LLM do everything (filter + arrange):** simpler prompt, but a single
  hallucination or missed tag could surface an unsafe recipe — and feed it into an
  auto-order. Rejected: unacceptable for a medical allergy.

## Consequences
- Allergen filtering is unit-testable and reproducible.
- The LLM's role is strictly "make the week pleasant," never "make it safe."
- Requires reliable allergen tagging on every Recipe (enforced at import via human confirm).
