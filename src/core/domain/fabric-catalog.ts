// ==============================================================================
// REGISTRO MAESTRO DE TELAS, COLORES Y FOTOS (Muestrario Fer Eventos)
// ==============================================================================

export interface FabricColorSwatch {
  color_name: string;
  color_hex: string;
  texture_url: string; // Foto 1: Textura cercana de la tela
  drape_url?: string;  // Foto 2: Caída de la tela en la mesa
  tags?: string[];
}

export interface FabricDefinition {
  name: string;
  slug: string;
  description: string;
  colors: FabricColorSwatch[];
}

export const FABRIC_CATALOG: FabricDefinition[] = [
  {
    name: "Tergal",
    slug: "tergal",
    description: "Tela resistente, mate, elegante y de fácil planchado. La más versátil para manteles base y eventos.",
    colors: [
      {
        color_name: "Azul Rey",
        color_hex: "#1d4ed8",
        texture_url: "/telas/tergal azul rey.jpg",
        drape_url: "/telas/tergal azul rey 2.jpg",
      },
      {
        color_name: "Blanco",
        color_hex: "#f8fafc",
        texture_url: "/telas/tergal blanco.jpg",
        drape_url: "/telas/tergal blanco 2.jpg",
      },
      {
        color_name: "Negro",
        color_hex: "#0f172a",
        texture_url: "/telas/tergal negro.jpg",
        drape_url: "/telas/tergal negro 2.jpg",
      },
      {
        color_name: "Arena",
        color_hex: "#e2d9cc",
        texture_url: "/telas/tergal arena.jpg",
        drape_url: "/telas/tergal arena 2.jpg",
      },
      {
        color_name: "Azul Marino",
        color_hex: "#1e3a8a",
        texture_url: "/telas/tergal azul marino.jpg",
        drape_url: "/telas/tergal azul marino 2.jpg",
      },
      {
        color_name: "Rojo",
        color_hex: "#dc2626",
        texture_url: "/telas/tergal rojo.jpg",
        drape_url: "/telas/tergal rojo 2.jpg",
      },
      {
        color_name: "Rosa Palo",
        color_hex: "#fbcfe8",
        texture_url: "/telas/tergal rosa palo.jpg",
        drape_url: "/telas/tergal rosa palo 2.jpg",
      },
      {
        color_name: "Rosa Medio",
        color_hex: "#f472b6",
        texture_url: "/telas/tergal rosa medio.jpg",
        drape_url: "/telas/tergal rosa medio 2.jpg",
      },
      {
        color_name: "Rosa Fiusha",
        color_hex: "#db2777",
        texture_url: "/telas/tergal rosa fiusha.jpg",
        drape_url: "/telas/tergal rosa fiusha 2.jpg",
      },
      {
        color_name: "Rosa Coral",
        color_hex: "#fb7185",
        texture_url: "/telas/tergal rosa coral.jpg",
        drape_url: "/telas/tergal rosa coral 2.jpg",
      },
      {
        color_name: "Lila Pastel",
        color_hex: "#c084fc",
        texture_url: "/telas/tergal lila pastel.jpg",
        drape_url: "/telas/tergal lila pastel 2.jpg",
      },
      {
        color_name: "Morado Bugambilia",
        color_hex: "#9333ea",
        texture_url: "/telas/tergal morado bugambilia.jpg",
        drape_url: "/telas/tergal morado bugambilia 2.jpg",
      },
      {
        color_name: "Verde Bandera",
        color_hex: "#15803d",
        texture_url: "/telas/tergal verde bandera.jpg",
        drape_url: "/telas/tergal verde bandera 2.jpg",
      },
      {
        color_name: "Verde Limón",
        color_hex: "#84cc16",
        texture_url: "/telas/tergal verde limón.jpg",
        drape_url: "/telas/tergal verde limón 2.jpg",
      },
      {
        color_name: "Amarillo Canario",
        color_hex: "#facc15",
        texture_url: "/telas/tergal amarillo canario.jpg",
        drape_url: "/telas/tergal amarillo canario 2.jpg",
      },
      {
        color_name: "Amarillo Mango",
        color_hex: "#f59e0b",
        texture_url: "/telas/tergal amarillo mango.jpg",
        drape_url: "/telas/tergal amarillo mango 2.jpg",
      },
      {
        color_name: "Naranja",
        color_hex: "#ea580c",
        texture_url: "/telas/tergal naranja.jpg",
        drape_url: "/telas/tergal naranja 2.jpg",
      },
    ],
  },
  {
    name: "Razo Kim",
    slug: "razo_kim",
    description: "Tela satinada brillante de alta gama, ideal para sobremanteles y eventos de gala nocturnos.",
    colors: [
      {
        color_name: "Blanco",
        color_hex: "#f8fafc",
        texture_url: "/telas/razo kim blanco.jpg",
        drape_url: "/telas/razo kim blanco 2.jpg",
      },
      {
        color_name: "Dorado",
        color_hex: "#d97706",
        texture_url: "/telas/razo kim dorado.jpg",
        drape_url: "/telas/razo kim dorado 2.jpg",
      },
      {
        color_name: "Gris Plata",
        color_hex: "#94a3b8",
        texture_url: "/telas/razo kim gris plata.jpg",
        drape_url: "/telas/razo kim gris plata 2.jpg",
      },
      {
        color_name: "Negro",
        color_hex: "#0f172a",
        texture_url: "/telas/razo kim negro.jpg",
        drape_url: "/telas/razo kim negro 2.jpg",
      },
    ],
  },
  {
    name: "Tafeta",
    slug: "tafeta",
    description: "Tela tornasol con cuerpo estructurado, brillo suave y textura firme.",
    colors: [
      {
        color_name: "Azul Marino",
        color_hex: "#1e3a8a",
        texture_url: "/telas/tafeta azul marino.jpg",
        drape_url: "/telas/tafeta azul marino 2.jpg",
      },
      {
        color_name: "Rosa Viejo",
        color_hex: "#be185d",
        texture_url: "/telas/tafeta rosa viejo.jpg",
        drape_url: "/telas/tafeta rosa viejo 2.jpg",
      },
    ],
  },
  {
    name: "Razo Satín",
    slug: "razo_satin",
    description: "Satín suave con estampados especiales para eventos temáticos.",
    colors: [
      {
        color_name: "Estampado Vaca",
        color_hex: "#334155",
        texture_url: "/telas/razo satin vaca.jpg",
      },
    ],
  },
];

