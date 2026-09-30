import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local report/OCR output and browser artifacts, never product source or tests.
    "writing-output/**",
    "paper_rewriting_output/**",
    "public/reports/**",
    "raw/**",
    "playwright-report/**",
    "test-results/**",
    ".playwright/**",
    ".cache/**",
    "edge-profile/**",
    "edge-*-profile/**",
    "playwright-profile*/**",
    "browser-profile*/**",
  ]),
]);

export default eslintConfig;
