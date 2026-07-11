# URL Shortener — Learning & Build Plan
### Stack: Node.js + Express | Level: knows CRUD basics

This plan is split into **Days**, not hours — go at your own pace, but each Day is designed to be doable in one sitting (2-4 hrs). Each Day has three parts:
- **Learn** — the concept you need before writing code (I'll explain it in chat when you get there)
- **Build** — what you actually implement
- **Checkpoint** — a question you should be able to answer out loud before moving on. If you can't, that's the signal to come back and ask me, not to skip ahead.

Don't skip the "Learn" sections even if you want to jump to code — the whole point of this project is to be able to *explain* the decisions, not just have working code.

---

## Day 0 — Planning & Setup (no code yet)

**Learn:**
- What a URL shortener actually does at the HTTP level: it's just a **redirect service**. When someone hits `short.ly/abc123`, the server responds with an HTTP 301 or 302 status and a `Location` header pointing to the real URL. The browser does the rest.
- 301 (permanent) vs 302 (temporary) redirect — and why this choice actually matters for analytics (hint: browsers *cache* 301s, so your server might stop seeing repeat clicks).

**Build:**
- `mkdir url-shortener && cd url-shortener && npm init -y`
- `npm install express`
- Create `server.js`, get a "Hello World" Express server running on `localhost:3000`

**Checkpoint:** Can you explain, without looking it up, why using a 301 redirect could quietly break your click-counting feature?

---

## Day 1 — Database Design

**Learn:**
- Why this project needs exactly **one core table** and why resisting the urge to over-normalize matters here
- Indexing basics: why `short_code` needs a unique index (you'll be looking it up on *every single redirect* — this is your highest-traffic query by far)

**Build:**
- Set up PostgreSQL (or use Supabase for a hosted option — no local install needed)
- Create the schema:
```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  original_url TEXT NOT NULL,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Connect Express to Postgres (`pg` npm package) and confirm you can insert/query a row manually

**Checkpoint:** Why does `short_code` need a UNIQUE constraint at the database level, instead of just checking for duplicates in your application code before inserting?

---

## Day 2 — The Core Design Decision: Encoding

**Learn (this is THE interview question for this whole project):**
- Three approaches to generating a short code, and the tradeoff of each:
  1. **Base62 encode the auto-increment ID** (0-9, a-z, A-Z) — deterministic, no collisions possible, but sequential/guessable (someone can enumerate all your URLs)
  2. **Random string generation** — generate 6-7 random chars, check DB for collision, retry if taken — unpredictable, but needs a retry loop
  3. **Hash-based (MD5/SHA-256, truncated)** — same URL always produces the same code (idempotent), but truncating a hash reintroduces collision risk you have to handle anyway
- We'll build **Option 1 (Base62 of the ID)** first because it's simplest and collision-free by construction, then I'll show you how Option 2 would change the code, so you can speak to both in an interview.

**Build:**
- Write a `base62Encode(id)` function from scratch (don't npm install this — writing it yourself is the point)
- Test it: encode ids 1, 62, 1000, confirm the output looks like short alphanumeric codes

**Checkpoint:** If two people shorten the exact same long URL, should they get the same short code or different ones? Defend your answer — there's no single right answer, but you should be able to argue it.

---

## Day 3 — Core API: Shorten Endpoint

**Learn:**
- Input validation for URLs — what actually counts as "invalid" (missing protocol, malformed, non-http(s) schemes like `javascript:`) and why validating this matters for security, not just correctness

**Build:**
- `POST /api/shorten` — takes `{ "url": "..." }`, inserts into DB, gets back the new row's `id`, runs it through your `base62Encode`, updates the row with the `short_code`, returns `{ shortUrl: "http://localhost:3000/abc123" }`
- Add basic validation: reject if not a valid URL (use Node's built-in `URL` class to validate, don't write your own regex)

**Checkpoint:** Why do you insert the row *first* and encode the ID *after*, rather than generating the code before knowing the ID?

---

## Day 4 — The Redirect Endpoint

**Learn:**
- Why this endpoint is the one that needs to be **fast** above all else — every design decision downstream (caching, indexing) exists to serve this one code path
- Where caching (Redis) would go in this flow, even if you don't build it yet — this is a great thing to mention as a "future improvement" in a demo

**Build:**
- `GET /:shortCode` — look up `short_code` in DB, if found: increment `clicks`, redirect (302) to `original_url`; if not found: return 404
- Test it manually: shorten a URL, then visit the short link in your browser and confirm it redirects

**Checkpoint:** Right now, every redirect does a DB read AND a DB write (the click increment). Why might that write slow things down under heavy traffic, and what's one way you could avoid writing on every single click (hint: batching)?

---

## Day 5 — Basic Analytics

**Learn:**
- The difference between a **counter** (simple, cheap) and an **event log** (detailed, more storage, enables richer analytics later) — and why starting with a counter and adding a log table later is the right build order, not the reverse

**Build:**
- `GET /api/stats/:shortCode` — returns `{ originalUrl, shortCode, clicks, createdAt }`
- (Optional stretch) add a `clicks` log table `(short_code, timestamp, referrer)` if you want a clicks-over-time chart later

**Checkpoint:** What's one piece of information you're NOT tracking right now that a real analytics product (like Bitly) would? Name it and explain what table/column you'd add.

---

## Day 6 — Frontend

**Learn:**
- Nothing new conceptually here — this is where you apply React (or plain HTML/JS) to consume the API you already built. The lesson is: **build backend-first, frontend is just a client of your API.**

**Build:**
- Simple form: paste URL → button → shows the short link + a copy button
- A list/table of previously shortened URLs with their click counts
- (Optional) a simple bar/line chart of clicks if you built the log table

**Checkpoint:** N/A — this is where things start looking like a real product. Get it working end-to-end.

---

## Day 7 — Edge Cases & Testing

**Learn:**
- Why "edge cases" in system design interviews are really just: *what happens when your assumptions break?*

**Build & test manually:**
- Shortening the same URL twice — what happens? (decide and implement your answer from Day 2's checkpoint)
- Submitting a malformed URL
- Hitting a short code that doesn't exist
- What happens if two requests try to shorten URLs at the exact same millisecond — could your ID-based encoding ever produce a collision? (answer: no, because Postgres SERIAL guarantees uniqueness — but be ready to explain *why* that's true)

**Checkpoint:** Walk through your own code and find one place it would break under bad input. Fix it.

---

## Day 8 — Deployment

**Learn:**
- Environment variables and why your DB connection string should never be hardcoded
- The basics of what "serverless" (Vercel) vs "long-running server" (Render/Railway) means for this kind of app, and why a redirect service is arguably a slightly awkward fit for serverless (cold starts add latency to *every* redirect)

**Build:**
- Deploy backend to Render or Railway
- Deploy frontend to Vercel
- Set up environment variables for the DB connection in each platform's dashboard
- Test the live URL end-to-end

**Checkpoint:** You're done. Can you give a 60-second verbal walkthrough of your system, from "user pastes a URL" to "someone else clicks the short link"? If yes, you're ready to demo or explain this in an interview.

---

## Stretch Goals (only if Day 0-8 is solid and you have time left)
- QR code generation for each short link (`qrcode` npm package — very demo-friendly)
- Custom aliases (`short.ly/my-custom-name`) — forces you to handle the collision case for real
- Rate limiting per IP (prevents abuse — good talking point about system robustness)
- Redis caching layer for hot redirects — the natural "how would you scale this" answer

---

## How to use this plan with me going forward
When you're ready for a given day, just say **"Day X"** and I'll walk you through the concept in more depth and help you write/debug the actual code for that step — rather than me dumping all the code upfront now. That way you're building understanding, not just copy-pasting.
