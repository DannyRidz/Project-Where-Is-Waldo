import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Store each map and its locations together. Existing scores and sessions
  // are retained when you re-run the seed script.
  const maps = [
    {
      name: "Waldo at the Beach",
      imageUrl: "/images/waldo-beach.jpg",
      characters: [
          {
            name: "Waldo",
            avatarUrl: "/images/waldo.svg",
            xMin: 59.0,
            xMax: 64.0,
            yMin: 32.0,
            yMax: 37.0,
          },
          {
            name: "Wizard Whitebeard",
            avatarUrl: "/images/wizard.svg",
            xMin: 85.5,
            xMax: 90.5,
            yMin: 35.0,
            yMax: 40.0,
          },
          {
            name: "Odlaw",
            avatarUrl: "/images/odlaw.svg",
            xMin: 21.0,
            xMax: 26.0,
            yMin: 32.5,
            yMax: 37.5,
          },
      ],
    },
    {
      name: "The Gobbling Gluttons",
      imageUrl: "/images/waldo-gluttons.jpg",
      characters: [
        // The source dataset includes Waldo labels; this map intentionally
        // asks the player to find Waldo only.
        { name: "Waldo", avatarUrl: "/images/waldo.svg", xMin: 90, xMax: 99, yMin: 27, yMax: 38 },
      ],
    },
  ];

  for (const mapData of maps) {
    const { characters, ...map } = mapData;
    const existingMap = await prisma.map.findFirst({
      where: { OR: [{ name: map.name }, { name: "The Colorful Crowd" }] },
    });
    const data = { ...map, characters: { deleteMany: {}, create: characters } };
    const created = existingMap
      ? await prisma.map.update({ where: { id: existingMap.id }, data })
      : await prisma.map.create({ data: { ...map, characters: { create: characters } } });
    console.log(`Seeded map: "${created.name}" with ID: ${created.id}`);
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
