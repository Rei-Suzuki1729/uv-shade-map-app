import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // タイル配信エンドポイント
  // GET /tiles/shade/{timeBucket}/{z}/{x}/{y}.png
  const tilesDir = path.join(process.cwd(), 'tiles', 'shade');

  // タイルディレクトリが存在しない場合は作成
  if (!fs.existsSync(tilesDir)) {
    fs.mkdirSync(tilesDir, { recursive: true });
    console.log(`[tiles] Created tiles directory: ${tilesDir}`);
  }

  app.get("/tiles/shade/:timeBucket/:z/:x/:y.png", (req, res) => {
    const { timeBucket, z, x, y } = req.params;
    const tilePath = path.join(tilesDir, timeBucket, z, x, `${y}.png`);

    // ファイルが存在するか確認
    if (fs.existsSync(tilePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ
      res.sendFile(tilePath);
    } else {
      // タイルが存在しない場合は透明なPNGを返す（地図が壊れないように）
      res.status(404).json({
        error: 'Tile not found',
        message: `Tile not generated yet: ${timeBucket}/${z}/${x}/${y}.png`
      });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
