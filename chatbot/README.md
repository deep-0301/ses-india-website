# AI chat assistant

A live AI chat on every page. Visitors ask questions in their own words and get real answers from Claude, based on what the company's website says. It is not a fixed FAQ.

```
Visitor's browser                 Cloudflare Worker (free plan)            Anthropic API
chatbot/widget/ai-chat.js  --->   chatbot/server  (holds the API key,  ---> Claude
  (chat button + panel)    <---   adds knowledge.md, streams reply)  <---
```

The API key lives only in the Worker's secrets. The website never sees it.

| Path | What it is |
| --- | --- |
| `widget/ai-chat.js` | The chat button and panel. One file, no dependencies. Configured with `data-` attributes on its `<script>` tag. |
| `server/src/index.js` | The proxy. Checks the website's origin, rate-limits by visitor IP, calls Claude and streams the answer. |
| `server/knowledge.md` | Everything the assistant knows about the company. Edit this to change its answers. |
| `server/wrangler.toml` | Worker name, allowed websites, model and rate limit. |

## Go live (about 10 minutes)

You need an Anthropic API key from https://platform.claude.com/ (Settings > API keys, with billing set up) and a free Cloudflare account.

```bash
cd chatbot/server
npm install
npx wrangler login                          # opens the browser once
npx wrangler secret put ANTHROPIC_API_KEY   # paste the key when asked
npx wrangler deploy
```

`deploy` prints the Worker's address, for example `https://safal-ai-chat.<your-account>.workers.dev`. Put that address in `data-endpoint` on the chat `<script>` tag in `index.html`, `about/index.html`, `contact/index.html` and `404.html`, then push. The chat button stays hidden until `data-endpoint` is filled in, so the site is safe to publish before this step.

Set a monthly spend limit for the key in the Anthropic Console (Settings > Limits) so a busy month can't surprise you.

## Common edits

- **What the assistant knows:** edit `server/knowledge.md`, then `npx wrangler deploy`. Keep it to facts the business is happy to share. When a fact is missing, the assistant says it doesn't know and points to sales instead of guessing.
- **Greeting, suggested questions, colours, name, position:** the `data-` attributes on the `<script>` tag in each page. `data-suggestions` separates questions with `|`. `data-bottom` and `data-right` move the button (it sits above the WhatsApp button here). After changing `ai-chat.js`, bump `?v=` in the tags.
- **Which websites may use the chat:** `ALLOWED_ORIGINS` in `wrangler.toml`. Requests from any other site are refused.
- **Model and cost:** `MODEL` and `EFFORT` in `wrangler.toml`. The default is `claude-opus-5-5` at `low` effort for quick, high quality chat answers. `claude-haiku-5-5` is far cheaper per message if cost matters more than depth.
- **Rate limit:** `[[ratelimits]]` in `wrangler.toml` (20 messages a minute per visitor IP).
- **Logs:** Cloudflare dashboard > Workers > safal-ai-chat > Logs. Conversations are not stored anywhere; the visitor's browser keeps the chat only for the current tab session.

## Test locally

```bash
cd chatbot/server
printf 'ANTHROPIC_API_KEY=sk-ant-...\nALLOWED_ORIGINS=http://localhost:8000\n' > .dev.vars
npx wrangler dev --port 8787
# in another terminal, from the repo root:
python3 -m http.server 8000
```

Then set `data-endpoint="http://localhost:8787"` in a page (do not commit that), and open http://localhost:8000.

## Reuse for another client

This folder is a template. For a new business:

1. Copy `chatbot/` into their site.
2. Rewrite `server/knowledge.md` from their website (services, products, contact details, what not to guess).
3. In `server/wrangler.toml`, change `name`, `BUSINESS_NAME` and `ALLOWED_ORIGINS`.
4. Deploy with their own API key (or yours, billed back), then add the `<script>` tag with their colours, greeting and suggestions.
