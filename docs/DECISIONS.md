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
