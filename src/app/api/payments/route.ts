import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/payments - список оплат
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};

  if (projectId) where.projectId = projectId;
  if (status) where.status = status;

  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, Date>).gte = new Date(from);
    if (to) (where.date as Record<string, Date>).lte = new Date(to);
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true, client: { select: { name: true } } },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}

// POST /api/payments - создать оплату
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, amount, date, type, status, documentNumber, documentDate, description } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Проект обязателен" }, { status: 400 });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Сумма обязательна" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Дата обязательна" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "Тип оплаты обязателен" }, { status: 400 });
    }

    // Проверяем существование проекта
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        projectId,
        amount: parseFloat(amount),
        date: new Date(date),
        type,
        status: status || "PENDING",
        documentNumber: documentNumber?.trim() || null,
        documentDate: documentDate ? new Date(documentDate) : null,
        description: description?.trim() || null,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Ошибка создания оплаты" }, { status: 500 });
  }
}
