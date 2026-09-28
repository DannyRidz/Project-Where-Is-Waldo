import "dotenv/config";
import { closeSync, mkdirSync, openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("file:")) {
  throw new Error("DATABASE_URL must be a SQLite file: URL");
}

const prismaDirectory = fileURLToPath(new URL("../prisma/", import.meta.url));
const databasePath = path.resolve(prismaDirectory, databaseUrl.slice(5));
mkdirSync(path.dirname(databasePath), { recursive: true });
// Append mode creates a missing file without overwriting existing scores.
closeSync(openSync(databasePath, "a"));
