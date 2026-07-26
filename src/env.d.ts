/// <reference types="astro/client" />

/**
 * Ambient declaration for `.astro` single-file components.
 *
 * Astro type-checks `.astro` files with `astro check`, but plain `tsc` (run in
 * `npm run typecheck`) has no built-in knowledge of the `*.astro` module shape.
 * Component tests import `.astro` files as `.ts` modules and render them through
 * the Container API, whose `renderToString` expects an `AstroComponentFactory`;
 * declaring the default export as exactly that keeps those imports type-safe.
 */
declare module "*.astro" {
  const Component: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default Component;
}
