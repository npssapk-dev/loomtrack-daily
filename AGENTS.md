<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- All app code imports `supabase` from `src/lib/backend.ts`, never the generated client directly — it switches to the external LoomTrack project when VITE_EXTERNAL_SUPABASE_URL/_ANON_KEY are set.
- Business tenancy: `_authenticated/route.tsx` gates on `business_users` membership (none -> /onboarding, which calls the external `register_business` RPC); every business query filters by the current `business_id` — prevents cross-business access.
- Income & Expenses is one /payments screen reading/writing `payments`, filtered by `payment_types.direction`; legacy `income_entries`/`expenses` are never queried — single transaction table.
- Core tables use a BIGINT `id` (10000+, DB sequence) as both key and display ID; inserts omit id; auth user ids stay UUID — matches the external schema.
- Authenticated navigation keeps every operational page top-level, Masters expandable, and no Transactions group; mobile fixes Home, Production, Income & Exp, and Sales to the bottom bar.
