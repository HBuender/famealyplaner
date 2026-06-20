# Context: Famealyplaner

A personal, single-family progressive web app that suggests a weekly dinner plan,
generates a shopping list, and (ideally) places the grocery order with REWE.

## Tech stack
- **PWA**: Next.js (React), installable on phones. Deployed on Vercel.
- **DB**: Postgres (e.g. Neon/Supabase free tier). Small dataset — one Household.
- **LLM**: **OpenAI API** (user preference) — vision model (e.g. gpt-4o/gpt-4.1) for
  screenshot **Recipe Import**, and a chat model for the planner's soft arrangement.
- **Auth**: Google OAuth for the two adult logins — also grants Google Calendar read
  access, so login and calendar are a single integration. Access is a hardcoded
  allowlist of two emails: hendrik.buender@gmail.com, jennifer.buender@gmail.com.
  Both share one Household dataset with equal read/write; kids are not users.

## Glossary

### Household
The single family the app serves. Not multi-tenant — there is exactly one Household.
Composed of **Members**. Owns the **Recipe Library**, the **Meal Plans**, and all
preferences. Currently: two adults, a 4-year-old boy, a 2-year-old boy.

### Member
A person in the **Household**. Has dietary attributes (allergies, preferences) that
constrain or bias which **Recipes** can be planned. Distinct from a login account —
a Member is an eater, not necessarily a user.

### Recipe
A known, structured dish in the **Recipe Library**: ingredients, prep/cook time,
and attributes the planner uses (allergens, seasonality, etc.). Recipes are the only
things that can be planned — the planner selects from the Library, it does not invent
food for a plan. Recipes enter the Library by seeding, by manual entry, or by importing
an Instagram screenshot.

### Recipe Library
The Household's full collection of known **Recipes**. The planner draws every planned
meal from here. Grows over time via imports.

### Meal Plan
A week's worth of planned dinners (plus optional weekend lunch). One **Slot** per
covered meal. Generated in two stages (see ADR-0001): a **deterministic eligibility
filter** (plain code) computes the safe Recipe pool per Slot — allergens excluded,
cooldown respected, effort ≤ tier — and the **LLM arranges** within that pool for
variety, season/weather mood, kid-friendliness, and ratings. Code makes the plan safe;
the LLM makes it pleasant.

### Slot
A single meal occasion within a **Meal Plan** (e.g. "Tuesday dinner"). Filled by one
**Recipe** (the shared/adult base dish) plus an optional **Kid Variant**. Has an
associated time budget derived from that day's calendar. A Slot can be **locked**
(kept across re-rolls) or **re-rolled** (planner picks a different Recipe for just
that Slot).

### Plan Approval
A **Meal Plan** is generated as a proposal, then reviewed by a human who locks, swaps,
or re-rolls Slots before **approving** it. Approval is the hard gate: only an approved
Meal Plan can produce a **Shopping List** or a REWE order. Nothing is purchased without
explicit human approval.

### Kid Variant
An adaptation of a Slot's **Recipe** for the children. Driven by two preferences:
- **Toned-down**: low salt, low sugar, low spice.
- **Deconstructed**: the dish's components served separately (noodles / sauce / veg in
  separate piles) rather than mixed together, whenever the dish allows it.
A Recipe carries flags for how easily it supports each (e.g. "deconstructable",
"kid-adaptable").

### Dietary Constraint
A per-**Member** rule that shapes which **Recipes** are eligible. Three kinds, with
different enforcement strength:
- **Allergy** — hard block. Recipe is ineligible if it contains the allergen *or* carries
  "may contain traces" risk. Cannot be overridden. (e.g. hazelnut, macadamia.)
- **Substitution preference** — never blocks. The planner prefers a substituted/free-from
  version of an ingredient; if no substitute exists the dish is served as-is and the
  Member compensates (e.g. lactose → lactose-free dairy when possible, else lactase tablet).
- **Dislike** — soft penalty. The planner avoids it but may occasionally override.

A Slot is eligible only if it carries no Allergy violation for any Member eating it.
Substitution preferences and dislikes bias selection but never make a Slot ineligible.

### Effort Tier
The difficulty/time budget for a Slot, the key matchmaking signal between a day and a
**Recipe**. Three buckets:
- **Express** — ~≤15 min, one-pot/assembly, minimal supervision.
- **Standard** — ~30 min, normal weeknight.
- **Relaxed** — 45 min+, can be multi-step/involved (often weekends).
Each Recipe has an effort rating; the planner only places a Recipe where its effort ≤
the Slot's tier. Auto-derived from the **Cooking Situation**, with a manual per-day override.

### Cooking Situation
The per-day facts, merged from multiple calendars, that determine a Slot's **Effort Tier**.
Derived by a transparent, always-overridable heuristic:
- For each adult, classify the dinner evening as **Home / Away** (all-day or travel)
  **/ Out** (event overlapping the ~16:30–19:30 dinner window), from event timing.
- Combine: both home & free → Relaxed; one cooking solo with both kids → Express;
  one cook, no time pressure → Standard. A parent being away pushes toward Express.
