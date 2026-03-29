import cors from "cors";
import { prismaClient } from "db/client";
import express from "express";
import { ArtifactProcessor } from "./parser";
import { systemPrompt } from "./systemPrompt";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Hello from the worker!" });
});
app.post("/prompt", async (req, res) => {
  const { prompt, projectId } = req.body;

  if (!prompt || !projectId) {
    res.status(400).json({ message: "prompt and projectId are required" });
    return;
  }

  await prismaClient.prompt.create({
    data: { content: prompt, projectId, type: "USER" },
  });

  const allPrompts = await prismaClient.prompt.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  const history = allPrompts.slice(0, -1).map((p) => ({
    role: p.type === "USER" ? "user" : "model",
    parts: [{ text: p.content }],
  }));

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt("NEXTJS"),
  });

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chat = model.startChat({ history });
  const streamResult = await chat.sendMessageStream(prompt);

  let fullText = "";

  const processor = new ArtifactProcessor(
    "",
    // onFileContent — fires each time a complete file is parsed
    (filePath, fileContent) => {
      res.write(
        `data: ${JSON.stringify({ type: "file", filePath, fileContent })}\n\n`
      );
    },
    // onShellCommand — fires each time a complete shell action is parsed
    (shellCommand) => {
      res.write(
        `data: ${JSON.stringify({ type: "shell", shellCommand })}\n\n`
      );
    }
  );

  for await (const chunk of streamResult.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;

    // Feed chunk into processor and attempt to parse completed actions
    processor.append(chunkText);
    processor.parse();

    // Also stream raw chunk to client so UI can show live typing effect
    res.write(`data: ${JSON.stringify({ type: "chunk", chunk: chunkText })}\n\n`);
  }

  // Save full LLM response to DB
  await prismaClient.prompt.create({
    data: { content: fullText, projectId, type: "SYSTEM" },
  });

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  res.end();
});

app.listen(9091, () => {
  console.log("Worker is running on port 9091");
});
