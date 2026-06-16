import { generateText, streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { tools } from "./tools/index.ts";
import { executeTool } from "../executeTool.ts";
import { getTracer, Laminar } from "@lmnr-ai/lmnr";
import { filterCompatibleMessages } from "./system/filterMessages.ts";

Laminar.initialize({});

const MODEL_NAME = "gpt-5-mini";

export const runAgent = async (
  userMessage: string,
  history: ModelMessage[],
  callbacks?: AgentCallbacks,
) => {
  const workingHistory = filterCompatibleMessages(history);

  const messages: ModelMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...workingHistory,
    { role: "user", content: userMessage },
  ];

  let fullResponse = "";

  while (true) {
    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      tools,
      experimental_telemetry: {
        isEnabled: true,
        tracer: getTracer(),
      },
    });

    const toolCalls: ToolCallInfo[] = [];
    let currentText = "";
    let streamErr: Error | null = null;

    try {
      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          currentText += chunk.text;
          callbacks?.onToken(chunk.text);
        }

        if (chunk.type === "tool-call") {
          const input = "input" in chunk ? chunk.input : {};
          toolCalls.push({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: input as Record<string, unknown>,
          });
          callbacks?.onToolCallStart(chunk.toolName, input);
        }
      }
    } catch (err) {
      streamErr = err as Error;

      if (!currentText && !streamErr.message.includes("No output generated")) {
        throw streamErr;
      }

      fullResponse += currentText;

      if (streamErr && currentText) {
        fullResponse =
          "Sorry, but I was not able to generate a response. Could you ,like, express yourself better?";
        callbacks?.onToken(fullResponse);
        break;
      }
    }

    const finishReason = await result.finishReason;

    if (finishReason !== "tool-calls" || toolCalls.length === 0) {
      const responseMessages = await result.response;
      messages.push(...responseMessages.messages);
      break;
    }

    const responseMessages = await result.response;
    messages.push(...responseMessages.messages);

    for (const call of toolCalls) {
      const result = await executeTool(call.toolName, call.args);
      callbacks?.onToolCallEnd(call.toolName, result);

      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            output: { type: "text", value: result },
          },
        ],
      });
    }
  }

  callbacks?.onComplete(fullResponse);

  return messages;
};
