# Navigation correction

## Changes
- Keep LoomTrack at the top-left and show only the current breadcrumb beneath it; master pages show `Masters / Page`.
- Add a fifth fixed mobile action, `More`, immediately after Sales; it opens the existing navigation drawer.
- Keep all operational pages top-level, Masters expandable, and omit any Transactions group.
- Preserve the clean Dashboard and all existing page/database behavior.

## Verification
- Run TypeScript checks and inspect the automatic build result.
- Check every navigation destination and confirm signed-out protection.
- Browser-check the mobile More drawer and header positioning if an authenticated session is available.
