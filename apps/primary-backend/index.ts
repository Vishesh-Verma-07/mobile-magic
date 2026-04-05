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

  console.log("Received request for projects with userId:", userId);
  if (!userId) {
    res.status(400).json({ message: "authenticated user is required" });
    return;
  }

  const projects = await prismaClient.project.findMany({
    where: { userId },
  });
  res.json(projects);
});

app.get("/projects/:projectId/prompts", authMiddleware, async (req, res) => {
  const projectIdParam = req.params.projectId;
  const projectId = Array.isArray(projectIdParam)
    ? projectIdParam[0]
    : projectIdParam;
  const userId = req.userId;

  if (!projectId || !userId) {
    res
      .status(400)
      .json({ message: "projectId and authenticated user are required" });
    return;
  }

  const project = await prismaClient.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  let prompts;
  try {
    prompts = await prismaClient.prompt.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    console.log(`Fetched ${prompts.length} prompts for projectId ${projectId}`);
  } catch (error) {
    console.error("Error fetching prompts:", error);
    res.status(500).json({ message: "Error fetching prompts" });
    return;
  }

  res.json({ prompts });
});

app.get("/projects/:projectId/actions", authMiddleware, async (req, res) => {
  const projectIdParam = req.params.projectId;
  const projectId = Array.isArray(projectIdParam)
    ? projectIdParam[0]
    : projectIdParam;
  const userId = req.userId;

  if (!projectId || !userId) {
    res
      .status(400)
      .json({ message: "projectId and authenticated user are required" });
    return;
  }

  const actions = await prismaClient.action.findMany({
    where: { projectId: projectId },
  });

  console.log(actions);

  res.json(actions);
});

app.listen(9090, () => {
  console.log("Server is running on port 9090");
});
