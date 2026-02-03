import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string; contactId: string }> };

// PATCH /api/clients/[id]/contacts/[contactId] - обновить контакт
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, contactId } = await params;

  try {
    const data = await request.json();

    const contact = await prisma.clientContact.findFirst({
      where: { id: contactId, clientId: id },
    });

    if (!contact) {
      return NextResponse.json({ error: "Контакт не найден" }, { status: 404 });
    }

    // Если делаем контакт основным, сбросить у остальных
    if (data.isPrimary && !contact.isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updatedContact = await prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.position !== undefined && {
          position: data.position?.trim() || null,
        }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      },
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления контакта" },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]/contacts/[contactId] - удалить контакт
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, contactId } = await params;

  try {
    const contact = await prisma.clientContact.findFirst({
      where: { id: contactId, clientId: id },
    });

    if (!contact) {
      return NextResponse.json({ error: "Контакт не найден" }, { status: 404 });
    }

    await prisma.clientContact.delete({
      where: { id: contactId },
    });

    // Если удалили основной контакт, сделать основным первый оставшийся
    if (contact.isPrimary) {
      const firstContact = await prisma.clientContact.findFirst({
        where: { clientId: id },
        orderBy: { createdAt: "asc" },
      });

      if (firstContact) {
        await prisma.clientContact.update({
          where: { id: firstContact.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contact error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления контакта" },
      { status: 500 }
    );
  }
}
