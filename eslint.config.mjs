import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Physical-direction Tailwind classes break right-to-left layouts; use the
// logical ones (ms-/me-/ps-/pe-/start-/end-/text-start/border-s/rounded-s...).
const PHYSICAL_CLASS =
  /(^|\s|:)(-?m[lr]|p[lr]|-?left|-?right|border-[lr]|rounded-[lr]|rounded-[tb][lr]|text-left|text-right|float-left|float-right|scroll-[mp][lr])(-|\s|$)/;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react's version auto-detect calls an API removed in ESLint 10.
    settings: { react: { version: "19.3" } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "next/font/google", message: "No Google hosts: self-host fonts (must work in mainland China)." }] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=${PHYSICAL_CLASS}]`,
          message: "Use logical Tailwind classes (ms-/me-/ps-/pe-/start-/end-/text-start...), not left/right ones.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
