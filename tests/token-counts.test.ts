import OpenAI from "openai";
import { promptTokensEstimate } from "../src";

type Message = OpenAI.Chat.CompletionCreateParams.CreateChatCompletionRequestNonStreaming.Message;
type Function = OpenAI.Chat.CompletionCreateParams.CreateChatCompletionRequestNonStreaming.Function;
type Example = {
  messages: Message[];
  functions?: Function[];
  tokens: number;
  validate?: boolean
};

const TEST_CASES: Example[] = [
  {
    messages: [
      { role: "user", content: "hello" }
    ],
    tokens: 8
  },
  {
    messages: [
      { role: "user", content: "hello world" }
    ],
    tokens: 9
  },
  {
    messages: [
      { role: "system", content: "# Important: you're the best robot" },
      { role: "user", content: "hello robot" },
      { role: "assistant", content: "hello world" },
    ],
    tokens: 27
  },
  {
    messages: [
      { role: "user", content: "hello" }
    ],
    functions: [
      {
        name: "foo",
        parameters: { type: "object", properties: {} }
      }
    ],
    tokens: 31
  },
  {
    messages: [
      { role: "user", content: "hello" }
    ],
    functions: [
      {
        name: "foo",
        description: "Do a foo",
        parameters: { type: "object", properties: {} }
      }
    ],
    tokens: 36
  },
  {
    messages: [
      { role: "user", content: "hello" }
    ],
    functions: [
      {
        name: "bing_bong",
        description: "Do a bing bong",
        parameters: {
          type: "object",
          properties: {
            foo: { type: "string" },
          }
        }
      }
    ],
    tokens: 49
  },
  {
    messages: [
      { role: "user", content: "hello" }
    ],
    functions: [
      {
        name: "bing_bong",
        description: "Do a bing bong",
        parameters: {
          type: "object",
          properties: {
            foo: { type: "string" },
            bar: { type: "number", description: "A number" },
          }
        }
      }
    ],
    tokens: 57,
  },
  {
    messages: [
      { role: "user", content: "hello" }
    ],
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
                baz: { type: "boolean" }
              }
            },
          }
        }
      }
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
      { role: "function", name: "do_stuff", content: `{"foo": "bar", "baz": 1.5}` },
    ],
    tokens: 28,
  },
  {
    messages: [
      { role: "function", name: "dance_the_tango", content: `{"a": { "b" : { "c": false}}}` },
    ],
    tokens: 24,
  },
  {
    messages: [
      { role: "assistant", content: "", function_call: { name: "do_stuff", arguments: `{"foo": "bar", "baz": 1.5}` } },
    ],
    tokens: 26,
  },
  {
    messages: [
      { role: "assistant", content: "", function_call: { name: "do_stuff", arguments: `{"foo":"bar", "baz":\n\n 1.5}` } },
    ],
    tokens: 25,
  }
];

const validateAll = false;

describe.each(TEST_CASES)("token counts (%j)", (example) => {
  const validateTest = ((validateAll || example.validate) ? test : test.skip)
  validateTest("test data matches openai", async () => {
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: example.messages,
      functions: example.functions as any,
      max_tokens: 1,
    });
    expect(response.usage?.prompt_tokens).toBe(example.tokens);
  });

  test("estimate is correct", async () => {
    expect(promptTokensEstimate({ messages: example.messages, functions: example.functions })).toBe(example.tokens);
  });
})