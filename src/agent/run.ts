import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./system/prompt";
import type { AgentCallbacks } from "../types";
import { tools } from "./tools";
import { executeTool } from "../executeTool";
import { Laminar } from "@lmnr-ai/lmnr";

Laminar.initialize();

const MODEL_NAME = "gpt-5-mini";

const runModel = async (
  userMessage: string,
  history: ModelMessage[],
  callbacks: AgentCallbacks,
) => {
  const { text, toolCalls } = await generateText({
    model: openai(MODEL_NAME),
    system: SYSTEM_PROMPT,
    prompt: userMessage,
    tools,
  });

  console.log("🚀 ~ runModel ~ text:", text);
  toolCalls.forEach(async (call) => {
    console.log(await executeTool(call.toolName, call.input));
  });
};

runModel("What time is it?", [], []);
