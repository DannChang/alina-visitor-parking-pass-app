# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains App Router pages and API routes, split into `(public)`, `(auth)`, `(dashboard)`, and `(resident)`.
- `src/components/` holds feature UI; `src/components/ui/` contains shared `shadcn/ui` primitives.
- Keep business logic in `src/services/`, shared helpers in `src/lib/`, locales in `src/i18n/`, and translations in `src/messages/`.
- Database code lives in `prisma/`, static assets in `public/`, E2E tests in `e2e/`, and test utilities in `src/test/`.
- Treat `.next/`, `coverage/`, `playwright-report/`, and `test-results/` as generated output.

## Build, Test, and Development Commands
- Use Node `20.x` with `pnpm`.
- `pnpm dev` starts the app at `http://localhost:3000`.
- `pnpm build` generates Prisma client and builds production assets.
- `pnpm lint`, `pnpm type-check`, and `pnpm format:check` run quality checks.
- `pnpm test`, `pnpm test:coverage`, and `pnpm test:e2e` run Vitest and Playwright suites.
- `pnpm validate` runs the standard pre-PR checks.
- `pnpm db:push` and `pnpm db:seed` sync the schema and seed local data.

## Coding Style & Naming Conventions
- Use TypeScript with 2-space indentation, semicolons, single quotes, trailing commas, and 100-character lines.
- Import from `src/` with `@/`.
- Use `PascalCase` for components, `useCamelCase` for hooks, and lowercase route folder names.
- Avoid `any`; prefix intentionally unused variables with `_`.
- Run `pnpm lint:fix` and `pnpm format` before large submissions.

## Testing Guidelines
- Name tests `*.test.ts` or `*.test.tsx` under `src/`, usually beside the code or in `__tests__/`.
- Keep browser workflows in `e2e/*.spec.ts`.
- Vitest coverage thresholds are 80% statements/functions/lines and 75% branches.
- Prefer targeted tests for changed services, utils, and API routes before the full suite.

## Commit & Pull Request Guidelines
- Follow Conventional Commits used in history: `feat: ...`, `fix: ...`, `feat(scope): ...`.
- Keep commits focused; include related Prisma or seed updates with the feature that needs them.
- PRs should include a short summary, linked issue/task, validation notes, and screenshots for UI or responsive changes.
- Call out env, Prisma, auth, or mobile behavior changes, and update `README.md` or `SETUP.md` when setup steps change.

## Configuration & Security Tips
- Start from `.env.example` or `.env.test.example`; never commit secrets.
- When editing `prisma/schema.prisma`, regenerate the client and note migration or seed impact in the PR.
