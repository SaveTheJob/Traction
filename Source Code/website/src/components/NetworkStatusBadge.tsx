import type { Strength } from "../lib/db";
import { STRENGTH_LABEL } from "../lib/db";

const STYLE: Record<Strength, string> = {
  hot: "bg-red-900/30 text-red-400",
  warm: "bg-orange-900/30 text-orange-400",
  cold: "bg-blue-900/30 text-blue-400",
};

export default function NetworkStatusBadge({ strength }: { strength: Strength }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLE[strength]}`}>
      {STRENGTH_LABEL[strength]}
    </span>
  );
}
