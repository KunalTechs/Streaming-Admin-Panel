import { PrismaClient } from "@prisma/client";

// Create a single instance of the Prisma Client
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // Optional: shows SQL queries in your terminal
});

export default prisma;