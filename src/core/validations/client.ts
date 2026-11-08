import { z } from "zod";

export const ClientSchema = z.object({
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(150, "El nombre no puede exceder 150 caracteres")
    .trim(),
  phone_whatsapp: z
    .string()
    .min(10, "El teléfono de WhatsApp debe tener al menos 10 dígitos")
    .max(20, "Teléfono inválido")
    .regex(/^[0-9+\s()-]+$/, "El teléfono solo debe contener números"),
  email: z.string().email("Correo electrónico inválido").optional().nullable(),
  notes: z
    .string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional()
    .nullable(),
});

export const ClientAddressSchema = z.object({
  alias: z
    .string()
    .min(
      2,
      "El nombre de la dirección debe tener al menos 2 caracteres (Ej. 'Casa de su mamá')",
    )
    .max(100, "El alias es demasiado largo")
    .trim(),
  address_text: z
    .string()
    .min(5, "Escribe una dirección válida con calle o colonia")
    .trim(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  delivery_notes: z
    .string()
    .max(500, "Las referencias son demasiado largas")
    .optional()
    .nullable(),
  is_default: z.boolean().default(false),
});

export type ClientInput = z.infer<typeof ClientSchema>;
export type ClientAddressInput = z.infer<typeof ClientAddressSchema>;
