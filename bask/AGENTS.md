# Project Agent Instructions

Linear is the source of truth for planned, deferred, and completed app work.

## Testing

Run weather logic tests before building in Xcode to catch calculation/messaging bugs early:

```bash
npm test           # run all tests once (~250ms)
npm run test:watch # watch mode for iterative development
```

Tests live in `tests/` and cover the pure weather/vitamin-D logic in `lib/`. Known bugs
discovered by tests are documented in `tests/TRIAGE.md`. Failing tests with `TRIAGE:` in
their name are intentional — they assert correct behavior the code doesn't yet produce.
