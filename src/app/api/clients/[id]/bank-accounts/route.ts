import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/bank-accounts - банковские реквизиты клиента
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  const bankAccounts = await prisma.clientBankAccount.findMany({
    where: { clientId: id },
    orderBy: [{ isPrimary: "desc" }, { bankName: "asc" }],
  });

  return NextResponse.json(bankAccounts);
}

// POST /api/clients/[id]/bank-accounts - добавить банковские реквизиты
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await request.json();

    if (!data.bankName?.trim()) {
      return NextResponse.json(
        { error: "Название банка обязательно" },
        { status: 400 }
      );
    }

    if (!data.bik?.trim()) {
      return NextResponse.json({ error: "БИК обязателен" }, { status: 400 });
    }

    if (!data.accountNumber?.trim()) {
      return NextResponse.json(
        { error: "Расчётный счёт обязателен" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }

    // Если это первые реквизиты или явно указан isPrimary, сделать основными
    const existingAccounts = await prisma.clientBankAccount.count({
      where: { clientId: id },
    });

    const isPrimary = data.isPrimary ?? existingAccounts === 0;

    // Если новые реквизиты основные, сбросить у остальных
    if (isPrimary) {
      await prisma.clientBankAccount.updateMany({
        where: { clientId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const bankAccount = await prisma.clientBankAccount.create({
      data: {
        clientId: id,
        bankName: data.bankName.trim(),
        bik: data.bik.trim(),
        accountNumber: data.accountNumber.trim(),
        corrAccount: data.corrAccount?.trim() || null,
        isPrimary,
      },
    });

    return NextResponse.json(bankAccount, { status: 201 });
  } catch (error) {
    console.error("Create bank account error:", error);
    return NextResponse.json(
      { error: "Ошибка создания банковских реквизитов" },
      { status: 500 }
    );
  }
}
