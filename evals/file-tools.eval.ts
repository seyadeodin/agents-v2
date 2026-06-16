import { evaluate } from "@lmnr-ai/lmnr";
import {
  toolSelectionScore,
  //toolsAvoided,
  //toolsSelected,
} from "./evaluators.ts";
import type { EvalData, EvalTarget } from "./types.ts";
import dataset from "./data/file-tools.json" with { type: "json" };
import { executeOnce } from "./executors.ts";

const executor = async (data: EvalData) => {
  return executeOnce(data);
};

evaluate({
  data: dataset as Array<{ data: EvalData; target: EvalTarget }>,
  executor,
  evaluators: {
    selectionScore: (output, target) => {
      if (target?.category === "secondary") return 1;
      return toolSelectionScore(output, target!);
    },
  },
  groupName: "file-tools-selection",
});
