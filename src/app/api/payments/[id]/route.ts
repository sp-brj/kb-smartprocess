import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/payments/[id] - детали оплаты
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true, client: { select: { name: true } } },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Оплата не найдена" }, { status: 404 });
  }

  return NextResponse.json(payment);
}

// PATCH /api/payments/[id] - обновить оплату
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) {
    return NextResponse.json({ error: "Оплата не найдена" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { amount, date, type, status, documentNumber, documentDate, description } = body;

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(documentNumber !== undefined && { documentNumber: documentNumber?.trim() || null }),
        ...(documentDate !== undefined && { documentDate: documentDate ? new Date(documentDate) : null }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ error: "Ошибка обновления оплаты" }, { status: 500 });
  }
}

// DELETE /api/payments/[id] - удалить оплату
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) {
    return NextResponse.json({ error: "Оплата не найдена" }, { status: 404 });
  }

  await prisma.payment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
