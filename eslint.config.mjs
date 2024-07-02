import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import babelParser from "@babel/eslint-parser";

export default [

    sonarjs.configs.recommended,
    {
        ignores: ["eslint.config.mjs", "node_modules/"],
        languageOptions: {
            globals: {
                ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
                ...globals.node,
            },

            ecmaVersion: 2021,
            parser: babelParser
        },

        rules: {
            "sonarjs/cognitive-complexity": "off",
        },
    },
    eslintConfigPrettier
];