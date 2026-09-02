import type { PrState } from "@/data/pullRequests";

export function isPrState(value: unknown): value is PrState {
  return value === "draft" || value === "open" || value === "merged" || value === "closed";
}
