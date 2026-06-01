import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { slugifyFolderName, generateUniqueFolderSlug } from "@/lib/folders";

async function getFolderDepth(folderId: string | null): Promise<number> {
  if (!folderId) return -1;
  let depth = 0;
  let currentId: string | null = folderId;
  while (currentId) {
    const folder: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!folder) break;
    currentId = folder.parentId;
    if (currentId) depth++;
  }
  return depth;
}

async function getSubtreeHeight(folderId: string): Promise<number> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });
  if (children.length === 0) return 0;
  const heights = await Promise.all(children.map((c) => getSubtreeHeight(c.id)));
  return 1 + Math.max(...heights);
}

async function isDescendant(candidateId: string, ancestorId: string): Promise<boolean> {
  let currentId: string | null = candidateId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    const folder: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = folder?.parentId ?? null;
  }
  return false;
}

// GET /api/folders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: {
      children: true,
      articles: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!folder) {
    return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
  }

  return NextResponse.json(folder);
}

// PATCH /api/folders/[id] - rename folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, parentId } = body as { name?: string; parentId?: string | null };

    const current = await prisma.folder.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
    }

    const updateData: { name?: string; slug?: string; parentId?: string | null } = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Название не может быть пустым" }, { status: 400 });
      }
      const newSlugBase = slugifyFolderName(trimmedName);
      if (!newSlugBase) {
        return NextResponse.json({ error: "Недопустимое название" }, { status: 400 });
      }
      const newSlug = current.name === trimmedName
        ? current.slug
        : await generateUniqueFolderSlug(trimmedName, id);
      updateData.name = trimmedName;
      updateData.slug = newSlug;
    }

    if ("parentId" in body) {
      const newParentId = parentId ?? null;

      if (newParentId === id) {
        return NextResponse.json({ error: "Нельзя переместить папку в себя" }, { status: 400 });
      }

      if (newParentId !== null) {
        const parentExists = await prisma.folder.findUnique({ where: { id: newParentId } });
        if (!parentExists) {
          return NextResponse.json({ error: "Родительская папка не найдена" }, { status: 404 });
        }

        const circular = await isDescendant(newParentId, id);
        if (circular) {
          return NextResponse.json(
            { error: "Нельзя переместить папку в её собственный подкаталог" },
            { status: 400 }
          );
        }

        const parentDepth = await getFolderDepth(newParentId);
        const subtreeHeight = await getSubtreeHeight(id);
        if (parentDepth + 1 + subtreeHeight > 2) {
          return NextResponse.json(
            { error: "Превышена максимальная глубина вложенности (3 уровня)" },
            { status: 400 }
          );
        }
      }

      updateData.parentId = newParentId;
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Ошибка обновления папки" }, { status: 500 });
  }
}

// DELETE /api/folders/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if folder has articles
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: { _count: { select: { articles: true, children: true } } },
    });

    if (!folder) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
    }

    if (folder._count.articles > 0 || folder._count.children > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить папку с содержимым" },
        { status: 400 }
      );
    }

    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete folder error:", error);
    return NextResponse.json({ error: "Ошибка удаления папки" }, { status: 500 });
  }
}
