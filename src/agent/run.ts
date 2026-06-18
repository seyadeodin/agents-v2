import { generateText, streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { tools } from "./tools/index.ts";
import { executeTool } from "../executeTool.ts";
import { getTracer, Laminar } from "@lmnr-ai/lmnr";
import { filterCompatibleMessages } from "./system/filterMessages.ts";

Laminar.initialize({});

const SKILLS: Record<string, {text: string, reasoningEffort?: string}> = {
  "/evaluate": {
    text:`You are a signal score and type evaluator. 

- The lead scores goes from 0 - 1 which is added or subtracted based on the signal scores it receives.
- You will receive natural language texts and have to interpret it according to what a seller wrote.
- You must interpret those messages and:
  1. Determine a signal_score: increase or decrease the score according to their content
  2. Extract a signal_type: identify the type of interaction from the message

- If the client gives a negative answer, ignore seller, or show doubt it should decrease the score e.g: -0.15
- The natural language messages will be written in pt-BR.

Signal type categories (choose the most appropriate):
- "email": For email communications (e.g., "enviei um email", "recebi resposta por email")
- "phone": For phone calls (e.g., "liguei para", "conversa telefônica", "telefonema")
- "meeting": For meetings (e.g., "reunião", "encontro", "visita", "apresentação")
- "message": For messages (e.g., "mensagem no WhatsApp", "DM no LinkedIn", "SMS")
- "other": For other types of interactions not covered above


### SIGNAL TYPE CATEGORIES
Choose the exact matching string below. If unclear, return "".
- "email": For email communications (e.g., "enviei um email", "recebi resposta por email").
- "phone": For phone calls (e.g., "liguei para", "conversa telefônica", "telefonema").
- "meeting": For meetings (e.g., "reunião", "encontro", "visita", "apresentação").
- "message": For text messages (e.g., "mensagem no WhatsApp", "DM no LinkedIn", "SMS").
- "other": For distinct interactions not covered above.

### EXAMPLES
Input: "Liguei pra ele e ele disse que não tem interesse no momento."
Output: { "signal_score": -0.3, "signal_type": "phone", "reason": "reason" }

Input: "Cliente respondeu o email pedindo o envio da proposta comercial."
Output: { "signal_score": 0.3, "signal_type": "email", "reason": "reason" }

Input: "Mandei um zap, ele visualizou ontem mas ignorou."
Output: { "signal_score": -0.1, "signal_type": "message", "reason": "reason" }

Input: "Fizemos uma visita técnica, o cliente adorou e quer avançar."
Output: { "signal_score": 0.3, "signal_type": "meeting", "reason": "reason" }

In case of some variation you're free to add some sauce into it e.g. to a signal that may look like something between a weak and strong negative something like a -0.25. Or a very negative one -0.35.

If you cannot determine a clear signal type, leave signal_type as empty string "".

- The signal_score must be negative when the interaction is negative and positive when it is positive.
- The signal_type must be one of the categories above or empty string "" if unclear.
`},
  "/vim": {
  text:`
Act as minimalist Neovim command reference.
Output exact keystrokes or ex-commands only.
Little explanations, no intros, no fluff.
If multiple ways exist, output all and concisely point differences.
If something can only be accomplished by plugin explain it in the shortest way possible.
Format: [keystrokes]
`,
    reasoningEffort: "low",
  }
}

const MODEL_NAME = "gpt-5.4-nano";

export const runAgent = async (
  userMessage: string,
  history: ModelMessage[],
  callbacks?: AgentCallbacks,
) => {
  const workingHistory = filterCompatibleMessages(history);

  const skillsList = Object.keys(SKILLS);
  const selectedSkill = skillsList.find(skill => userMessage.includes(skill));

  const selectedReasoning = selectedSkill ? SKILLS[selectedSkill]?.reasoningEffort : undefined;
  const selectedPrompt = selectedSkill ? SKILLS[selectedSkill].text : SYSTEM_PROMPT;

  const messages: ModelMessage[] = [
    { role: "system", content: selectedPrompt },
    ...workingHistory,
    { role: "user", content: userMessage },
  ];

  let fullResponse = "";

  while (true) {
    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      tools,
      experimental_telemetry: {
        isEnabled: true,
        tracer: getTracer(),
      },
      providerOptions: {
        openai: {
          reasoningEffort: selectedReasoning ?? "medium",
        }
      }
    });

    const toolCalls: ToolCallInfo[] = [];
    let currentText = "";
    let streamErr: Error | null = null;

    try {
      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          currentText += chunk.text;
          callbacks?.onToken(chunk.text);
        }

        if (chunk.type === "tool-call") {
          const input = "input" in chunk ? chunk.input : {};
          toolCalls.push({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: input as Record<string, unknown>,
          });
          callbacks?.onToolCallStart(chunk.toolName, input);
        }
      }
      fullResponse += currentText; // ponytail: accumulate streamed text in success case
    } catch (err) {
      streamErr = err as Error;

      if (!currentText && !streamErr.message.includes("No output generated")) {
        throw streamErr;
      }

      fullResponse += currentText;

      if (streamErr && currentText) {
        fullResponse =
          "Sorry, but I was not able to generate a response. Could you ,like, express yourself better?";
        callbacks?.onToken(fullResponse);
        break;
      }
    }

    const finishReason = await result.finishReason;


    if (finishReason !== "tool-calls" || toolCalls.length === 0) {
      const responseMessages = await result.response;
      messages.push(...responseMessages.messages);
      break;
    }

    const responseMessages = await result.response;
    messages.push(...responseMessages.messages);

    for (const call of toolCalls) {
      const result = await executeTool(call.toolName, call.args);
      callbacks?.onToolCallEnd(call.toolName, result);

      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            output: { type: "text", value: result },
          },
        ],
      });
    }
  }

  callbacks?.onComplete(fullResponse);

  return messages;
};
