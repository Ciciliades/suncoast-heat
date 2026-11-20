// Suncoast Heat entrypoint (Node 22, standard library only).
// Hands the game in: copies the static game/ folder and the
// screenshots/ folder beside this file into the output folder,
// then writes the dossier the judge reads, using the kit library.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const gameSrc = join(root, "game");
const shotsSrc = join(root, "screenshots");

mkdirSync(dest, { recursive: true });
cpSync(gameSrc, join(dest, "game"), { recursive: true });
mkdirSync(join(dest, "screenshots"), { recursive: true });
if (existsSync(shotsSrc)) {
  cpSync(shotsSrc, join(dest, "screenshots"), { recursive: true });
}

const dossier = buildDossier(dest, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(dest, "dossier.json"), dossier);
