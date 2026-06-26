import { tool } from "ai";
import shell from "shelljs";
import z from "zod";

export const runCommand = tool({
	description: `Execute a shell command and return an output. Use this for system operations, running scripts, or interacting with the operating system.`,
	inputSchema: z.object({
		command: z.string().describe("The shell command to execute"),
	}),
	execute: ({ command }: { command: string }) => {
		const result = shell.exec(command, { silent: true });

		let output = "";

		if (result.stdout) {
			output += result.stdout;
		}

		if (result.stderr) {
			output += result.stderr;
		}

		if (result.code !== 0) {
			return `Command failed (exite code ${result.code})\nOUTPUT: ${output}`;
		}

		return output || `Command ${command} completed successfully (no output)`;
	},
});
