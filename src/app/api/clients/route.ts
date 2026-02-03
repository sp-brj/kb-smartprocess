import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

// GET /api/clients - список клиентов с фильтрацией
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // ACTIVE | ARCHIVED
  const search = searchParams.get("search");

  const clients = await prisma.client.findMany({
    where: {
      ...(status && { status: status as "ACTIVE" | "ARCHIVED" }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { inn: { contains: search } },
        ],
      }),
    },
    include: {
      contacts: {
        where: { isPrimary: true },
        take: 1,
      },
      _count: { select: { projects: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

// POST /api/clients - создание клиента
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();

    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: "Название компании обязательно" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name: data.name.trim(),
        inn: data.inn?.trim() || null,
        kpp: data.kpp?.trim() || null,
        ogrn: data.ogrn?.trim() || null,
        legalAddress: data.legalAddress?.trim() || null,
        actualAddress: data.actualAddress?.trim() || null,
        notes: data.notes?.trim() || null,
        status: data.status || "ACTIVE",
      },
      include: {
        contacts: true,
        bankAccounts: true,
        _count: { select: { projects: true } },
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Ошибка создания клиента" },
      { status: 500 }
    );
  }
}
