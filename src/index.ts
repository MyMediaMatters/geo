/**
 * @mmm/geo — answer-engine visibility for MMM Advanced SEO clients.
 *
 * Installed per client site so the dashboard lives on the client's own domain
 * under their own login. One implementation, so a fix lands once instead of
 * five times.
 *
 * Client-specific data is the GeoBrand and the query set. Nothing else.
 *
 * Imports here are EXTENSIONLESS on purpose. This package ships TypeScript
 * source and is consumed by a bundler (Next, via `transpilePackages`), not by
 * Node's ESM loader — and webpack does not resolve the `./types.js` form
 * against a `types.ts` file. @mmm/site-checks gets away with `.js` specifiers
 * because it ships real `.js`.
 */
export type { Engine, GeoBrand, GeoCheck, Extraction } from './types';
export { ENGINE_LABELS } from './types';
export { detect, makeExcerpt, dedupe } from './brand';
export { checkClaude, checkPerplexity, checkOpenAI, ENGINES } from './engines';
export { extractStructured, sourceDomain } from './extract';
