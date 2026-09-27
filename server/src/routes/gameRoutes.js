import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

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
    const mapId = parseInt(req.params.id, 10);
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
    const { mapId } = req.body;
    if (!mapId) {
      return res.status(400).json({ error: "mapId is required" });
    }

    const session = await prisma.gameSession.create({
      data: {
        mapId: parseInt(mapId, 10),
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

    if (characterId === undefined || x === undefined || y === undefined) {
      return res
        .status(400)
        .json({ error: "characterId, x, and y coordinates are required" });
    }

    // Verify session exists
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Invalid or expired session" });
    }

    // Look up the character's secret coordinate box
    const character = await prisma.character.findUnique({
      where: { id: parseInt(characterId, 10) },
    });

    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Check if clicked percentage (x, y) falls inside the bounding box
    const isCorrect =
      x >= character.xMin &&
      x <= character.xMax &&
      y >= character.yMin &&
      y <= character.yMax;

    res.json({
      isCorrect,
      characterId: character.id,
      characterName: character.name,
    });
  } catch (error) {
    console.error("Error validating coordinates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Finish the game session and record high score
router.post("/sessions/:sessionId/finish", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { playerName } = req.body;

    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ error: "Player name is required" });
    }

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const endTime = new Date();
    // Calculate elapsed time in seconds from server start time
    const timeInSeconds =
      (endTime.getTime() - new Date(session.startTime).getTime()) / 1000;

    // Update session with end time
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { endTime },
    });

    // Save to Leaderboard
    const score = await prisma.score.create({
      data: {
        playerName: playerName.trim(),
        timeInSeconds: parseFloat(timeInSeconds.toFixed(2)),
        mapId: session.mapId,
      },
    });

    res.json({
      message: "Score recorded successfully!",
      score,
    });
  } catch (error) {
    console.error("Error finishing session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. Get Top 10 High Scores for a map
router.get("/maps/:id/scores", async (req, res) => {
  try {
    const mapId = parseInt(req.params.id, 10);
    const topScores = await prisma.score.findMany({
      where: { mapId },
      orderBy: { timeInSeconds: "asc" },
      take: 10,
    });

    res.json(topScores);
  } catch (error) {
    console.error("Error fetching scores:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
