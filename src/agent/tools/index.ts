import { deleteFile, listFiles, readFile, writeFile } from "./file.ts";
import { runCommand } from "./shell.ts";
import { webSearch } from "./webSearch.ts";

// All tools combined for the agent
export const tools = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
  webSearch,
  runCommand,
};

export const fileTools = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};

export const shellTools = {
  runCommand,
}
