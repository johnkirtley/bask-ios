# Project Agent Instructions

## Backlog Maintenance Hook

`APP_BACKLOG.md` is the running source of truth for planned, deferred, and completed app work.

Whenever a plan is finalized, approved, or materially changed:

1. Update `APP_BACKLOG.md` in the same turn.
2. Add new actionable items to `Open` or `Later`.
3. Place new items according to priority relative to existing items.
4. Update existing items if the plan changes instead of creating duplicates.
5. Update the `Last updated` date.

Whenever a task from `APP_BACKLOG.md` is implemented:

1. Update the item status while work is in progress if the work spans multiple turns.
2. When the task is complete and validated, move it to `Completed`.
3. Include the completion date in `YYYY-MM-DD` format.
4. Add a short completion note describing what changed and how it was validated.
5. Before the final response, ask whether the user wants to use `$audit-ios-app-review` to check the recent changes for iOS App Review submission risk. Do not run the skill automatically.
6. Update the `Last updated` date.

Completion means the requested implementation is done in the working tree and the relevant verification has been run or explicitly documented as not run. Do not move partially implemented work to `Completed`.

When finishing a response after planning or implementation work, mention whether `APP_BACKLOG.md` was updated.
