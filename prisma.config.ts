// Plan (pseudocode)
// 1. Keep current Prisma config structure unchanged.
// 2. Remove direct usage of global `process` to avoid Node global type dependency.
// 3. Read `.env` values from `dotenv.config()` result instead.
// 4. Extract `DATABASE_URL` from `parsed` output.
// 5. Add a guard: throw a clear error if `DATABASE_URL` is missing.
// 6. Pass the validated `databaseUrl` into `datasource.url`.

// filepath: c:\Users\junay\Desktop\HireHubJA\hh\prisma.config.ts
import dotenv from "dotenv"; // .env load
import { defineConfig } from "prisma/config";

const env = dotenv.config();
const databaseUrl = env.parsed?.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});