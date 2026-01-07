/**
 * Create a test user for E2E tests
 * Usage: npx tsx scripts/seed-test-user.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_USER_EMAIL = "e2e-test@example.com";
const TEST_USER_PASSWORD = "testpassword123";

async function seedTestUser() {
  console.log("Creating test user for E2E tests...\n");

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: TEST_USER_EMAIL },
  });

  if (existingUser) {
    console.log(`Test user already exists: ${TEST_USER_EMAIL}`);
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: "E2E Test User",
      role: "EDITOR",
    },
  });

  console.log(`Created test user: ${user.email}`);
  console.log(`Password: ${TEST_USER_PASSWORD}`);
}

seedTestUser()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
