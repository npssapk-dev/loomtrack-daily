# LoomTrack Masters workspace and navigation cleanup

## Changes
- Replace the expandable master submenu with one direct `Masters` link.
- Restore direct navigation links for Daily Production, Production Summary, Employee Wages, Income & Expenses, and Sales & Delivery; do not add a Transactions group.
- Add `/masters` as a lightweight workspace linking to the five existing CRUD pages without duplicating their forms or data logic.
- Keep direct master URLs working and show `Masters / <name>` breadcrumbs there; `/masters` shows `Masters`.
- Retain the shared compact sticky title/action row so existing Add buttons stay right-aligned above filters.

## Verification
- Run TypeScript/build checks and inspect preview errors.
- Check `/masters`, all direct master URLs, Dashboard, Daily Production, Payments, and Sales & Delivery.
- Verify navigation links, breadcrumb labels, and narrow-screen layout without changing application data.
