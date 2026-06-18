import { tool } from "ai";
import z from "zod";

export const dateTime = tool({
	description:
		"Return the current date and time. Use this tool before any time related task. After getting the output using it to generate a human readable final answer.",
	//args: null,
	//id: "current-date-time",
	inputSchema: z.object({}) as any,
	//name: "current-date-time",
	execute: async () => {
		return { resut: `The current ISO Time is ${new Date().toISOString()}}` };
	},
});
