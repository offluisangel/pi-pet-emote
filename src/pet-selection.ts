import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { agentDir, EXTENSION_NAME } from "./emotes.ts";

export const PETS = [
  { id: "pet", name: "Mafe" },
  { id: "leo", name: "Leo" },
] as const;
type PetId = typeof PETS[number]["id"];

const selectionPath = () => join(agentDir(), "extensions", EXTENSION_NAME, "pet-selection.json");

export function loadPetSelection(): PetId | undefined {
  try {
    const value = JSON.parse(readFileSync(selectionPath(), "utf8"))?.pet;
    return PETS.find((pet) => pet.id === value)?.id;
  } catch {
    return undefined;
  }
}

/** Keep this extension-owned preference separate from layered user configuration. */
export function savePetSelection(pet: PetId): void {
  if (!PETS.some((entry) => entry.id === pet)) throw new Error("Invalid pet selection");
  const path = selectionPath();
  const temporary = `${path}.${randomUUID()}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(temporary, `${JSON.stringify({ pet })}\n`, { flag: "wx", mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    try { unlinkSync(temporary); } catch { /* renamed or never created */ }
  }
}
