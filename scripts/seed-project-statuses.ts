import { PrismaClient, ProjectStatusType } from "@prisma/client";

const prisma = new PrismaClient();

const defaultStatuses = [
  {
    id: "status-lead",
    name: "Лид",
    color: "#6b7280",
    order: 1,
    type: ProjectStatusType.LEAD,
    isDefault: false,
  },
  {
    id: "status-negotiation",
    name: "Переговоры",
    color: "#f59e0b",
    order: 2,
    type: ProjectStatusType.NEGOTIATION,
    isDefault: false,
  },
  {
    id: "status-contract",
    name: "Договор",
    color: "#3b82f6",
    order: 3,
    type: ProjectStatusType.CONTRACT,
    isDefault: false,
  },
  {
    id: "status-work",
    name: "В работе",
    color: "#8b5cf6",
    order: 4,
    type: ProjectStatusType.WORK,
    isDefault: true, // Статус по умолчанию для новых проектов
  },
  {
    id: "status-done",
    name: "Завершён",
    color: "#22c55e",
    order: 5,
    type: ProjectStatusType.DONE,
    isDefault: false,
  },
  {
    id: "status-cancelled",
    name: "Отменён",
    color: "#ef4444",
    order: 6,
    type: ProjectStatusType.CANCELLED,
    isDefault: false,
  },
];

async function main() {
  console.log("Seeding project statuses...");

  for (const status of defaultStatuses) {
    await prisma.projectStatus.upsert({
      where: { id: status.id },
      update: {
        name: status.name,
        color: status.color,
        order: status.order,
        type: status.type,
        isDefault: status.isDefault,
      },
      create: status,
    });
    console.log(`  ✓ ${status.name}`);
  }

  console.log("\nProject statuses seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding project statuses:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
