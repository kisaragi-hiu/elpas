// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vue from "@astrojs/vue";

import svelte from "@astrojs/svelte";

export default defineConfig({
  integrations: [vue(), svelte()],
  vite: {
    clearScreen: false,
    plugins: [tailwindcss()],
  },
});