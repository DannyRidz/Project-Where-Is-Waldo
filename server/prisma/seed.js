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
      imageUrl:
        "https://raw.githubusercontent.com/TheOdinProject/curriculum/main/react/react_and_the_backend/project_wheres_waldo_a_photo_tagging_app/imgs/waldo.jpg",
      characters: {
        create: [
          {
            name: "Waldo",
            avatarUrl:
              "https://upload.wikimedia.org/wikipedia/en/b/bb/Where%27s_Wally_character.png",
            xMin: 60.0,
            xMax: 63.5,
            yMin: 32.5,
            yMax: 36.5,
          },
          {
            name: "Wizard Whitebeard",
            avatarUrl:
              "https://static.wikia.nocookie.net/waldo/images/c/c6/Wizard_Whitebeard.png",
            xMin: 86.5,
            xMax: 89.5,
            yMin: 35.5,
            yMax: 39.5,
          },
          {
            name: "Odlaw",
            avatarUrl:
              "https://static.wikia.nocookie.net/waldo/images/7/77/Odlaw.png",
            xMin: 22.0,
            xMax: 25.0,
            yMin: 33.0,
            yMax: 37.0,
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
