import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "./generated/prisma/client.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from the db package first so monorepo cwd differences do not break Prisma.
loadEnv({ path: path.resolve(__dirname, ".env") });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is missing. Set it in packages/db/.env or your shell environment.");
}

const adapter = new PrismaPg({ connectionString });
const prismaClient = new PrismaClient({ adapter });

export { prismaClient };
