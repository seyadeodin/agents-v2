import { tool } from "ai";
import z from "zod";

export const dateTime = tool({
  description:
    "Return the current date and time. Use this tool before any time related task",
  //args: null,
  //id: "current-date-time",
  inputSchema: z.object({}),
  name: "current-date-time",
  execute: async () => {
    return `The current ISO Time is ${new Date().toISOString()}`;
  },
});
