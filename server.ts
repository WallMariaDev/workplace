import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-side Gemini API Handler
  app.post("/api/ai/process", async (req, res) => {
    try {
      const {
        prompt,
        inputText,
        systemPrompt,
        model = "gemini-3.6-flash",
        apiKey: userApiKey,
        temperature = 0.7,
      } = req.body;

      if (!prompt && !inputText) {
        return res.status(400).json({ error: "Missing required prompt or input text" });
      }

      const apiKey = userApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          error: "No Gemini API Key provided. Please configure your API key in Settings or AI Studio Secrets.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Construct combined prompt text
      let fullContent = "";
      if (prompt && inputText) {
        if (prompt.includes("{text}")) {
          fullContent = prompt.replace(/{text}/g, inputText);
        } else {
          fullContent = `${prompt}\n\nInput Text:\n${inputText}`;
        }
      } else {
        fullContent = prompt || inputText;
      }

      const effectiveModel = model.startsWith("gemini") ? model : "gemini-3.6-flash";

      const config: any = {
        temperature: Number(temperature) || 0.7,
      };

      if (systemPrompt && systemPrompt.trim()) {
        config.systemInstruction = systemPrompt.trim();
      }

      const startTime = Date.now();
      const response = await ai.models.generateContent({
        model: effectiveModel,
        contents: fullContent,
        config,
      });

      const responseText = response.text || "No response text generated.";
      const executionTimeMs = Date.now() - startTime;

      return res.json({
        output: responseText,
        model: effectiveModel,
        provider: "gemini",
        executionTimeMs,
      });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      const errorMessage = err?.message || "An error occurred while generating AI response.";
      return res.status(500).json({
        error: errorMessage,
        details: err.toString(),
      });
    }
  });

  // Vite middleware for dev or static serving for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`QuickKeys AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