- Always surface the reasoning ("Express — Papa away, Mama solo"); never a black box.
- **Both-adults-out edge case**: the day is **flagged** ("nobody available to cook —
  handle manually"), NOT auto-planned (no leftovers fallback exists).
Calendars merged: family events, both adults' work calendars, evening commitments
(sports, friends).

### Rating
Post-cook feedback on a **Recipe**, entered once for the whole **Household**: a simple
👍 / 😐 / 👎, plus a separate **"kids liked it"** flag. Feeds the planner — liked recipes
recur more, disliked ones fade; "kids liked it" is a strong signal for kid-heavy weeks.

### Variety / Cooldown
The mechanism that keeps **Meal Plans** from feeling repetitive. Two axes:
- **Within-week diversity** (soft): spread protein, carb base, and cuisine across the
  week's Slots; may bend on Express days.
- **Cooldown** (across-week): after a Recipe is cooked it is suppressed for ~3 weeks
  by default, shorter for 👍 favorites (they may return sooner), with a boost for
  new/unrated Recipes so the Library gets explored. Hard rule: never the exact same
  Recipe two weeks running.

### Seasonality & Weather Bias
Two soft signals (never hard filters) that nudge Recipe selection:
- **Season** — prefer ingredients in season (spring asparagus, autumn squash, etc.).
- **Weather** — the planning week's forecast biases each Slot toward a dish "mood":
  hot day → light/cold/grill, cold/rainy → soup/stew/oven comfort.
Location: Cologne (50999). Forecast source: Open-Meteo (no API key).

### Recipe Import
Adding a **Recipe** to the Library from one or more uploaded **photos of a recipe** —
Instagram screenshot, cookbook page, magazine, handwritten card, etc. A vision-capable
LLM extracts a structured draft (title, ingredients+quantities, steps, inferred tags
incl. effort/season/deconstructable/allergens). The draft is **always human-confirmed**
before saving — mandatory because allergen mistakes are dangerous (the 4-yo's nut
allergy). Allergen detection is conservative and flags uncertainty rather than asserting
safety. The app never scrapes any source — content comes only from the uploaded image(s).

### Shopping List
Derived from an **approved Meal Plan**: every Recipe's ingredients (incl. Kid Variants)
aggregated, with duplicate ingredients merged and units normalized/summed. Quantities
scaled to the Household's portion size (~3 adult-equivalents: 2 adults + 4-yo + 2-yo,
configurable). A static **Staples list** (salt, oil, flour, common spices — "assumed on
hand") is excluded. No live pantry/inventory tracking. Categorized for shopping.

### Constraint Relaxation Order
When the eligible Recipe pool can't fill a varied week, the planner bends rules in a
fixed order and surfaces every relaxation (never silent):
1. **Allergen exclusion — never relaxed** (safety; see ADR-0001).
2. Relax **within-week variety** (allow a repeated protein/cuisine).
3. Relax **cooldown** (bring a Recipe back sooner than its window).
4. Relax **Effort Tier** — last resort, flagged loudly (a too-hard meal on a busy night
   breaks the core promise).
5. If still unfillable → tell the user the **Library is too thin** and suggest importing/
   adding Recipes, rather than inventing a plan.

### Wishes
Positive preferences that bias (never hard-filter) the LLM arrangement layer. Two tiers:
- **Standing preferences** — persistent, shape every plan until changed.
- **Per-week wish** — optional free-text at generation time, honored for that week only
  (e.g. "craving Asian", "use up the zucchini").
Some standing preferences act as soft weekly *targets* (e.g. "fish once a week"), others
as general leans (e.g. "mostly vegetarian").

Seed standing preferences for this Household:
- Mostly vegetarian.
- Prefer chicken over pork.
- Light / healthy meals.
- Avoid Indian / very spicy cuisine.
- Asian cuisine appreciated.
- Owns a large BBQ → grill dishes are viable (pairs with hot-weather bias).
- Include fish ~once a week (soft weekly target).

## Decisions so far
- **Single-family, personal app** — no multi-tenancy, no public sign-up.
- **Covered meals: dinner only**, with weekend lunch optional. Breakfast/snacks unplanned.
- **No planned leftovers / batch-cooking** — every day is a freshly cooked new meal.
  "Fast to cook" is solved per-day via Effort Tiers, not by cooking ahead.
- **Planning is on-demand** ("Plan next week"), no scheduled auto-generation in v1.
- **Recipe source: own Recipe Library.** LLM acts as planner/selector over the Library,
  not as a recipe inventor for plans (it may propose new Recipes to add only on request).
- **Library cold-start: one-time LLM-proposed starter set** (~20–30 family-friendly,
  allergy-aware dinners across effort tiers), each human-confirmed into the Library; then
  grows via manual entry and **Recipe Import** (photos from any source).
- **REWE auto-ordering is a v2 best-effort stretch goal**, not load-bearing. v1 ships a
  first-class, self-sufficient Shopping List (categorized, checkable, exportable). REWE
  has no public ordering API; any automation is fragile and the app must not depend on it.
