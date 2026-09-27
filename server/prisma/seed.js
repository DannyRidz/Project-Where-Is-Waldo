import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear any existing data
  await prisma.score.deleteMany();
  await prisma.gameSession.deleteMany();
  await prisma.character.deleteMany();
  await prisma.map.deleteMany();

  // Create the main Waldo beach map with 3 target characters
  const beachMap = await prisma.map.create({
    data: {
      name: "Waldo at the Beach",
      imageUrl: "/images/waldo-beach.jpg",
      characters: {
        create: [
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
    },
  });

  console.log(`Seeded map: "${beachMap.name}" with ID: ${beachMap.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
