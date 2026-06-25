import { openai } from "@ai-sdk/openai";

export const runCommand = openai.tools.shell({})
