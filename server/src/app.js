import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from a .env file if present
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route to verify server is alive
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Waldo Backend is running!" });
});

// Start listening for incoming connections
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
