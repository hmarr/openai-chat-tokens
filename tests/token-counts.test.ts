import OpenAI from "openai";
import { loadEnv } from "vite";
import { describe, test } from "vitest";
import { promptTokensEstimate } from "../src";

const mode = process.env["NODE_ENV"] ?? "development";
Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

// There's a bug in the openai types that prevents us from adding the name field to the system message
// ref: https://github.com/openai/openai-openapi/issues/118
// ref: https://github.com/openai/openai-node/pull/493
// TODO: remove when this is fixed
declare module "openai" {
  namespace OpenAI.Chat {
    interface ChatCompletionSystemMessageParam {
      name?: string;
    }
  }
}

type Message = OpenAI.Chat.ChatCompletionMessageParam;
type Function = OpenAI.Chat.ChatCompletionCreateParams.Function;
type FunctionCall = OpenAI.Chat.ChatCompletionFunctionCallOption;
type Example = {
  messages: Message[];
  functions?: Function[];
  function_call?: "none" | "auto" | FunctionCall;
  tokens: number;
  validate?: boolean;
};

const TEST_CASES: Example[] = [
  // these match https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  {
    messages: [
      {
        role: "system",
        content:
          "You are a helpful, pattern-following assistant that translates corporate jargon into plain English.",
      },
    ],
    tokens: 25,
  },
  {
    messages: [
      {
        role: "system",
        name: "example_user",
        content: "New synergies will help drive top-line growth.",
      },
    ],
    tokens: 20,
  },
  {
    messages: [
      {
        role: "system",
        name: "example_assistant",
        content: "Things working well together will increase revenue.",
      },
    ],
    tokens: 19,
  },
  {
    messages: [
      {
        role: "system",
        name: "example_user",
        content:
          "Let's circle back when we have more bandwidth to touch base on opportunities for increased leverage.",
      },
    ],
    tokens: 28,
  },
  {
    messages: [
      {
        role: "system",
        name: "example_assistant",
        content:
          "Let's talk later when we're less busy about how to do better.",
      },
    ],
    tokens: 26,
  },
  {
    messages: [
      {
        role: "user",
        content:
          "This late pivot means we don't have time to boil the ocean for the client deliverable.",
      },
    ],
    tokens: 26,
  },
  // these are all random test cases below
  {
    messages: [{ role: "user", content: "hello" }],
    tokens: 8,
  },
  {
    messages: [{ role: "user", content: "hello world" }],
    tokens: 9,
  },
  {
    messages: [{ role: "system", content: "hello" }],
    tokens: 8,
  },
  {
    messages: [{ role: "system", content: "hello:" }],
    tokens: 9,
  },
  {
    messages: [
      { role: "system", content: "# Important: you're the best robot" },
      { role: "user", content: "hello robot" },
      { role: "assistant", content: "hello world" },
    ],
    tokens: 27,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "foo",
        parameters: { type: "object", properties: {} },
      },
    ],
    tokens: 31,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "foo",
        parameters: { type: "object", properties: {} },
      },
    ],
    function_call: "none",
    tokens: 32,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "foo",
        parameters: { type: "object", properties: {} },
      },
    ],
    function_call: "auto",
    tokens: 31,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "foo",
        parameters: { type: "object", properties: {} },
      },
    ],
    function_call: { name: "foo" },
    tokens: 36,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "foo",
        description: "Do a foo",
        parameters: { type: "object", properties: {} },
      },
    ],
    tokens: 36,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "bing_bong",
        description: "Do a bing bong",
        parameters: {
          type: "object",
          properties: {
            foo: { type: "string" },
          },
        },
      },
    ],
    tokens: 49,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "bing_bong",
        description: "Do a bing bong",
        parameters: {
          type: "object",
          properties: {
            foo: { type: "string" },
            bar: { type: "number", description: "A number" },
          },
        },
      },
    ],
    tokens: 57,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "bing_bong",
        description: "Do a bing bong",
        parameters: {
          type: "object",
          properties: {
            foo: {
              type: "object",
              properties: {
                bar: { type: "string", enum: ["a", "b", "c"] },
                baz: { type: "boolean" },
              },
            },
          },
        },
      },
    ],
    tokens: 68,
  },
  {
    messages: [
      { role: "user", content: "hello world" },
      { role: "function", name: "do_stuff", content: `{}` },
    ],
    tokens: 15,
  },
  {
    messages: [
      { role: "user", content: "hello world" },
      {
        role: "function",
        name: "do_stuff",
        content: `{"foo": "bar", "baz": 1.5}`,
      },
    ],
    tokens: 28,
  },
  {
    messages: [
      {
        role: "function",
        name: "dance_the_tango",
        content: `{"a": { "b" : { "c": false}}}`,
      },
    ],
    tokens: 24,
  },
  {
    messages: [
      {
        role: "assistant",
        content: "",
        function_call: {
          name: "do_stuff",
          arguments: `{"foo": "bar", "baz": 1.5}`,
        },
      },
    ],
    tokens: 26,
  },
  {
    messages: [
      {
        role: "assistant",
        content: "",
        function_call: {
          name: "do_stuff",
          arguments: `{"foo":"bar", "baz":\n\n 1.5}`,
        },
      },
    ],
    tokens: 25,
  },
  {
    messages: [
      {
        role: "system",
        content: "You are an AI assistant trained to foo or bar",
      },
      { role: "user", content: "My name is suzie" },
      {
        role: "function",
        name: "foo",
        content: '{"res":{"kind":"user","name":"suzie"}}',
      },
      {
        role: "user",
        content: 'I want to post a message with the text "hello world"',
      },
      {
        role: "function",
        name: "foo",
        content: '{"res":{"kind":"post","text":"hello world"}}',
      },
    ],
    functions: [
      {
        name: "foo",
        description: "Return the foo or the bar",
        parameters: {
          type: "object",
          properties: {
            res: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    kind: { type: "string", const: "post" },
                    text: { type: "string" },
                  },
                  required: ["kind", "text"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    kind: { type: "string", const: "user" },
                    name: {
                      type: "string",
                      enum: ["jane", "suzie", "adam"],
                    },
                  },
                  required: ["kind", "name"],
                  additionalProperties: false,
                },
              ],
              description: "The foo or the bar",
            },
          },
          required: ["res"],
          additionalProperties: false,
        },
      },
    ],
    function_call: { name: "foo" },
    tokens: 158,
  },
  {
    messages: [
      { role: "system", content: "Hello" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      {
        name: "do_stuff",
        parameters: {
          type: "object",
          properties: {
            foo: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    kind: { type: "string", const: "a" },
                    baz: { type: "boolean" },
                  },
                },
              ],
            },
          },
        },
      },
    ],
    tokens: 52,
  },
  {
    messages: [
      { role: "system", content: "Hello" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      {
        name: "do_stuff",
        parameters: {
          type: "object",
          properties: {
            foo: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    kind: { type: "string", const: "a" },
                    baz: { type: "boolean" },
                  },
                },
                {
                  type: "object",
                  properties: {
                    kind: { type: "string", const: "b" },
                    qux: { type: "number" },
                  },
                },
                {
                  type: "object",
                  properties: {
                    kind: { type: "string", const: "c" },
                    idk: { type: "string" },
                  },
                },
              ],
            },
          },
        },
      },
    ],
    tokens: 80,
  },
  {
    messages: [
      { role: "system", content: "Hello" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      {
        name: "do_stuff",
        parameters: {
          type: "object",
          properties: {
            foo: {
              anyOf: [{ type: "string", const: "a" }, { type: "number" }],
            },
          },
        },
      },
    ],
    tokens: 44,
  },
  {
    messages: [
      { role: "system", content: "Hello" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      {
        name: "do_stuff",
        parameters: { type: "object", properties: {} },
      },
    ],
    tokens: 35,
  },
  {
    messages: [
      { role: "system", content: "Hello:" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      { name: "do_stuff", parameters: { type: "object", properties: {} } },
    ],
    tokens: 35,
  },
  {
    messages: [
      { role: "system", content: "Hello:" },
      { role: "system", content: "Hello" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      { name: "do_stuff", parameters: { type: "object", properties: {} } },
    ],
    tokens: 40,
  },
  {
    messages: [
      { role: "system", content: "Hello:" },
      { role: "system", content: "Hello" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      { name: "do_stuff", parameters: { type: "object", properties: {} } },
      {
        name: "do_other_stuff",
        parameters: { type: "object", properties: {} },
      },
    ],
    tokens: 49,
  },
  {
    messages: [
      { role: "system", content: "Hello:" },
      { role: "system", content: "Hello" },
      { role: "user", content: "Hi there" },
    ],
    functions: [
      { name: "do_stuff", parameters: { type: "object", properties: {} } },
      {
        name: "do_other_stuff",
        parameters: { type: "object", properties: {} },
      },
    ],
    function_call: { name: "do_stuff" },
    tokens: 55,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "get_recipe",
        parameters: {
          type: "object",
          required: ["ingredients", "instructions", "time_to_cook"],
          properties: {
            ingredients: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "unit", "amount"],
                properties: {
                  name: {
                    type: "string",
                  },
                  unit: {
                    enum: ["grams", "ml", "cups", "pieces", "teaspoons"],
                    type: "string",
                  },
                  amount: {
                    type: "number",
                  },
                },
              },
            },
            instructions: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Steps to prepare the recipe (no numbering)",
            },
            time_to_cook: {
              type: "number",
              description: "Total time to prepare the recipe in minutes",
            },
          },
        },
      },
    ],
    tokens: 106,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "function",
        description: "description",
        parameters: {
          type: "object",
          properties: {
            quality: {
              type: "object",
              properties: {
                pros: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description: "Write 3 points why this text is well written",
                },
              },
            },
          },
        },
      },
    ],
    tokens: 46,
  },
  {
    messages: [{ role: "user", content: "hello" }],
    functions: [
      {
        name: "function",
        description: "desctiption1",
        parameters: {
          type: "object",
          description: "desctiption2",
          properties: {
            mainField: {
              type: "string",
              description: "description3",
            },
            "field number one": {
              type: "object",
              description: "description4",
              properties: {
                yesNoField: {
                  type: "string",
                  description: "description5",
                  enum: ["Yes", "No"],
                },
                howIsInteresting: {
                  type: "string",
                  description: "description6",
                },
                scoreInteresting: {
                  type: "number",
                  description: "description7",
                },
                isInteresting: {
                  type: "string",
                  description: "description8",
                  enum: ["Yes", "No"],
                },
              },
            },
          },
        },
      },
    ],
    tokens: 96,
  },
];

const validateAll = false;
const openAITimeout = 10000;

describe.each(TEST_CASES)("token counts (%j)", (example) => {
  const validateTest = validateAll || example.validate ? test : test.skip;

  validateTest(
    "test data matches openai",
    async ({ expect }) => {
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: example.messages,
        functions: example.functions as any,
        function_call: example.function_call,
        max_tokens: 10,
      });

      expect(response.usage?.prompt_tokens).toBe(example.tokens);
    },
    openAITimeout,
  );

  test("estimate is correct", async ({ expect }) => {
    const estimate = promptTokensEstimate({
      messages: example.messages,
      functions: example.functions,
      function_call: example.function_call,
    });

    expect(estimate).toBe(example.tokens);
  });
});
