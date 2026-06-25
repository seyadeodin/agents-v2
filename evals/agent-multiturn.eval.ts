import { evaluate } from "@lmnr-ai/lmnr";
import { toolOrderCorrect, toolsAvoided, llmJudge } from "./evaluators.ts";
import type {
  MultiTurnEvalData,
  MultiTurnResult,
  MultiTurnTarget,
} from "./types";
import dataset from "./data/agent-multiturn.json" with { type: "json" };
import { multiTurnWithMocks } from "./executors";

const executor = async (data: MultiTurnEvalData): Promise<MultiTurnResult> => {
  return multiTurnWithMocks(data);
};

evaluate({
  data: dataset as unknown as Array<{
    data: MultiTurnEvalData;
    target: MultiTurnTarget;
  }>,
  executor,
  evaluators: {
    toolOrder: (output, target) => {
      if (!target) return 1;
      return toolOrderCorrect(output, target);
    },
    toolsAvoided: (output, target) => {
      if (!target) return 1;
      return toolsAvoided(output, target);
    },
    outputQuality: (output, target) => {
      if (!target) return 1;
      return llmJudge(output, target);
    },
  },
  groupName: "agent-multiturn",
});
