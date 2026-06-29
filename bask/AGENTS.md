# Project Agent Instructions

Linear is the source of truth for planned, deferred, and completed app work.

## Testing

Run weather logic tests before building in Xcode to catch calculation/messaging bugs early:

```bash
npm test             # green gate (pre-Xcode check) — includes former triage cases
npm run test:watch   # watch mode for iterative development
npm run test:all     # full suite
```

Tests live in `tests/` and cover the pure weather/vitamin-D logic in `lib/`.
Bugs previously caught by the test suite were documented in `tests/TRIAGE.md`;
all have been resolved and their assertions promoted into the green gate.
