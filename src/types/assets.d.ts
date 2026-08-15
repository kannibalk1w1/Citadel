// Asset imports resolved by Vite at build time.
//
// These live here rather than in `src/renderer/env.d.ts` because that file has a
// top-level import, which makes it a module — and wildcard module declarations
// inside a module are scoped to it rather than global. The copies there were
// inert, which is why importing a cursor was a type error while `npm run
// typecheck` was quietly checking nothing.
declare module '*.cur' {
  const src: string
  export default src
}

declare module '*.mp3' {
  const src: string
  export default src
}
