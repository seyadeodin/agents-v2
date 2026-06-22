import React from "react";
import { render } from "ink";
import { App } from "./ui/index.tsx";
import { loadEnvFile } from "node:process";
import { join } from "node:path";
try {
  loadEnvFile(join(import.meta.dirname, ".env"));
} catch {}
render(React.createElement(App));
