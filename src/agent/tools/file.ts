import { tool } from "ai";
import z from "zod";
import fs from "node:fs/promises";
import path from "node:path";

export const readFile = tool({
  description:
    "Read the contents of a file at the specifid path. Use this to examine file contents",
  inputSchema: z.object({
    path: z.string().describe("The path of the file being read."),
  }),
  execute: async ({ path: filePath }: { path: string }) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");

      return { result: content };
    } catch (e) {
      return { result: `Returned with the following JS/node error: ${e}` };
    }
  },
});

export const writeFile = tool({
  description:
    "Write content to a file at specified path. Creates the file if it doesn't exist, overwrite if it does",
  inputSchema: z.object({
    path: z.string().describe("The path of the file to write."),
    content: z.string().describe("The content to write on the file"),
  }),
  execute: async ({
    path: filePath,
    content,
  }: {
    path: string;
    content: string;
  }) => {
    try {
      const dir = path.dirname(filePath);

      await fs.mkdir(dir, { recursive: true });

      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      await fs.writeFile(filePath, content, "utf-8");
      return {
        result: `${fileExists ? "File overwritten." : "File created."} Sucessfully wrote ${content.length} characters to ${filePath}`,
      };
    } catch (e) {
      return { result: `Returned with the following JS/node error: ${e}` };
    }
  },
});

export const listFiles = tool({
  description: "List all files and directories in the specied path.",
  inputSchema: z.object({
    directory: z
      .string()
      .describe("The directory path to list contents of")
      .default("."),
  }),
  execute: async ({ directory }: { directory: string }) => {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const items = entries.map((entry) => {
        const type = entry.isDirectory() ? "[dir]" : "[file]";
        return `${type} ${entry.name}`;
      });

      return {
        result:
          items.length > 0
            ? items.join("\n")
            : `Directory ${directory} is empty.`,
      };
    } catch (e) {
      return { result: `Returned with the following JS/node error: ${e}` };
    }
  },
});

export const deleteFile = tool({
  description:
    "Delete a file at the specified path. Use with caution as this is irreversible",
  inputSchema: z.object({
    path: z.string().describe("The path of the file to delete."),
  }),
  execute: async ({ path: filePath }: { path: string }) => {
    try {
      await fs.unlink(filePath);
      return { result: `Sucessfully deleted ${filePath}` };
    } catch (e) {
      return { result: `Returned with the following JS/node error: ${e}` };
    }
  },
});