// Helper para encontrar colores registrados por nombre de tela
export function getRegisteredColorsForFabric(fabricName: string): FabricColorSwatch[] {
  if (!fabricName) return [];
  const clean = fabricName.toLowerCase().trim();
  const found = FABRIC_CATALOG.find(
    (f) =>
      f.name.toLowerCase() === clean ||
      f.slug.toLowerCase() === clean ||
      clean.includes(f.name.toLowerCase()) ||
      f.name.toLowerCase().includes(clean),
  );
  return found?.colors || [];
}

// Helper para obtener fotos de textura y caída de un color y tela específicos
export function getPresetPhotosForFabricAndColor(
  fabricName: string,
  colorName: string,
): { texture: string; drape?: string; all: string[] } | null {
  const colors = getRegisteredColorsForFabric(fabricName);
  const cleanColor = colorName.toLowerCase().trim();
  const swatch = colors.find((c) => c.color_name.toLowerCase().trim() === cleanColor);
  if (!swatch) return null;

  const all = [swatch.texture_url];
  if (swatch.drape_url) {
    all.push(swatch.drape_url);
  }
  return {
    texture: swatch.texture_url,
    drape: swatch.drape_url,
    all,
  };
}

// Helper para buscar el swatch completo de un color y tela específicos
export function findColorByFabricAndName(
  fabricName: string,
  colorName: string,
): FabricColorSwatch | null {
  const colors = getRegisteredColorsForFabric(fabricName);
  const cleanColor = colorName.toLowerCase().trim();
  const swatch = colors.find(
    (c) =>
      c.color_name.toLowerCase().trim() === cleanColor ||
      cleanColor.includes(c.color_name.toLowerCase().trim()) ||
      c.color_name.toLowerCase().trim().includes(cleanColor),
  );
  return swatch || null;
}
