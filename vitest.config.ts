import { getViteConfig } from "astro/config";

/**
 * Vitest is configured through Astro's `getViteConfig` so tests share the same
 * Vite pipeline as the site. This lets component tests import `.astro` files and
 * render them with Astro's Container API (see `src/components/Header.test.ts`),
 * while the existing pure-config tests keep running unchanged.
 */
export default getViteConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
