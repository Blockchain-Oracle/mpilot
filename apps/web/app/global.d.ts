// Side-effect import of CSS — required for the root-level `tsc -b` workspace
// build to accept `import './globals.css'` in `app/layout.tsx` (Next.js's own
// type system handles this implicitly at next-dev time; tsc -b doesn't).
declare module '*.css';
