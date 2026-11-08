import type { InventoryItem } from "@/core/domain/inventory";
import type { UserRole } from "@/core/domain/user";
import { formatCurrency } from "@/lib/utils";

interface InventoryCardProps {
  item: InventoryItem;
  role: UserRole;
  onAdjustStock: (id: string, delta: number) => void;
}

export function InventoryCard({
  item,
  role,
  onAdjustStock,
}: InventoryCardProps) {
  const isAdmin = role === "admin";
  const isLowStock = item.total_stock < 30;

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md">
      <div className="relative h-28 bg-slate-100">
        {item.image_url ? (
          /* biome-ignore lint/performance/noImgElement: Soporte para imágenes dinámicas remotas */
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            📦
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-md bg-white/90 px-2 py-0.5 font-bold text-[11px] text-slate-800 backdrop-blur-xs shadow-xs">
          {formatCurrency(item.rental_price)}
        </span>
        <span
          className={`absolute top-2 right-2 rounded-md px-1.5 py-0.5 font-bold text-[10px] text-white shadow-xs ${
            isLowStock ? "bg-amber-500" : "bg-emerald-600"
          }`}
        >
          {item.total_stock} disp.
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-2 p-2.5">
        <h3 className="line-clamp-2 font-bold text-slate-900 text-xs leading-tight">
          {item.name}
        </h3>

        {isAdmin ? (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => onAdjustStock(item.id, -5)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-slate-700 text-xs shadow-2xs hover:bg-slate-100 active:scale-95"
            >
              -5
            </button>
            <span className="font-black text-slate-800 text-xs">
              {item.total_stock}
            </span>
            <button
              type="button"
              onClick={() => onAdjustStock(item.id, 5)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs shadow-2xs hover:bg-blue-700 active:scale-95"
            >
              +5
            </button>
          </div>
        ) : (
          <p className="font-medium text-[11px] text-slate-500">
            Existencia:{" "}
            <span className="font-bold text-slate-800">{item.total_stock}</span>
          </p>
        )}
      </div>
    </div>
  );
}
