# FinCRuM Code Assistant Guide

## Build and Development Commands
- `npm run dev` - Run Next.js dev server with Turbopack (port 9002)
- `npm run electron` - Start Electron app in development mode
- `npm run build` - Build Next.js and Electron
- `npm run start` - Start Next.js app
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Code Style Guidelines
- Use TypeScript for type safety
- Path aliases: Import from `@/*` for src directory
- Component naming: PascalCase for components (e.g., `CustomerForm.tsx`)
- File organization: Features in dedicated directories
- Tailwind CSS with `cn()` utility for class merging
- UI components in `src/components/ui/`
- Error handling: Use try/catch blocks with appropriate logging

## Imports and Architecture
- Import UI components from `@/components/ui`
- Import utilities from `@/lib/utils`
- Use Next.js App Router structure
- Follow React hooks best practices
- Context providers for shared state