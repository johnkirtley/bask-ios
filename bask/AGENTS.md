# Project Agent Instructions

Linear is the source of truth for planned, deferred, and completed app work.

## Testing

Run weather logic tests before building in Xcode to catch calculation/messaging bugs early:

```bash
npm test             # green gate (pre-Xcode check) — excludes triage
npm run test:watch   # watch mode for iterative development
npm run test:triage  # known bugs (3 failing tests documenting unfixed issues)
npm run test:all     # everything including triage
```

Tests live in `tests/` and cover the pure weather/vitamin-D logic in `lib/`. Known bugs
discovered by tests are documented in `tests/TRIAGE.md`. The triage tests live in
`tests/triage/` and are excluded from the normal `npm test` green gate.
