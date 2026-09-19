import type { Extraction, GeoBrand } from './types';

/**
 * Turn an answer into the ordered list of businesses it recommended, plus where
 * the brand placed in that list.
 *
 * Mention alone says a company exists. Rank says whether anyone would call them
 * first, and the competitor list says who gets called instead — which is the
 * part a client actually reacts to.
 *
 * THE VERTICAL COMES FROM `brand.kind`, NOT FROM THIS FILE. The version this
 * replaces had it hardcoded, and American Roofing inherited a prompt asking for
 * "businesses / med spas / practices" from the med-spa client it was copied
 * from. It ran that way in production. The output still looked like a list of
 * businesses, so nothing ever flagged it.
 */
export async function extractStructured(
  answer: string,
  apiKey: string,
  brand: GeoBrand
): Promise<Extraction> {
  if (!answer || answer.trim().length < 12) return { competitors: [], rank: null };

  const names = [brand.name, ...(brand.aliases ?? [])];
  const alsoCalled = names.length > 1 ? ` (also ${names.slice(1).map((n) => `"${n}"`).join(', ')})` : '';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        // Haiku, no web search — this reads text we already have.
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system:
          'You extract structured data from an AI answer that recommends local businesses. Reply with ONLY a JSON object — no prose, no markdown.',
        messages: [
          {
            role: 'user',
            content:
              `From the answer below, list the specific ${brand.kind} it recommends, in the order they appear ` +
              `(proper names only, deduplicated). Then give the 1-based rank of "${brand.name}"${alsoCalled} ` +
              `within that ordered list, or null if it is not recommended.\n\n` +
              `ANSWER:\n${answer.slice(0, 4000)}\n\n` +
              `Return ONLY: {"businesses": ["Name 1","Name 2"], "brand_rank": <number or null>}`,
          },
        ],
      }),
    });
    if (!res.ok) return { competitors: [], rank: null };

    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { competitors: [], rank: null };

    const parsed = JSON.parse(m[0]) as { businesses?: unknown; brand_rank?: unknown };
    const businesses = Array.isArray(parsed.businesses)
      ? parsed.businesses.filter((b): b is string => typeof b === 'string')
      : [];
    // The brand is not its own competitor.
    const competitors = businesses.filter((b) => !brand.mention.test(b));
    const rank =
      typeof parsed.brand_rank === 'number' && parsed.brand_rank > 0 ? parsed.brand_rank : null;
    return { competitors, rank };
  } catch {
    // Extraction is an enrichment, not the measurement. A failure here must not
    // lose the mention/cited result the caller already has.
    return { competitors: [], rank: null };
  }
}

export function sourceDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
