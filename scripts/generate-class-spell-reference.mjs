import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getClassSpellCatalog } from "../apps/server/src/game/angband-character-data.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(currentDirectory, "../docs/class-spell-reference.md");

const catalog = getClassSpellCatalog()
  .filter((playerClass) => playerClass.books.length > 0)
  .sort((left, right) => left.name.localeCompare(right.name));

const lines = [
  "# Class Spell Reference",
  "",
  "Generated from `Angband-4.2.6/lib/gamedata/class.txt`.",
  "",
  "This document lists each spellcasting class, the books associated with that class, and every spell currently defined in the Angband data files.",
  ""
];

for (const playerClass of catalog) {
  lines.push(`## ${playerClass.name}`);
  lines.push("");
  lines.push(`Spellcasting stat: ${playerClass.spellcastingStat ? titleCase(playerClass.spellcastingStat) : "None"}`);
  lines.push("");

  for (const book of playerClass.books) {
    lines.push(`### ${book.name}`);
    lines.push("");
    lines.push(`- Source: ${book.itemType}`);
    lines.push(`- Availability: ${titleCase(book.quality)}`);
    lines.push(`- Realm: ${titleCase(book.realm)}`);
    lines.push("");
    lines.push("| Spell | Level | Mana | Fail | Description |");
    lines.push("| --- | ---: | ---: | ---: | --- |");

    for (const spell of book.spells) {
      lines.push(`| ${escapePipes(spell.name)} | ${spell.level} | ${spell.mana} | ${spell.fail}% | ${escapePipes(spell.description || "")} |`);
    }

    lines.push("");
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

function titleCase(value) {
  return String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function escapePipes(value) {
  return String(value || "").replace(/\|/g, "\\|");
}
