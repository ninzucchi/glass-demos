import type { Agent } from "@/types";
import type { AgentNamesMode } from "@/store/useFeatureFlags";

/** Hardcoded celestial names for seeded project children. */
const AGENT_CELESTIAL_NAMES: Record<string, string> = {
  "a-sb-1": "Vega",
  "a-sb-2": "Altair",
  "a-sb-3": "Deneb",
  "a-sb-4": "Lyra",
  "a-kb-1": "Orion",
  "a-kb-2": "Sirius",
  "a-kb-3": "Rigel",
  "a-kb-4": "Polaris",
  "a-kb-5": "Cassiopeia",
  "a-kb-6": "Cygnus",
  "a-kb-7": "Andromeda",
  "a-kb-8": "Pegasus",
  "a-kb-9": "Perseus",
  "a-kb-10": "Draco",
  "a-bu-1": "Europa",
  "a-bu-2": "Titan",
  "a-bu-3": "Io",
  "a-bu-4": "Ganymede",
  "a-bu-5": "Callisto",
  "a-bu-6": "Enceladus",
  "a-bu-7": "Triton",
  "a-bu-8": "Phoebe",
  "a-bu-9": "Miranda",
  "a-bu-10": "Oberon",
  "a-bu-11": "Betelgeuse",
  "a-bu-12": "Aldebaran",
  "a-bu-13": "Antares",
  "a-bu-14": "Spica",
  "a-bu-15": "Procyon",
  "a-bu-16": "Capella",
  "a-bu-17": "Arcturus",
  "a-bu-18": "Castor",
  "a-bu-19": "Pollux",
  "a-bu-20": "Aquila",
};

const FALLBACK_NAMES = [
  "Mira",
  "Algol",
  "Regulus",
  "Fomalhaut",
  "Canopus",
  "Hadar",
  "Acrux",
  "Bellatrix",
];

function fallbackName(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_NAMES[hash % FALLBACK_NAMES.length] ?? "Mira";
}

/** Title shown for an agent. Names mode remaps project children only. */
export function agentDisplayTitle(
  agent: Pick<Agent, "id" | "title" | "projectId">,
  mode: AgentNamesMode,
): string {
  if (mode !== "names" || !agent.projectId) return agent.title;
  return AGENT_CELESTIAL_NAMES[agent.id] ?? fallbackName(agent.id);
}
