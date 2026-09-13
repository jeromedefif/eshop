# Code quality rollout

Run `npm ci`, `npx prisma generate`, `npm run typecheck` and `npm run lint:ci`.
The GitHub workflow performs these checks on pull requests and pushes to main.
It needs no production credentials and runs no migrations or deployment commands.

This first stage reports failures but does not gate Vercel deployments. Neither
branch protection nor next.config.js build validation is changed. Enable a required
check only after observing successful CI runs and reviewing remaining warnings.

TypeScript covers the Next.js application. supabase/functions contains a separate
Deno runtime with URL imports and requires separate Deno checks; it is intentionally
not included in the Next.js tsconfig. No Edge Function was modified or deployed.

Two existing exhaustive-deps warnings remain in AuthContext.tsx and app/page.tsx.
They remain visible, not suppressed. Changing authentication initialization effect
lifetimes needs dedicated login, logout and password recovery regression tests.
