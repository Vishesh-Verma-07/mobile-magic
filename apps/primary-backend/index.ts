import cors from "cors";
import { prismaClient } from "db/client";
import express from "express";
import { authMiddleware } from "./middleware.ts";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/project", authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  const userId = req.userId;

  if (!prompt || !userId) {
    res
      .status(400)
      .json({ message: "prompt and authenticated user are required" });
    return;
  }

  const description = prompt.split("\n")[0];
  const project = await prismaClient.project.create({
    data: { description, userId },
  });

  res.json({ ProjectId: project.id });
});

app.post("/projects", authMiddleware, async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    res.status(400).json({ message: "authenticated user is required" });
    return;
  }

  const projects = await prismaClient.project.findMany({
    where: { userId },
  });
  res.json(projects);
});

app.listen(9090, () => {
  console.log("Server is running on port 8080");
});
