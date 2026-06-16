import { tools } from "./agent/tools/index.ts";

type ToolsName = keyof typeof tools;

export const executeTool = async (name: string, args: any) => {
  const tool = tools[name as ToolsName];

  if (!tool) {
    return `Unknown tool. This tool does not exist.`;
  }

  const execute = tool.execute;

  if (!execute) {
    return `This is not a registered tool`;
  }

  const result = await execute(args, {
    toolCallId: "",
    messages: [],
  });

  return String(result);
};
