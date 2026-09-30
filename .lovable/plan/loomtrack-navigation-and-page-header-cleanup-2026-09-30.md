# LoomTrack navigation and page-header cleanup

## Scope
- Keep the authenticated navigation limited to Dashboard, one expandable Masters group, Reports, and Settings.
- Keep Daily Production, Production Summary, Employee Wages, Income & Expenses, and Sales & Delivery available through clear Dashboard shortcuts and their existing direct URLs.
- Move the current-page breadcrumb into a shared top bar, positioned before the LoomTrack brand without overlap.
- Make the shared page title row sticky, with Add actions aligned on its right; filters remain below it.
- Preserve all forms, queries, validation, database behavior, and numeric IDs.

## Implementation
- Refactor `AppShell` navigation into top-level links plus a controlled Masters group that stays open on master pages and works in both desktop and mobile menus.
- Add a compact shared top bar and responsive breadcrumb derived from the current route.
- Add lightweight operational links on Dashboard so removed transaction links remain discoverable.
- Update the shared `PageHeader` to provide consistent sticky positioning and compact mobile wrapping; existing master, production, payment, and delivery pages inherit it without CRUD rewrites.
- Keep the existing data tables and only add sticky table headers if the existing scroll container supports it safely.

## Verification
- Run the TypeScript check and inspect the latest build result.
- Check all authenticated route URLs for dead links and verify signed-out routing still reaches sign-in.
- Use desktop and mobile browser screenshots to confirm the Masters group, breadcrumb, sticky title/Add row, and compact filters.
