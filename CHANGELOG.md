# Changelog

## [Unreleased]

- Project initialized

## [Unreleased]

- Connected Express to Supabase Postgres
- Created `urls` table with unique index on short_code

## [Unreleased]

- Connected Express to Supabase Postgres via connection pooler
- Created urls table with unique index on short_code
- Enabled RLS with deny-all policy (REST API layer)

## [Unreleased]

- Implemented Base62 encoding utility for short code generation

## [Unreleased]

- Implemented POST /api/shorten endpoint with URL validation
- Fixed routing/middleware/scoping bugs (see debugging log)
