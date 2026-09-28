import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

function rejectRequest(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function calculateTime(session) {
  const milliseconds = session.endTime.getTime() - session.startTime.getTime();

  return Number((milliseconds / 1000).toFixed(2));
}

async function validateTransaction(callback) {
  // SQLite serializes writes. Retry a transaction rolled back by a competing tag.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(callback);
    } catch (error) {
      if (!["P2034", "P2028"].includes(error.code) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1)));
    }
  }
}

// 0. Fetch all maps
router.get("/maps", async (req, res) => {
  try {
    const maps = await prisma.map.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
    });
    res.json(maps);
  } catch (error) {
    console.error("Error fetching maps:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 1. Fetch map data and list of characters (WITHOUT coordinates)
router.get("/maps/:id", async (req, res) => {
  try {
    const mapId = Number(req.params.id);
    if (!Number.isInteger(mapId) || mapId < 1) return res.status(400).json({ error: "Invalid map ID." });
    const map = await prisma.map.findUnique({
      where: { id: mapId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        characters: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            // Notice: xMin, xMax, yMin, yMax are intentionally NOT selected!
          },
        },
      },
    });

    if (!map) {
      return res.status(404).json({ error: "Map not found" });
    }

    res.json(map);
  } catch (error) {
    console.error("Error fetching map:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. Start a new game session (records start time on server)
router.post("/sessions/start", async (req, res) => {
  try {
    const mapId = req.body.mapId;
    if (!Number.isInteger(mapId) || mapId < 1) {
      return res.status(400).json({ error: "mapId is required" });
    }

    const map = await prisma.map.findUnique({ where: { id: mapId } });
    if (!map) {
      return res.status(404).json({ error: "Map not found" });
    }

    const session = await prisma.gameSession.create({
      data: {
        mapId,
        startTime: new Date(),
      },
    });

    res.json({
      sessionId: session.id,
      startTime: session.startTime,
    });
  } catch (error) {
    console.error("Error starting session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Validate a character tag attempt
router.post("/sessions/:sessionId/validate", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { characterId, x, y } = req.body;

    if (
      !Number.isInteger(characterId) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 100 ||
      y < 0 ||
      y > 100
    ) {
      return res.status(400).json({
        error: "Provide a character ID and coordinates between 0 and 100.",
      });
    }

    const result = await validateTransaction(async (tx) => {
      const session = await tx.gameSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        rejectRequest(404, "Session not found.");
      }

      const character = await tx.character.findFirst({
        where: {
          id: characterId,
          mapId: session.mapId,
        },
      });

      if (!character) {
        rejectRequest(404, "Character not found on this map.");
      }

      const isCorrect =
        x >= character.xMin &&
        x <= character.xMax &&
        y >= character.yMin &&
        y <= character.yMax;

      if (!isCorrect) {
        if (session.endTime) rejectRequest(409, "This round has already finished.");
        return {
          isCorrect: false,
          completed: false,
        };
      }

      if (session.endTime) {
        const existingTag = await tx.foundTag.findUnique({ where: { sessionId_characterId: { sessionId, characterId } } });
        if (!existingTag) rejectRequest(409, "This round has already finished.");
      } else await tx.foundTag.upsert({
        where: {
          sessionId_characterId: {
            sessionId,
            characterId,
          },
        },
        update: {},
        create: {
          sessionId,
          characterId,
        },
      });

      const foundCount = await tx.foundTag.count({
        where: { sessionId },
      });

      const totalCharacters = await tx.character.count({
        where: { mapId: session.mapId },
      });

      const completed = totalCharacters > 0 && foundCount === totalCharacters;

      let timeInSeconds = null;
      let qualifiesForLeaderboard = false;

      if (completed) {
        // A retry after a lost final-tag response must return the same frozen time.
        const finishedSession = session.endTime ? session : await tx.gameSession.update({
          where: { id: sessionId },
          data: { endTime: new Date() },
        });

        timeInSeconds = calculateTime(finishedSession);

        const topScores = await tx.score.findMany({
          where: { mapId: session.mapId, sessionId: { not: null } },
          orderBy: [{ timeInSeconds: "asc" }, { id: "asc" }],
          take: 10,
        });

        qualifiesForLeaderboard =
          topScores.length < 10 ||
          timeInSeconds < topScores[topScores.length - 1].timeInSeconds;
      }

      return {
        isCorrect: true,
        characterId: character.id,
        characterName: character.name,
        marker: { x: (character.xMin + character.xMax) / 2, y: (character.yMin + character.yMax) / 2 },
        completed,
        timeInSeconds,
        qualifiesForLeaderboard,
      };
    });

    res.json(result);
  } catch (error) {
    if (!error.status) console.error("Validation failed:", error);

    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : "Could not validate this tag. Please try again.",
    });
  }
});

// 4. Finish the game session and record high score
router.post("/sessions/:sessionId/finish", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { playerName } = req.body;

    if (
      typeof playerName !== "string" ||
      !playerName.trim() ||
      playerName.trim().length > 30
    ) {
      return res.status(400).json({
        error: "Enter a name between 1 and 30 characters.",
      });
    }

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found.",
      });
    }

    if (!session.endTime) {
      return res.status(409).json({
        error: "Find all characters before submitting a score.",
      });
    }

    const score = await prisma.score.upsert({
      where: { sessionId },
      update: {},
      create: {
        sessionId,
        playerName: playerName.trim(),
        timeInSeconds: calculateTime(session),
        mapId: session.mapId,
      },
    });

    res.json({
      message: "Score saved.",
      score,
    });
  } catch (error) {
    if (error.code === "P2002") {
      const existing = await prisma.score.findUnique({ where: { sessionId: req.params.sessionId } });
      if (existing) return res.json({ message: "Score already saved.", score: existing });
    }
    console.error("Score submission failed:", error);

    res.status(error.code === "P2002" ? 409 : 500).json({
      error: "Could not save the score. Please try again.",
    });
  }
});

// 5. Get Top 10 High Scores for a map
router.get("/maps/:id/scores", async (req, res) => {
  try {
    const mapId = Number(req.params.id);
    if (!Number.isInteger(mapId) || mapId < 1) return res.status(400).json({ error: "Invalid map ID." });
    if (!(await prisma.map.findUnique({ where: { id: mapId } }))) return res.status(404).json({ error: "Map not found." });
    const topScores = await prisma.score.findMany({
      where: { mapId, sessionId: { not: null } },
      orderBy: [{ timeInSeconds: "asc" }, { id: "asc" }],
      take: 10,
    });

    res.json(topScores);
  } catch (error) {
    console.error("Error fetching scores:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
