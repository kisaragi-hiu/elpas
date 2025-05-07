// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  vite: {
    clearScreen: false,
    plugins: [tailwindcss()],
    // build: { minify: false },
  },
});
