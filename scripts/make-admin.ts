/**
 * Script to make a user an admin
 * Usage: npx tsx scripts/make-admin.ts <email>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    // If no email provided, list all users
    console.log("\nСписок пользователей:");
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true },
    });

    if (users.length === 0) {
      console.log("  Пользователей нет");
    } else {
      users.forEach((u) => {
        console.log(`  ${u.email} - ${u.role} ${u.name ? `(${u.name})` : ""}`);
      });
    }

    console.log("\nИспользование: npx tsx scripts/make-admin.ts <email>");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`Пользователь с email ${email} не найден`);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`${email} уже является администратором`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`✅ ${email} теперь администратор`);
}

makeAdmin()
  .catch((e) => {
    console.error("Ошибка:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
