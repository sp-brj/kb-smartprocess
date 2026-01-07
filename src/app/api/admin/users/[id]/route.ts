import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/admin/users/[id] - delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Нельзя удалить самого себя" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Delete user (articles will remain with authorId pointing to deleted user)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Пользователь удалён" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении пользователя" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - update user role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { role } = await request.json();

    // Validate role
    if (!["ADMIN", "EDITOR", "READER"].includes(role)) {
      return NextResponse.json(
        { error: "Неверная роль" },
        { status: 400 }
      );
    }

    // Prevent changing own role
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Нельзя изменить свою роль" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении пользователя" },
      { status: 500 }
    );
  }
}
