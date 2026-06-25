import { deleteFile, listFiles, readFile, writeFile } from "./file.ts";

// All tools combined for the agent
export const tools = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};
