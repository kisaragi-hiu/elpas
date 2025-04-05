// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import solidJs from "@astrojs/solid-js";

export default defineConfig({
  integrations: [react(), solidJs()],
  vite: {
    clearScreen: false,
    plugins: [tailwindcss()],
  },
});
