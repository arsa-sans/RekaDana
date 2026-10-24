import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { evidenceFiles } from "@/server/db/schema";
import { requireMembership, AuthorizationError } from "@/server/authorization/tenant";
import { logAuditEvent } from "@/server/audit/audit.service";

export const MAX_FILE_SIZE = 5_242_880; // 5 MiB in bytes

export function detectFileType(buffer: Buffer): "pdf" | "jpeg" | "png" | null {
  if (buffer.length < 8) return null;

  // PDF signature: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "pdf";
  }

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  return null;
}

export async function uploadEvidenceFile(
  userId: string,
  organizationId: string,
  file: File,
  links?: { paymentId?: string; expenseRequestId?: string }
) {
  await requireMembership(userId, organizationId);

  if (file.size > MAX_FILE_SIZE) {
    throw new AuthorizationError(
      `Ukuran file melebihi batas maksimal 5 MiB (5.242.880 byte). Ukuran file Anda: ${file.size} byte.`,
      "FILE_TOO_LARGE",
      413
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const detectedType = detectFileType(buffer);
  if (!detectedType) {
    throw new AuthorizationError(
      "Format file tidak didukung atau isi file tidak valid. Hanya file PDF, JPEG, dan PNG asli yang diperbolehkan.",
      "UNSUPPORTED_FILE_TYPE",
      415
    );
  }

  const contentHash = createHash("sha256").update(buffer).digest("hex");
  const ext = detectedType === "jpeg" ? "jpg" : detectedType;
  const objectKey = `${organizationId}/${randomUUID()}.${ext}`;

  // Local private storage path for dev / testing
  const storageDir = process.env.PRIVATE_STORAGE_PATH || "./private-storage";
  const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), storageDir, objectKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  const [evidence] = await db
    .insert(evidenceFiles)
    .values({
      objectKey,
      originalFileName: path.basename(file.name),
      detectedFileType: detectedType,
      fileSizeBytes: file.size,
      contentHash,
      uploadedBy: userId,
      organizationId,
      paymentId: links?.paymentId || null,
      expenseRequestId: links?.expenseRequestId || null,
    })
    .returning();

  await logAuditEvent({
    actorId: userId,
    organizationId,
    action: "evidence.uploaded",
    objectType: "evidence_file",
    objectId: evidence.id,
    afterState: {
      id: evidence.id,
      fileName: evidence.originalFileName,
      size: evidence.fileSizeBytes,
      type: evidence.detectedFileType,
    },
  });

  return evidence;
}

export async function getEvidenceDownload(userId: string, evidenceId: string) {
  const [evidence] = await db
    .select()
    .from(evidenceFiles)
    .where(eq(evidenceFiles.id, evidenceId))
    .limit(1);

  if (!evidence) {
    throw new AuthorizationError("File bukti tidak ditemukan.", "EVIDENCE_NOT_FOUND", 404);
  }

  if (evidence.organizationId) {
    await requireMembership(userId, evidence.organizationId);
  }

  const storageDir = process.env.PRIVATE_STORAGE_PATH || "./private-storage";
  const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), storageDir, evidence.objectKey);

  try {
    const fileBuffer = await fs.readFile(fullPath);
    return {
      evidence,
      fileBuffer,
      contentType:
        evidence.detectedFileType === "pdf"
          ? "application/pdf"
          : evidence.detectedFileType === "png"
          ? "image/png"
          : "image/jpeg",
    };
  } catch {
    throw new AuthorizationError("File fisik bukti tidak ditemukan di penyimpanan server.", "FILE_NOT_FOUND", 404);
  }
}
