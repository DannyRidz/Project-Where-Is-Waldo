import { PrismaClient } from "@prisma/client";
import { maps } from "./maps.js";

const prisma = new PrismaClient();

async function main() {
  for (const { characters, ...mapData } of maps) {
    await prisma.$transaction(async (tx) => {
      const existingMap = await tx.map.findFirst({
        where: {
          OR: [
            { name: mapData.name },
            { imageUrl: mapData.imageUrl },
            ...(mapData.name === "The Gobbling Gluttons" ? [{ name: "The Colorful Crowd" }] : []),
          ],
        },
      });
      const map = existingMap
        ? await tx.map.update({ where: { id: existingMap.id }, data: mapData })
        : await tx.map.create({ data: mapData });

      // Update locations in place so existing sessions, tags, and scores survive.
      for (const characterData of characters) {
        const existingCharacter = await tx.character.findFirst({
          where: { mapId: map.id, name: characterData.name },
        });
        if (existingCharacter) {
          await tx.character.update({ where: { id: existingCharacter.id }, data: characterData });
        } else {
          await tx.character.create({ data: { ...characterData, mapId: map.id } });
        }
      }
      console.log(`Updated map: "${map.name}" with ${characters.length} targets`);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
