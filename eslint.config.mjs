import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Reviewed: these flag intentional patterns (resetting state on account change,
    // reading saved settings after mount) and loose typing. Kept visible as warnings.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  { files: ["tests/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  { ignores: [".next/**", "node_modules/**", "vendor/**", "next-env.d.ts"] },
];

export default config;
