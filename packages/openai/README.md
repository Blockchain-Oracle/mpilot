# @concierge-mantle/openai

Raw-shape OpenAI adapter for the framework-agnostic [`@concierge-mantle/tools`](../tools)
registry. Wraps **no SDK**: `getOpenAITools` returns the Chat Completions
wire-format tool array plus a `dispatch()` executor, so the same toolkit drives
the `openai` client **and** Anthropic Messages raw tool-use — one adapter, two
runtimes.

```ts
import { getOpenAITools } from '@concierge-mantle/openai';
import { aaveTools, dexTools } from '@concierge-mantle/providers'; // example factories

const toolkit = getOpenAITools({ chainId: 5000 }, [aaveTools, dexTools]);
```

## Quickstart — OpenAI Chat Completions

```ts
import OpenAI from 'openai';
import { bigintSafeStringify, getOpenAITools } from '@concierge-mantle/openai';

const client = new OpenAI();
const toolkit = getOpenAITools(agent, factories);

const messages: OpenAI.ChatCompletionMessageParam[] = [
  { role: 'user', content: 'Propose my next portfolio move.' },
];
const completion = await client.chat.completions.create({
  model: 'gpt-5.2',
  messages,
  tools: toolkit.tools, // assignable to ChatCompletionFunctionTool[]
});

// Handle EVERY tool call — parallel tool calls are the model's default, and
// the follow-up create() 400s unless each tool_call_id gets a tool message.
const reply = completion.choices[0]?.message;
if (reply?.tool_calls?.length) {
  messages.push(reply);
  for (const call of reply.tool_calls) {
    if (call.type !== 'function') continue;
    const result = await toolkit.dispatch(call.function.name, call.function.arguments);
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: bigintSafeStringify(result),
    });
  }
}
```

## Quickstart — Anthropic Messages (raw tool-use)

The Chat Completions `parameters` content **is** Anthropic's `input_schema` —
only the envelope keys differ:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { bigintSafeStringify, getOpenAITools } from '@concierge-mantle/openai';

const client = new Anthropic();
const toolkit = getOpenAITools(agent, factories);

const tools: Anthropic.Messages.Tool[] = toolkit.tools.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: t.function.parameters, // carries the literal type: 'object'
}));

const message = await client.messages.create({
  model: 'claude-opus-4-7',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Propose my next portfolio move.' }],
  tools,
});

// A single assistant message can carry MULTIPLE tool_use blocks — answer
// every one, or the follow-up messages.create() rejects the conversation.
for (const block of message.content) {
  if (block.type !== 'tool_use') continue;
  const result = await toolkit.dispatch(block.name, block.input as object);
  // reply with { type: 'tool_result', tool_use_id: block.id, content: bigintSafeStringify(result) }
}
```

## dispatch semantics

- `args` accepts the **raw JSON string** from `tool_calls[].function.arguments`
  or an **already-parsed object** from Anthropic's `tool_use.input`.
- Input is validated with the tool's own `inputSchema` **before** `invoke`
  runs — defaults applied, unknown keys stripped, invalid input rejects with a
  `ZodError`. Malformed JSON rejects with `SyntaxError`; unknown tool names
  reject with an error listing the known tools. Nothing fails silently.
- `dispatch` returns the raw `invoke()` value. Serialize it for the tool-result
  message with the re-exported `bigintSafeStringify` — plain `JSON.stringify`
  **throws on the wei-scale bigints** Concierge tools emit.

## Gotchas

- **Zero tools?** Omitted factories AND an unsupported `chainId` both yield
  `tools: []` silently — check both before debugging the model.
- **No abort propagation.** Cancelling the model request does NOT cancel an
  in-flight tool call: `ConciergeTool.invoke` takes no abort signal, so a
  started execution (e.g. an on-chain transaction) runs to completion.
- **A failed `dispatch` mid-loop leaves `messages` inconsistent.** The
  assistant message is pushed before the tool replies, so if one call's
  dispatch rejects, the calls already answered orphan their siblings and a
  retried `create()` 400s on the unanswered `tool_call_id`s. Either reply
  with an error-string tool message for the failed call, or drop the
  assistant message before retrying.
- **Not strict-mode ready with optionals.** OpenAI `strict: true` requires
  `additionalProperties: false` (emitted — fine) AND every property `required`
  — `.optional()` properties are omitted from `required`, so schemas with
  optionals fail strict validation. `.default()` properties are fine: they
  STAY in `required` (parse fills them). Leave `strict` unset (the default)
  unless your schemas avoid `.optional()`.
- **`.transform()`/`.pipe()`/`z.custom()` input schemas throw at construction
  time** — `.transform()` and `z.custom()` cannot be represented in JSON
  Schema at all, and a plain `.pipe()` would silently advertise what `parse()`
  *returns* instead of what it *accepts*. Normalize inside `invoke()` instead.
- **`.refine()` is invisible to the model.** Refinements are stripped from the
  emitted JSON Schema (they still validate at dispatch) — the model can't see
  the constraint and will violate it. Put the rule in `.describe()` text too.
