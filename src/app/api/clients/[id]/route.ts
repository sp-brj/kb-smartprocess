import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/clients/[id] - детали клиента
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      bankAccounts: { orderBy: [{ isPrimary: "desc" }, { bankName: "asc" }] },
      projects: {
        include: {
          status: true,
          manager: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { projects: true } },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  return NextResponse.json(client);
}

// PATCH /api/clients/[id] - обновить клиента
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await request.json();

    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.inn !== undefined && { inn: data.inn?.trim() || null }),
        ...(data.kpp !== undefined && { kpp: data.kpp?.trim() || null }),
        ...(data.ogrn !== undefined && { ogrn: data.ogrn?.trim() || null }),
        ...(data.legalAddress !== undefined && {
          legalAddress: data.legalAddress?.trim() || null,
        }),
        ...(data.actualAddress !== undefined && {
          actualAddress: data.actualAddress?.trim() || null,
        }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        contacts: true,
        bankAccounts: true,
        _count: { select: { projects: true } },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления клиента" },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - архивировать клиента (не удаляем полностью)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }

    // Архивируем вместо удаления
    await prisma.client.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json(
      { error: "Ошибка архивации клиента" },
      { status: 500 }
    );
  }
}
