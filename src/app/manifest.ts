import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fer Eventos - Renta de Mobiliario",
    short_name: "Fer Eventos",
    description:
      "Gestión de inventario en tiempo real, cotizador de WhatsApp y rutas de logística para Fer Eventos (Angostura, Sinaloa)",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
