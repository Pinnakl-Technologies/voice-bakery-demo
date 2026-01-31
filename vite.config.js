import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);

export default {
  root: join(dirname(path), "client"),
  plugins: [react()],
  server: {
    proxy: {
      "/token": "http://localhost:5001",
      "/session": "http://localhost:5001",
    },
  },
};
