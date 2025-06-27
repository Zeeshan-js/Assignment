import { PrismaClient } from "../packages/db/src/generated/prisma";

const client = new PrismaClient()

export const db = client;