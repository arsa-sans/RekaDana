import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Format alamat email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal terdiri dari 8 karakter."),
  name: z.string().min(2, "Nama minimal 2 karakter."),
});

export const loginSchema = z.object({
  email: z.string().email("Format alamat email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(3, "Nama organisasi minimal 3 karakter."),
  slug: z
    .string()
    .min(3, "Slug minimal 3 karakter.")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung."),
});

export const addMemberSchema = z.object({
  email: z.string().email("Format email anggota tidak valid."),
  role: z.enum(["ketua_kegiatan", "bendahara", "panitia_anggota"], {
    message: "Peran harus salah satu dari: ketua_kegiatan, bendahara, panitia_anggota.",
  }),
});

export const createEventSchema = z.object({
  name: z.string().min(3, "Nama kegiatan minimal 3 karakter."),
  description: z.string().optional(),
  participantCount: z.number().int().nonnegative("Jumlah peserta tidak boleh negatif.").default(0),
  availableFunds: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Format dana tersedia harus berupa angka desimal positif.")
    .default("0"),
});

export const updateEventSchema = createEventSchema.partial();

export const createScenarioSchema = z.object({
  name: z.string().min(2, "Nama skenario minimal 2 karakter (misal: Hemat, Standar)."),
  description: z.string().optional(),
  participantCount: z.number().int().nonnegative().optional(),
});

export const createScenarioItemSchema = z.object({
  name: z.string().min(2, "Nama kebutuhan barang atau jasa minimal 2 karakter."),
  category: z.string().optional(),
  priority: z.enum(["required", "normal", "optional"]).default("normal"),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Jumlah kuantitas harus berupa angka valid.")
    .refine((v) => parseFloat(v) > 0, "Kuantitas harus lebih dari 0."),
  estimatedUnitCost: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Estimasi biaya satuan harus berupa angka valid.")
    .refine((v) => parseFloat(v) >= 0, "Biaya satuan tidak boleh negatif."),
  isIncluded: z.boolean().default(true),
  notes: z.string().optional(),
});

export const updateScenarioItemSchema = createScenarioItemSchema.partial();

export const rejectReasonSchema = z.object({
  reason: z.string().min(5, "Alasan penolakan wajib diisi minimal 5 karakter."),
});

export const createExpenseRequestSchema = z.object({
  budgetItemId: z.string().uuid("ID item anggaran tidak valid.").optional(),
  title: z.string().min(3, "Judul permintaan pengeluaran minimal 3 karakter."),
  description: z.string().optional(),
  requestedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Format nominal pengeluaran tidak valid.")
    .refine((v) => parseFloat(v) > 0, "Nominal pengeluaran harus lebih besar dari 0."),
});

export const approveExpenseRequestSchema = z.object({
  approvedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Format nominal disetujui tidak valid.")
    .refine((v) => parseFloat(v) > 0, "Nominal disetujui harus lebih besar dari 0.")
    .optional(),
});

export const postPaymentSchema = z.object({
  idempotencyKey: z
    .string()
    .min(8, "Kunci idempotensi (idempotency key) minimal 8 karakter unik untuk mencegah pembayaran duplikat."),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Format nominal pembayaran tidak valid.")
    .refine((v) => parseFloat(v) > 0, "Nominal pembayaran harus lebih dari 0."),
  notes: z.string().optional(),
});

export const reversePaymentSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Format nominal pembatalan tidak valid.")
    .refine((v) => parseFloat(v) > 0, "Nominal pembatalan harus lebih dari 0."),
  reason: z.string().min(5, "Alasan pembatalan (reversal) wajib diisi minimal 5 karakter."),
});
