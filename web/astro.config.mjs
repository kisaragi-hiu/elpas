// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";

import react from "@astrojs/react";

export default defineConfig({
  integrations: [
    svelte(),
    react({
      // reload on save breaks without this ¯\_(ツ)_/¯
      experimentalDisableStreaming: true,
    }),
  ],
  vite: {
    clearScreen: false,
    plugins: [tailwindcss()],
  },
});
