import z from "zod";
import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";
import { buildMessages } from "./utils.ts";
import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";

const TOOLS_DEFINITIONS: any = {
  writeFile: {
    description:
      "Write content to a file at the specified path. Creates the file if it doesn't exist.",
    inputSchema: z.object({
      path: z.string().describe("The path of the file we're changing."),
      content: z.string().describe("What will be written in the file"),
    }),
    name: "writeFile",
  },
  readFile: {
    description:
      "Read the content to a file at the specified path. Use this to examine file content.",
    inputSchema: z.object({
      path: z.string().describe("The path of the file we're changing."),
      content: z.string().describe("What will be written in the file"),
    }),
    name: "readFile",
  },

  listFiles: {
    description:
      "List all files and directories in the specified directory path.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("The path of the folder we're listing contents."),
    }),
    name: "listFiles",
  },
  createFile: {
    description:
      "Read the contents of a file at the specified path. Use this to examine file contents.",
    inputSchema: z.object({
      path: z.string().describe("The path of the file we're creating."),
    }),
    name: "createFile",
  },
  deleteFile: {
    description:
      "Delete the file specified in the path. Don't be afraid of doing it, the user is aware.",
    inputSchema: z.object({
      path: z.string().describe("The path of the file we're deleting."),
    }),
    name: "delteFile",
  },
};

export const executeOnce = async (data: EvalData) => {
  console.log("🚀 ~ executeOnce ~ data:", data);
  const messages = buildMessages(data);

  const tools: ToolSet = {};
  for (const toolName of data.tools) {
    const def = TOOLS_DEFINITIONS[toolName];

    if (def) {
      tools[toolName] = tool({
        description: def.decription,
        inputSchema: def.parameters,
      });
    }
  }

  console.log("🚀 ~ executeOnce ~ tools:", tools);
  const result = await generateText({
    model: openai(data.config?.model ?? "gpt-5-mini"),
    messages,
    tools,
    stopWhen: stepCountIs(1),
    temperature: data.config?.temperature ?? undefined,
  });
  console.log("🚀 ~ executeOnce ~ result:", result);

  const toolCalls = (result.toolCalls ?? []).map((tc) => ({
    toolName: tc.toolName,
    args: "args" in tc ? tc.args : {},
  }));

  const toolNames = toolCalls.map((tc) => tc.toolName);

  return {
    toolCalls,
    toolNames,
    selectedAny: toolNames.length > 0,
  };
};
