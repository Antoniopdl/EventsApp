import type { Booking } from "@/core/domain/booking";
import { FLEET_DEFAULTS, type Vehicle } from "@/core/domain/logistics";
import { FER_EVENTOS_CONFIG } from "@/core/domain/user";
import { calculateDistanceToBodega } from "@/lib/location-parser";

export interface RouteOptimizationResult {
  recommendedVehicle: Vehicle;
  explanation: string;
  totalPackages: number;
  totalStops: number;
  totalDistanceKm: number;
  estimatedFuelCostMxn: number;
  googleMapsUrl: string;
}

/**
 * Genera la URL universal de Google Maps con origen en bodega y paradas intermedias.
 */
export function generateGoogleMapsMultiStopUrl(
  stops: { address: string; lat?: number | null; lng?: number | null }[],
): string {
  const bodegaCoord = `${FER_EVENTOS_CONFIG.latitude},${FER_EVENTOS_CONFIG.longitude}`;

  if (stops.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${bodegaCoord}`;
  }

  // Si solo hay una parada: Bodega -> Parada
  if (stops.length === 1) {
    const dest =
      stops[0].lat && stops[0].lng
        ? `${stops[0].lat},${stops[0].lng}`
        : encodeURIComponent(stops[0].address);
    return `https://www.google.com/maps/dir/?api=1&origin=${bodegaCoord}&destination=${dest}`;
  }

  // Ruta multi-parada: Bodega -> Parada 1 -> ... -> Parada N -> Bodega
  const waypoints = stops.map((s) => {
    if (s.lat && s.lng) {
      return `${s.lat},${s.lng}`;
    }
    return encodeURIComponent(s.address);
  });

  const path = [bodegaCoord, ...waypoints, bodegaCoord].join("/");
  return `https://www.google.com/maps/dir/${path}`;
}

/**
 * Recomienda el vehículo óptimo y estima los costos de combustible de la ruta del día.
 */
export function optimizeRouteAndRecommendVehicle(
  dayBookings: Booking[],
  vehicles: Vehicle[],
): RouteOptimizationResult {
  // 1. Estimar cantidad de paquetes totales de los eventos del día
  let totalPackages = 0;
  for (const b of dayBookings) {
    if (b.items && b.items.length > 0) {
      const pkgItems = b.items.filter(
        (i) =>
          i.item_name?.toLowerCase().includes("paquete") ||
          i.item_name?.toLowerCase().includes("combo"),
      );
      if (pkgItems.length > 0) {
        totalPackages += pkgItems.reduce((acc, it) => acc + it.quantity, 0);
      } else {
        totalPackages += Math.max(1, Math.ceil(b.items.length / 3));
      }
    } else {
      totalPackages += 2; // Estimado por defecto
    }
  }

  // 2. Calcular distancia total acumulada de las paradas
  let maxStopDistanceKm = 0;
  for (const b of dayBookings) {
    if (b.latitude && b.longitude) {
      const dist = calculateDistanceToBodega(b.latitude, b.longitude);
      if (dist > maxStopDistanceKm) maxStopDistanceKm = dist;
    }
  }
  const estimatedTotalKm = Math.max(
    15,
    Math.round(maxStopDistanceKm * 2.5 + dayBookings.length * 4),
  );

  // 3. Reglas operativas acordadas en el grill-me:
  // - La que más se usa es la Nissan para eventos chicos o medianos (hasta 8 paquetes)
  // - Si es evento grande y lejos: Dutty (o Nissan + Dutty)
  // - Si es algo súper grande o mucha decoración: Tacoma con Remolque/Traila
  const activeFleet =
    vehicles && vehicles.length > 0 ? vehicles : FLEET_DEFAULTS;
  const nissan =
    activeFleet.find((v) => v.name.toLowerCase().includes("nissan")) ||
    activeFleet[0] ||
    FLEET_DEFAULTS[0];
  const tacoma =
    activeFleet.find((v) => v.name.toLowerCase().includes("tacoma")) ||
    activeFleet[1] ||
    FLEET_DEFAULTS[1];
  const dutty =
    activeFleet.find((v) => v.name.toLowerCase().includes("dutty")) ||
    activeFleet[2] ||
    FLEET_DEFAULTS[2];

  let selected = nissan;
  let reason = "Ideal para el volumen del día (menor costo de gasolina).";

  if (totalPackages > 18) {
    selected = dutty;
    reason =
      "Volumen masivo de mobiliario: se requiere la capacidad de La Dutty Diésel.";
  } else if (totalPackages > 8) {
    selected = tacoma;
    reason =
      "Volumen medio/alto o decoración voluminosa: se asigna Tacoma con Traila.";
  }

  const fuelRate = selected?.fuel_cost_per_km || 2.72;
  const fuelCost = Math.round(estimatedTotalKm * fuelRate);
  const mapsUrl = generateGoogleMapsMultiStopUrl(
    dayBookings.map((b) => ({
      address: b.event_address,
      lat: b.latitude,
      lng: b.longitude,
    })),
  );

  return {
    recommendedVehicle: selected,
    explanation: reason,
    totalPackages,
    totalStops: dayBookings.length,
    totalDistanceKm: estimatedTotalKm,
    estimatedFuelCostMxn: fuelCost,
    googleMapsUrl: mapsUrl,
  };
}
