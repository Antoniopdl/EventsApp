import { z } from "zod";

export const BookingItemSchema = z.object({
  item_id: z.string().uuid({ message: "ID de artículo inválido" }),
  quantity: z
    .number()
    .int()
    .positive({ message: "La cantidad debe ser mayor a 0" }),
  unit_price_applied: z
    .number()
    .nonnegative({ message: "El precio unitario no puede ser negativo" }),
});

export const CreateBookingSchema = z
  .object({
    client_id: z.string().uuid({ message: "Cliente requerido" }),
    start_datetime: z
      .string()
      .datetime({ message: "Fecha de inicio inválida" }),
    end_datetime: z.string().datetime({ message: "Fecha de fin inválida" }),
    delivery_datetime: z
      .string()
      .datetime({ message: "Fecha de entrega inválida" }),
    pickup_datetime: z
      .string()
      .datetime({ message: "Fecha de recolección inválida" }),
    pickup_type: z.enum([
      "mismo_dia_noche",
      "dia_siguiente",
      "evento_multidia",
    ]),
    event_address: z
      .string()
      .min(5, { message: "La dirección debe tener al menos 5 caracteres" }),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    freight_distance_km: z.number().nonnegative().default(0),
    freight_cost: z.number().nonnegative().default(0),
    discount_amount: z.number().nonnegative().default(0),
    security_deposit: z.number().nonnegative().default(0),
    notes: z.string().nullable().optional(),
    items: z
      .array(BookingItemSchema)
      .min(1, { message: "Debes agregar al menos un artículo a la reserva" }),
  })
  .refine(
    (data) => new Date(data.end_datetime) >= new Date(data.start_datetime),
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio",
      path: ["end_datetime"],
    },
  )
  .refine(
    (data) =>
      new Date(data.pickup_datetime) >= new Date(data.delivery_datetime),
    {
      message:
        "La fecha de recolección debe ser posterior a la fecha de entrega",
      path: ["pickup_datetime"],
    },
  );

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
