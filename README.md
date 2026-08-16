# Mīzān

A halal income tracker and zakat calculator, built for the NICC Niagara Muslim Hackathon.

Enter what you earned and what you hold. Mīzān sorts your income into halal, haram, mixed, uncertain
and missing-information, then calculates zakat using the rules of the one madhhab you pick, showing
every step and where it comes from.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Setup asks six short questions about what you hold and gives you a
figure in about a minute. There is no sample data to clear out — you enter your own from the start.

Nothing else is required. There is no database, no account, and no API key needed to run the whole
app; the classifier falls back to its rule table alone.

## Adding income

Income is added one source at a time. You pick what kind it was — wages, your own business, rent,
an investment, a gift, a benefit, bank interest — and that answer tells the engine which rules apply,
so it rarely has to ask anything else. Most sources take four taps and settle immediately.

A bank CSV import is there too, for people who would rather not type. That path goes through the
rule table, and anything the rules cannot read lands in Review, one card at a time.

## The two ideas worth knowing

**Zakat is not a tax on income.** It is 2.5% of qualifying wealth held for a lunar year. So income
tracking feeds two separate figures: the *zakat* owed on your wealth, and the *purification* owed on
anything unlawful that came in. Unlawful income is excluded from the zakat base entirely rather than
being zakated, and it is given away in full, separately. Most calculators merge these.

**The AI classifies the world; the rule engine classifies the fiqh.** The model never returns a
ruling. It returns facts — what kind of transaction this is, what industry the counterparty is in,
whether interest is involved — and a hand-written rule table in `src/lib/classify/rules.ts` turns
those facts into a verdict with a citation attached. Every verdict in the app traces to a rule ID and
a named source.

## Optional: model-assisted classification

Deterministic rules settle most rows on their own. For descriptions they cannot read, set a key:

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
```

Only the normalized merchant string is sent — `normalize()` has already stripped digits, dates and
reference numbers, so no amount, date or account number leaves the browser. Settings has a
**rules only, no network** switch that disables it entirely.

## Where things live

```
src/lib/fiqh/
  fiqh-references.ts    every ruling's source, with a `verified` flag
  madhhab-profiles.ts   the four schools encoded as data
  zakat-engine.ts       pure function, returns a full explanation trace
src/lib/classify/
  rules.ts              the hand-written rule table
  engine.ts             rules → confidence gate → model facts → fiqh mapping
  learned-rules.ts      answers become rules, so you are never asked twice
tests/                  67 tests over the engine, the rules and CSV import
```

## Tests

```bash
npx vitest run
```

The scenario matrix covers all four madhāhib against below-nisab, silver-only, jewellery-heavy,
debt-heavy, trade-goods and broken-hawl cases, and asserts the explanation trace as well as the
total.

## Scholarly review

`src/lib/fiqh/fiqh-references.ts` marks each ruling `verified: true` only where it rests on an
explicit primary text agreed across the four schools. School-specific juristic positions are
`verified: false` and render with an **awaiting scholarly review** badge everywhere they appear, and
are listed together at the bottom of Settings.

**These need a qualified reviewer before the app presents them as settled.**

## Deploy

Push to a repo and import it on Vercel. Set `ANTHROPIC_API_KEY` in the project's environment
variables if you want model-assisted classification; everything else works without it.
