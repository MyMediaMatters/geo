import { detect, makeExcerpt, dedupe } from './brand';
import type { Engine, GeoBrand, GeoCheck } from './types';

/**
 * The three answer engines, asked the same question the same way.
 *
 * Each THROWS on a bad key or a bad response rather than returning a null
 * result. That matters: a run where one engine's key had expired must not be
 * recorded as "not mentioned anywhere". A silent zero is indistinguishable from
 * a real zero, and the whole point of this tracker is that the number is
 * trustworthy enough to show a client who is paying for it.
 */
const PROMPT_SUFFIX =
  ' Answer concisely and name the specific businesses you would recommend, with their locations.';

/** Claude — Anthropic Messages API with the basic web-search tool. */
export async function checkClaude(query: string, apiKey: string, brand: GeoBrand): Promise<GeoCheck> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      // Haiku with web search: fast enough to batch a whole query set inside one
      // invocation's budget, and plenty for a mention check.
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
      messages: [{ role: 'user', content: query + PROMPT_SUFFIX }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as { content?: Array<Record<string, unknown>> };
  let answer = '';
  const sources: string[] = [];
  for (const block of data.content ?? []) {
    if (block.type === 'text' && typeof block.text === 'string') answer += block.text + ' ';
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content as Array<Record<string, unknown>>) {
        if (typeof r.url === 'string') sources.push(r.url);
      }
    }
  }
  return finish('claude', answer, sources, brand);
}

/** Perplexity — Sonar, grounded by default. */
export async function checkPerplexity(query: string, apiKey: string, brand: GeoBrand): Promise<GeoCheck> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: query + PROMPT_SUFFIX }] }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
    search_results?: Array<{ url?: string }>;
  };
  const answer = data.choices?.[0]?.message?.content ?? '';
  // Perplexity has returned sources under both keys across API versions; take
  // either rather than silently losing citations when one of them goes away.
  const sources = [
    ...(data.citations ?? []),
    ...((data.search_results ?? []).map((s) => s.url).filter(Boolean) as string[]),
  ];
  return finish('perplexity', answer, sources, brand);
}

/** ChatGPT — a web-search-grounded chat model with url_citation annotations. */
export async function checkOpenAI(query: string, apiKey: string, brand: GeoBrand): Promise<GeoCheck> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      // gpt-4o-search-preview was retired (404 "has been deprecated", Oct 2026).
      // gpt-5-search-api is its successor on the same surface. GPT-5 models take
      // max_completion_tokens, and the search model rejects temperature.
      model: 'gpt-5-search-api',
      max_completion_tokens: 4000,
      messages: [{ role: 'user', content: query + PROMPT_SUFFIX }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string; annotations?: Array<{ type?: string; url_citation?: { url?: string } }> };
    }>;
  };
  const msg = data.choices?.[0]?.message ?? {};
  const sources = (msg.annotations ?? [])
    .filter((a) => a.type === 'url_citation')
    .map((a) => a.url_citation?.url)
    .filter((u): u is string => !!u);
  return finish('openai', msg.content ?? '', sources, brand);
}

/** One place where a raw answer becomes a recorded check. */
function finish(engine: Engine, answer: string, sources: string[], brand: GeoBrand): GeoCheck {
  return {
    engine,
    ...detect(answer, sources, brand),
    excerpt: makeExcerpt(answer, brand),
    sources: dedupe(sources),
    answer: answer.trim(),
  };
}

export const ENGINES: Record<Engine, (q: string, key: string, brand: GeoBrand) => Promise<GeoCheck>> = {
  claude: checkClaude,
  perplexity: checkPerplexity,
  openai: checkOpenAI,
};
