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
	write: {
		description: "Write on the file specified by the path.",
		inputSchema: z.object({
			path: z.string().describe("The path of the file we're changing."),
			content: z.string().describe("What will be written in the file"),
		}),
		name: "writeFile",
	},
	list: {
		description: "List the files specified on the path.",
		inputSchema: z.object({
			path: z
				.string()
				.describe("The path of the folder we're listing contents."),
		}),
		name: "listFiles",
	},
	create: {
		description: "Create a file in the specified path",
		inputSchema: z.object({
			path: z.string().describe("The path of the file we're creating."),
		}),
		name: "createFile",
	},
	delete: {
		description: "Delete the file specified in the path",
		inputSchema: z.object({
			path: z.string().describe("The path of the file we're deleting."),
		}),
		name: "delteFile",
	},
};

export const executeOnce = async (data: EvalData) => {
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

	const result = await generateText({
		model: openai(data.config?.model ?? "gpt-5-mini"),
		messages,
		tools,
		stopWhen: stepCountIs(1),
		temperature: data.config?.temperature ?? undefined,
	});

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
