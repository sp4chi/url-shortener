# Design Decisions

## Format for each entry:

### Database Choice

- **Chosen:** Supabase (hosted PostgreSQL)
- **Rejected:** Local Postgres install, MongoDB
- **Context:** Relational structure fits a single well-defined table with a uniqueness constraint. Hosted removes local setup risk during hackathon time pressure. Postgres over MongoDB because there's no schema flexibility need here — one fixed shape, no nested/variable documents.

### Row Level Security

- **Chosen:** Enabled RLS on `urls` table with no policies (deny-all via anon/authenticated keys)
- **Rejected:** Leaving RLS disabled
- **Context:** App connects via direct `pg` connection string (service-level access), not Supabase's REST API/client SDK. RLS only gates the REST API layer, so enabling it with no policies closes off an unintended public access path without affecting our own backend.

### DB Connection Method

- **Chosen:** Supabase connection session pooler (PgBouncer, transaction mode, port 6543)
- **Rejected:** Direct connection (port 5432)
- **Context:** Direct connection host resolved only over IPv6, which failed on local network (DNS ENOTFOUND). Pooler also better suited for many short-lived connections, which matches expected traffic pattern of a redirect-heavy service.

### Short Code Generation

- **Chosen:** Base62 encoding of the auto-incrementing DB id (SERIAL)
- **Rejected:** Random string + collision retry; hash-based truncation
- **Context:** Collision-proof by construction since it's a 1-to-1 mapping of an already-unique value. No extra DB round-trip needed to check for existing codes before insert. Known tradeoff: sequential ids make links enumerable/guessable — acceptable for this project's scope, would reconsider for a production system needing unguessable links.

### Debugging Log — Day 3

- Fixed: route registered as GET instead of POST (caused "Cannot POST" 404)
- Fixed: missing express.json() middleware (req.body was undefined)
- Fixed: variable shadowing in validate() — const url reassigned inside its own scope (TDZ error)
- Fixed: protocol check missing trailing colon (url.protocol returns 'http:' not 'http')
- Fixed: import/export case mismatch (base62encode vs base62Encode)

### Redirect Status Code

- **Chosen:** 302 (temporary redirect)
- **Rejected:** 301 (permanent redirect)
- **Context:** 301 responses get cached by browsers, meaning repeat clicks might skip our server entirely — silently undercounting clicks. 302 guarantees every click reaches our server for accurate analytics.

### Click Counting: Fire-and-Forget Write

- **Chosen:** Redirect immediately, update click count asynchronously without awaiting it
- **Context:** The redirect endpoint is the highest-traffic path in the system. Prioritizing redirect latency over instant click-count accuracy is the right tradeoff — a slightly delayed count is harmless, a slow redirect is not.

### Redirect vs Click-Count Ordering

- **Chosen:** res.redirect() called before the click-count UPDATE query, both non-blocking
- **Context:** Since the UPDATE isn't awaited, ordering doesn't affect actual latency — but placing redirect first matches the endpoint's real priority (respond fast) over its side effect (log the click). Known tradeoff: an in-flight click count update could theoretically be lost if the process crashes mid-write; considered acceptable since exact click-count precision isn't a core requirement.

### Analytics: Counter vs Event Log

- **Chosen:** Simple `clicks` counter column for now; `clicks` log table created but unused until prediction feature (Day 9)
- **Context:** Current requirement is only "show total clicks," which a counter satisfies cheaply. A full event log is unnecessary complexity until time-series data is actually needed (for forecasting). Table created early with a foreign key to `urls(short_code)` to enforce referential integrity from the start, even though writes to it haven't been implemented yet.
