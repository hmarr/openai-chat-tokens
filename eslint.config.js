import eslint from "@eslint/js"
import prettier from "eslint-config-prettier"
import tseslint from "typescript-eslint"

export default tseslint.config(
	{
		languageOptions: {
			parserOptions: { project: "./tsconfig.eslint.json" },
		},
	},

	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	prettier,

	{
		rules: {
			"@typescript-eslint/class-methods-use-this": [
				"error",
				{
					ignoreClassesThatImplementAnInterface: true,
					ignoreOverrideMethods: true,
				},
			],
			"@typescript-eslint/consistent-type-exports": "error",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ fixStyle: "separate-type-imports" },
			],
			"@typescript-eslint/default-param-last": "error",
			"@typescript-eslint/explicit-member-accessibility": [
				"error",
				{ accessibility: "no-public" },
			],
			"@typescript-eslint/method-signature-style": "error",
			"@typescript-eslint/no-import-type-side-effects": "error",
			"@typescript-eslint/no-unnecessary-qualifier": "error",
			"@typescript-eslint/no-useless-empty-export": "error",
			"@typescript-eslint/prefer-nullish-coalescing": [
				"error",
				{ ignorePrimitives: true },
			],
			"@typescript-eslint/prefer-readonly": "error",
			"@typescript-eslint/prefer-regexp-exec": "error",
			"@typescript-eslint/promise-function-async": [
				"error",
				{ checkArrowFunctions: false },
			],
			"@typescript-eslint/require-array-sort-compare": "error",
			"@typescript-eslint/return-await": "error",
			"@typescript-eslint/sort-type-constituents": "error",
			"@typescript-eslint/switch-exhaustiveness-check": "error",
			"func-style": ["error", "declaration"],
		},
	},
	{
		ignores: [
			".pnpm-store/",
			"dist/",
			"docs/",
			"node_modules/",
			"package-lock.json",
			"pnpm-lock.yaml",
		],
	},
)
