# `@coderabbitai/openai-chat-tokens`

[![GitHub Pages](https://github.com/coderabbitai/openai-chat-tokens/actions/workflows/github-pages.yaml/badge.svg)](https://github.com/coderabbitai/openai-chat-tokens/actions/workflows/github-pages.yaml) [![Node.js CI](https://github.com/coderabbitai/openai-chat-tokens/actions/workflows/node.js.yaml/badge.svg)](https://github.com/coderabbitai/openai-chat-tokens/actions/workflows/node.js.yaml) [![GitHub Downloads](https://img.shields.io/github/downloads/coderabbitai/openai-chat-tokens/total?logo=github)](https://github.com/coderabbitai/openai-chat-tokens/releases) [![NPM Downloads](https://img.shields.io/npm/dt/%40coderabbitai/openai-chat-tokens?logo=npm)](https://www.npmjs.com/package/@coderabbitai/openai-chat-tokens)

A TypeScript / JavaScript library for estimating the number of tokens an OpenAI chat completion request will use.

Estimating token usage for chat completions isn't quite as easy as it sounds.

For regular chat messages, you need to consider how the messages are formatted by OpenAI when they're provided to the model, as they don't simply dump the JSON messages they receive via the API into the model.

For function calling, things are even more complex, as the OpenAPI-style function definitions get rewritten into TypeScript type definitions.

This library handles both of those cases, as well as a minor adjustment needed for handling the _results_ of function calling. [tiktoken](https://github.com/dqbd/tiktoken) is used to do the tokenization.

## Usage

```typescript
import { promptTokensEstimate } from "openai-chat-tokens"

const estimate = promptTokensEstimate({
	messages: [
		{ role: "system", content: "These aren't the droids you're looking for" },
		{ role: "user", content: "You can go about your business. Move along." },
	],
	functions: [
		{
			name: "activate_hyperdrive",
			description: "Activate the hyperdrive",
			parameters: {
				type: "object",
				properties: {
					destination: { type: "string" },
				},
			},
		},
	],
})
```

## Development and testing

Built in TypeScript, tested with Vitest.

```sh
pnpm install
pnpm test
```

When adding new test cases or debugging token count mismatches, it can be helpful to validate the estimated tokens in the tests against the live OpenAI API. To do this:

1. Set up the `OPENAI_API_KEY` environment variable with a live API key
2. Add `validate: true` to one of the test examples, or set `validateAll` to `true` in `token-counts.test.ts`, then run the tests

## References

1. "Counting tokens for chat completions API calls" in OpenAI's ["How to count tokens with tiktoken" notebook](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb)
2. A post about [counting function call tokens](https://community.openai.com/t/how-to-calculate-the-tokens-when-using-function-call/266573/23) on the OpenAI forum.
