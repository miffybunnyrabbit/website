// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

/**
 * Dev-only integration that mounts the VD-106 style guide at /dev/style-guide.
 *
 * The route is injected only while `astro dev` runs (`command === "dev"`), so
 * `astro build` never emits it — the guide is a development acceptance surface,
 * not shippable content, and stays out of the static `dist/`. Its entrypoint
 * lives under src/dev/ rather than src/pages/ so nothing else routes it either.
 *
 * @type {() => import('astro').AstroIntegration}
 */
function devStyleGuide() {
  return {
    name: "dev-style-guide",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        if (command !== "dev") return;
        injectRoute({
          pattern: "/dev/style-guide",
          entrypoint: "./src/dev/style-guide.astro",
        });
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://www.helixcollective.com",
  integrations: [react(), devStyleGuide()],
});
