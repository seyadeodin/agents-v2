import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./system/prompt";
import type { AgentCallbacks } from "../types";
import { tools } from "./tools";
import { executeTool } from "../executeTool";
import { getTracer, Laminar } from "@lmnr-ai/lmnr";

Laminar.initialize({});

const MODEL_NAME = "gpt-5-mini";

export const runAgent = async (
  userMessage: string,
  history: ModelMessage[],
  callbacks?: AgentCallbacks,
) => {
  const { text, toolCalls } = await generateText({
    model: openai(MODEL_NAME),
    system: SYSTEM_PROMPT,
    prompt: userMessage,
    tools,
    experimental_telemetry: {
      isEnabled: true,
      tracer: getTracer(),
    },
  });

  await Laminar.flush();

  toolCalls.forEach(async (call) => {
    console.log(await executeTool(call.toolName, call.input));
  });
};
