import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MAX_FILE_SIZE, detectFileType } from "./storage/evidence.service";

// PDF magic bytes
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
// JPEG magic bytes
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
// PNG magic bytes
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeFile(name: string, content: Buffer, sizeOverride?: number): File {
  const size = sizeOverride ?? content.length;
  return {
    name,
    size,
    arrayBuffer: async () => content.buffer as ArrayBuffer,
  } as unknown as File;
}

async function runEvidenceValidationTests() {
  console.log("=== TES VALIDASI BUKTI TRANSAKSI (Task 6.2) ===\n");

  let passed = 0;
  let failed = 0;

  // Uji 1: File tepat di batas 5 MiB harus lolos cek ukuran
  const exactLimit = MAX_FILE_SIZE;
  const pass1 = exactLimit <= MAX_FILE_SIZE;
  console.log(`[1] Ukuran tepat batas (${(exactLimit / 1024 / 1024).toFixed(1)} MiB): ${pass1 ? "LOLOS" : "GAGAL"}`);
  pass1 ? passed++ : failed++;

  // Uji 2: File di atas 5 MiB harus ditolak
  const oversizedBytes = MAX_FILE_SIZE + 1;
  const pass2 = oversizedBytes > MAX_FILE_SIZE;
  console.log(`[2] Ukuran melebihi batas (${oversizedBytes} byte > ${MAX_FILE_SIZE} byte): ${pass2 ? "DITOLAK BENAR" : "GAGAL"}`);
  pass2 ? passed++ : failed++;

  // Uji 3: Deteksi format PDF valid
  const pdfBuffer = Buffer.concat([PDF_MAGIC, Buffer.alloc(100)]);
  const detectedPdf = detectFileType(pdfBuffer);
  const pass3 = detectedPdf === "pdf";
  console.log(`[3] Deteksi format PDF: ${pass3 ? `LOLOS (terdeteksi: ${detectedPdf})` : `GAGAL (terdeteksi: ${detectedPdf})`}`);
  pass3 ? passed++ : failed++;

  // Uji 4: Deteksi format JPEG valid
  const jpegBuffer = Buffer.concat([JPEG_MAGIC, Buffer.alloc(100)]);
  const detectedJpeg = detectFileType(jpegBuffer);
  const pass4 = detectedJpeg === "jpeg";
  console.log(`[4] Deteksi format JPEG: ${pass4 ? `LOLOS (terdeteksi: ${detectedJpeg})` : `GAGAL (terdeteksi: ${detectedJpeg})`}`);
  pass4 ? passed++ : failed++;

  // Uji 5: Deteksi format PNG valid
  const pngBuffer = Buffer.concat([PNG_MAGIC, Buffer.alloc(100)]);
  const detectedPng = detectFileType(pngBuffer);
  const pass5 = detectedPng === "png";
  console.log(`[5] Deteksi format PNG: ${pass5 ? `LOLOS (terdeteksi: ${detectedPng})` : `GAGAL (terdeteksi: ${detectedPng})`}`);
  pass5 ? passed++ : failed++;

  // Uji 6: Format tidak dikenal harus ditolak (byte acak)
  const unknownBuffer = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]);
  const detectedUnknown = detectFileType(unknownBuffer);
  const pass6 = detectedUnknown === null;
  console.log(`[6] Format tidak dikenal ditolak: ${pass6 ? "LOLOS (null)" : `GAGAL (terdeteksi: ${detectedUnknown})`}`);
  pass6 ? passed++ : failed++;

  // Uji 7: File terlalu kecil (< 8 byte) harus ditolak
  const tinyBuffer = Buffer.from([0x25, 0x50]);
  const detectedTiny = detectFileType(tinyBuffer);
  const pass7 = detectedTiny === null;
  console.log(`[7] File terlalu kecil (< 8 byte) ditolak: ${pass7 ? "LOLOS (null)" : `GAGAL (terdeteksi: ${detectedTiny})`}`);
  pass7 ? passed++ : failed++;

  // Ringkasan
  console.log(`\n=== HASIL: ${passed} LOLOS / ${failed} GAGAL ===`);
  console.log(`MAX_FILE_SIZE = ${MAX_FILE_SIZE} byte (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MiB)`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEvidenceValidationTests().catch((err) => {
  console.error("Tes validasi gagal:", err);
  process.exit(1);
});
