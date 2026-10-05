import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "jsx-a11y/label-has-associated-control": ["error", { assert: "either", depth: 4 }],
      "react-hooks/exhaustive-deps": "warn",
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Never inject HTML." },
      ],
    },
  },
  { files: ["e2e/**"], rules: { "react-hooks/rules-of-hooks": "off" } },
  { files: ["**/*.mjs", "scripts/**"], languageOptions: { globals: { process: "readonly", console: "readonly" } } },
);
