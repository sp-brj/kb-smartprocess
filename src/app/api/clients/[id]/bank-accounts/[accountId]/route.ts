import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string; accountId: string }> };

// PATCH /api/clients/[id]/bank-accounts/[accountId] - обновить реквизиты
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, accountId } = await params;

  try {
    const data = await request.json();

    const account = await prisma.clientBankAccount.findFirst({
      where: { id: accountId, clientId: id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Банковские реквизиты не найдены" },
        { status: 404 }
      );
    }

    // Если делаем основными, сбросить у остальных
    if (data.isPrimary && !account.isPrimary) {
      await prisma.clientBankAccount.updateMany({
        where: { clientId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updatedAccount = await prisma.clientBankAccount.update({
      where: { id: accountId },
      data: {
        ...(data.bankName !== undefined && { bankName: data.bankName.trim() }),
        ...(data.bik !== undefined && { bik: data.bik.trim() }),
        ...(data.accountNumber !== undefined && {
          accountNumber: data.accountNumber.trim(),
        }),
        ...(data.corrAccount !== undefined && {
          corrAccount: data.corrAccount?.trim() || null,
        }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      },
    });

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error("Update bank account error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления реквизитов" },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]/bank-accounts/[accountId] - удалить реквизиты
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, accountId } = await params;

  try {
    const account = await prisma.clientBankAccount.findFirst({
      where: { id: accountId, clientId: id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Банковские реквизиты не найдены" },
        { status: 404 }
      );
    }

    await prisma.clientBankAccount.delete({
      where: { id: accountId },
    });

    // Если удалили основные, сделать основными первые оставшиеся
    if (account.isPrimary) {
      const firstAccount = await prisma.clientBankAccount.findFirst({
        where: { clientId: id },
        orderBy: { createdAt: "asc" },
      });

      if (firstAccount) {
        await prisma.clientBankAccount.update({
          where: { id: firstAccount.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete bank account error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления реквизитов" },
      { status: 500 }
    );
  }
}
