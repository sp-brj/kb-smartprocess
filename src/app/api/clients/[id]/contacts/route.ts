import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/contacts - контакты клиента
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

  const contacts = await prisma.clientContact.findMany({
    where: { clientId: id },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(contacts);
}

// POST /api/clients/[id]/contacts - добавить контакт
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await request.json();

    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: "Имя контакта обязательно" },
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

    // Если это первый контакт или явно указан isPrimary, сделать основным
    const existingContacts = await prisma.clientContact.count({
      where: { clientId: id },
    });

    const isPrimary = data.isPrimary ?? existingContacts === 0;

    // Если новый контакт основной, сбросить у остальных
    if (isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId: id,
        name: data.name.trim(),
        position: data.position?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        isPrimary,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json(
      { error: "Ошибка создания контакта" },
      { status: 500 }
    );
  }
}
