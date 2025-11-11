import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
// CODPATCH: eslint — import plugin for case-sensitive unresolved
import importPlugin from "eslint-plugin-import";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // CODPATCH: enable import/no-unresolved with case sensitivity
  {
    plugins: { import: importPlugin },
    rules: {
      "import/no-unresolved": ["error", { commonjs: true, caseSensitive: true }],
    },
    settings: { "import/resolver": { typescript: { alwaysTryTypes: true } } },
  },
];

export default eslintConfig;
