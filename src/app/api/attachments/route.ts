import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Разрешённые типы файлов
const ALLOWED_TYPES = [
  // Документы
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Текст
  "text/plain",
  "text/csv",
  "application/json",
  // Архивы
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

const EXTENSION_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/json": "json",
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
  "application/x-7z-compressed": "7z",
};

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(request: NextRequest) {
  configureCloudinary();
  // Как и /api/upload: сессия ИЛИ API-ключ с правом write (раньше вложения
  // нельзя было загрузить из MCP — роут сидел на getServerSession).
  const auth = await authenticateRequest(request);

  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const articleId = formData.get("articleId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Проверка типа файла
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, JSON, ZIP, RAR, 7Z` },
        { status: 400 }
      );
    }

    // Проверка размера
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // Конвертируем файл в base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Загружаем в Cloudinary как raw файл
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: "knowledge-base/attachments",
      resource_type: "raw",
      public_id: `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
    });

    // Сохраняем в БД
    const attachment = await prisma.attachment.create({
      data: {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        filename: file.name,
        filesize: file.size,
        mimetype: file.type,
        articleId: articleId || null,
        uploadedBy: auth.userId!,
      },
    });

    return NextResponse.json({
      id: attachment.id,
      url: attachment.url,
      filename: attachment.filename,
      filesize: attachment.filesize,
      mimetype: attachment.mimetype,
      extension: EXTENSION_MAP[file.type] || "file",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE - удаление вложения
export async function DELETE(request: NextRequest) {
  configureCloudinary();
  // Как и /api/upload: сессия ИЛИ API-ключ с правом write (раньше вложения
  // нельзя было загрузить из MCP — роут сидел на getServerSession).
  const auth = await authenticateRequest(request);

  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("id");

    if (!attachmentId) {
      return NextResponse.json({ error: "No attachment ID provided" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Удалять может только загрузивший или ADMIN (иначе IDOR — удаление чужого).
    if (attachment.uploadedBy !== auth.userId && auth.userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Удаляем из Cloudinary
    await cloudinary.uploader.destroy(attachment.publicId, { resource_type: "raw" });

    // Удаляем из БД
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
