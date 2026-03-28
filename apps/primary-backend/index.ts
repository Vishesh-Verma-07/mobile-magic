import cors from "cors";
import { prismaClient } from "db/client";
import express from "express";
import { authMiddleware } from "./middleware";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/project", authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  const userId = req.body.userId;
  // add logic to get useful name from prompt
  const description = prompt.split("\n")[0];
  const project = await prismaClient.project.create({ 
    data: { description, userId }
 });

  res.json({ ProjectId: project.id });
});


app.post("/projects", authMiddleware, async (req, res) => {
    const userId = req.body.userId;
    const projects = await prismaClient.project.findMany({
        where: { userId },
    });
    res.json(projects);
})

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
