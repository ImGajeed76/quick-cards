import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  root: "dev",
  server: {
    port: 3000,
    open: true,
  },
});
