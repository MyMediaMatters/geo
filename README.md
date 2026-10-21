# @mmm/geo

Answer-engine visibility tracking for My Media Matters advanced SEO clients.

Queries Claude, Perplexity and ChatGPT with the questions a customer would
actually ask, and records whether the client was **mentioned** in the answer and
whether their own domain was **cited** as a source. Results go to Cloudflare D1.

Installed per client site, so the dashboard lives on the client's own domain
under their own login rather than in an agency portal. One implementation, so a
fix lands once instead of five times.

## Install

```bash
npm install @mmm/geo@github:MyMediaMatters/geo#<commit-sha>
```

Pin the commit SHA, not a branch: `#main` re-resolves on every install, so a
client's build can start failing on a change nobody made in that repo.

This package ships **TypeScript source** and is consumed by a bundler, so a
Next.js site must transpile it:

```js
// next.config.mjs
transpilePackages: ['@mmm/geo'],
```

Imports inside the package are extensionless on purpose — webpack does not
resolve a `./types.js` specifier against a `types.ts` file.

## Use

Everything client-specific is the `GeoBrand` and the query set. Nothing else.

```ts
import { ENGINES, extractStructured, type GeoBrand } from '@mmm/geo';

export const brand: GeoBrand = {
  name: 'Example Roofing',
  mention: /example roofing(?:\s+(?:and|&)\s+construction)?\b/i,
  domain: /example-roofing\.com/i,
  kind: 'commercial roofing contractors',
  aliases: ['Example Roofing and Construction'],
};
```

### `kind` is not decoration

It names the client's vertical, and the extraction prompts are built from it.
Without it, a tracker copied from one client to another can keep asking about the
previous client's kind of business, and the output still looks plausible.

Making the vertical a required field means a port cannot silently keep the
previous client's wording.

### Engines fail loudly

`checkClaude`, `checkPerplexity` and `checkOpenAI` **throw** on a bad key or a
non-2xx response. They used to return null, which surfaced as "no mentions
found" — indistinguishable from a real zero result, and the worse of the two
failure modes for a client paying for visibility reporting.

## Schema

`migrations/0001_geo.sql` is the shared D1 schema and ships with the package.

The **query set is not here**. Each client's questions live in that client's own
repo as a later migration, because they are the one piece that is genuinely
per-client and the one piece worth reviewing with them.

## Repo layout

```
src/types.ts     the shapes every client shares, including GeoBrand
src/brand.ts     detect(), makeExcerpt(), dedupe()
src/engines.ts   checkClaude / checkPerplexity / checkOpenAI, and ENGINES
src/extract.ts   extractStructured() — competitors and rank — and sourceDomain()
migrations/      shared D1 schema
```

## Why this is public

It is a runtime dependency of client site builds running on Cloudflare Pages. A
private repo would mean configuring a GitHub token on every client project or
the builds fail. What is here is engine adapters and regex; the client-specific
query sets stay in each client's own repo.
