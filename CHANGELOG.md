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

## [Unreleased]

- Implemented GET /:shortCode redirect endpoint with async click counting

## [Unreleased]

- Implemented GET /api/stats/:shortCode endpoint
- Created clicks table (FK to urls) for future time-series analytics

## [Unreleased]

- Added ip_address column to clicks table
- Wired up click event logging (short_code, ip_address, timestamp) on every redirect
- Set trust proxy for correct client IP behind future deployment proxy

## [Unreleased]

- Built static frontend (form, result display, links table with live click counts)

## [Unreleased]

- Tested and documented edge cases: duplicates, malformed input, missing fields, 404s, concurrency, injection safety

## [Unreleased]

- Added duplicate URL detection — returns existing short_code instead of creating a new row
