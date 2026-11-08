import { FER_EVENTOS_CONFIG } from "@/core/domain/user";

export interface ParsedLocation {
  latitude: number;
  longitude: number;
  rawUrl?: string;
}

/**
 * Extrae latitud y longitud a partir de un enlace o texto de ubicación compartido de WhatsApp.
 */
export function parseWhatsAppLocation(input: string): ParsedLocation | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  // 1. Patrón con coordenadas directas: '25.1059649, -107.9491486'
  const directCoordMatch = trimmed.match(
    /(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,
  );
  if (directCoordMatch) {
    return {
      latitude: Number.parseFloat(directCoordMatch[1]),
      longitude: Number.parseFloat(directCoordMatch[2]),
      rawUrl: trimmed,
    };
  }

  // 2. Patrón de Google Maps: ?q=lat,lng o query=lat,lng
  const queryParamMatch = trimmed.match(
    /[?&](?:q|query|ll)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
  );
  if (queryParamMatch) {
    return {
      latitude: Number.parseFloat(queryParamMatch[1]),
      longitude: Number.parseFloat(queryParamMatch[2]),
      rawUrl: trimmed,
    };
  }

  // 3. Patrón de ruta: /@lat,lng
  const atMatch = trimmed.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    return {
      latitude: Number.parseFloat(atMatch[1]),
      longitude: Number.parseFloat(atMatch[2]),
      rawUrl: trimmed,
    };
  }

  return null;
}

/**
 * Calcula la distancia aproximada en carretera (km) desde la bodega de Angostura.
 */
export function calculateDistanceToBodega(lat: number, lng: number): number {
  const R = 6371; // Radio de la Tierra en km
  const bodegaLat = FER_EVENTOS_CONFIG.latitude;
  const bodegaLng = FER_EVENTOS_CONFIG.longitude;

  const dLat = ((lat - bodegaLat) * Math.PI) / 180;
  const dLng = ((lng - bodegaLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((bodegaLat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistanceKm = R * c;

  // Factor de 1.25x para compensar curvas reales de carretera
  return Math.round(straightDistanceKm * 1.25 * 10) / 10;
}

/**
 * Calcula el costo de flete sugerido según la distancia desde la bodega.
 */
export function calculateSuggestedFreight(distanceKm: number): number {
  const baseCost = FER_EVENTOS_CONFIG.default_freight_base;
  const kmRate = FER_EVENTOS_CONFIG.default_freight_km_rate;

  if (distanceKm <= 5) {
    return baseCost;
  }

  const extraKm = distanceKm - 5;
  const extraCost = extraKm * kmRate * 2; // Ida y vuelta
  return Math.round(baseCost + extraCost);
}
