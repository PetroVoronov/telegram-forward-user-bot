import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";

export default [

    sonarjs.configs.recommended,
    {
        ignores: ["eslint.config.mjs", "node_modules/"],
        languageOptions: {
            globals: {
                ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
                ...globals.node,
            },

            ecmaVersion: "latest",
            sourceType: "commonjs",
        },

        rules: {
            "sonarjs/cognitive-complexity": "off",
        },
    },
    {
        files: ["test/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
    eslintConfigPrettier
];
