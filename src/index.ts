import OpenAI from "openai";
import { Tiktoken, getEncoding } from "js-tiktoken";
import { FunctionDef, formatFunctionDefinitions } from "./functions";

type Message = OpenAI.Chat.ChatCompletionMessageParam;
type Function = OpenAI.Chat.ChatCompletionCreateParams.Function;
type FunctionCall = OpenAI.Chat.ChatCompletionFunctionCallOption;

let encoder: Tiktoken | undefined;

/**
 * Estimate the number of tokens a prompt will use.
 * @param {Object} prompt OpenAI prompt data
 * @param {Message[]} prompt.messages OpenAI chat messages
 * @param {Function[]} prompt.functions OpenAI function definitions
 * @returns An estimate for the number of tokens the prompt will use
 */
export function promptTokensEstimate({
  messages,
  functions,
  function_call,
}: {
  messages: Message[];
  functions?: Function[];
  function_call?: "none" | "auto" | FunctionCall;
}): number {
  // It appears that if functions are present, the first system message is padded with a trailing newline. This
  // was inferred by trying lots of combinations of messages and functions and seeing what the token counts were.
  let paddedSystem = false;
  let tokens = messages
    .map((m) => {
      if (m.role === "system" && functions && !paddedSystem) {
        m = { ...m, content: m.content + "\n" };
        paddedSystem = true;
      }
      return messageTokensEstimate(m);
    })
    .reduce((a, b) => a + b, 0);

  // Each completion (vs message) seems to carry a 3-token overhead
  tokens += 3;

  // If there are functions, add the function definitions as they count towards token usage
  if (functions) {
    tokens += functionsTokensEstimate(functions as any as FunctionDef[]);
  }

  // If there's a system message _and_ functions are present, subtract four tokens. I assume this is because
  // functions typically add a system message, but reuse the first one if it's already there. This offsets
  // the extra 9 tokens added by the function definitions.
  if (functions && messages.find((m) => m.role === "system")) {
    tokens -= 4;
  }

  // If function_call is 'none', add one token.
  // If it's a FunctionCall object, add 4 + the number of tokens in the function name.
  // If it's undefined or 'auto', don't add anything.
  if (function_call && function_call !== "auto") {
    tokens +=
      function_call === "none" ? 1 : stringTokens(function_call.name) + 4;
  }

  return tokens;
}

/**
 * Count the number of tokens in a string.
 * @param s The string to count tokens in
 * @returns The number of tokens in the string
 */
export function stringTokens(s: string): number {
  if (!encoder) {
    encoder = getEncoding("cl100k_base");
  }
  return encoder.encode(s).length;
}

/**
 * Estimate the number of tokens a message will use. Note that using the message within a prompt will add extra
 * tokens, so you might want to use `promptTokensEstimate` instead.
 * @param message An OpenAI chat message
 * @returns An estimate for the number of tokens the message will use
 */
export function messageTokensEstimate(message: Message): number {
  const components: string[] = [message.role];
  if (typeof message.content === "string") {
    components.push(message.content);
  }

  if ("name" in message && message.name) {
    components.push(message.name);
  }

  if (message.role === "assistant" && message.function_call) {
    components.push(message.function_call.name);
    components.push(message.function_call.arguments);
  }

  let tokens = components.map(stringTokens).reduce((a, b) => a + b, 0);
  tokens += 3; // Add three per message
  if ("name" in message && message.name) {
    tokens += 1;
  }
  if (message.role === "function") {
    tokens -= 2;
  }
  if (message.role === "assistant" && message.function_call) {
    tokens += 3;
  }
  return tokens;
}

/**
 * Estimate the number of tokens a function definition will use. Note that using the function definition within
 * a prompt will add extra tokens, so you might want to use `promptTokensEstimate` instead.
 * @param funcs An array of OpenAI function definitions
 * @returns An estimate for the number of tokens the function definitions will use
 */
export function functionsTokensEstimate(funcs: FunctionDef[]) {
  const promptDefinitions = formatFunctionDefinitions(funcs);
  let tokens = stringTokens(promptDefinitions);
  tokens += 9; // Add nine per completion
  return tokens;
}
