import { Boxes, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { InventoryItem } from "@/core/domain/inventory";
import type { UserRole } from "@/core/domain/user";
import { CategoryFilter } from "./CategoryFilter";
import { InventoryCard } from "./InventoryCard";

interface InventoryGridProps {
  items: InventoryItem[];
  role: UserRole;
  onAdjustStock: (id: string, delta: number) => void;
}

export function InventoryGrid({
  items,
  role,
  onAdjustStock,
}: InventoryGridProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory =
        selectedCategory === "todas" || item.category === selectedCategory;
      const matchSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [items, selectedCategory, search]);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar silla, mesa, mantel..."
            className="w-full rounded-xl border-0 bg-slate-100 py-2 pr-3 pl-9 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 font-bold text-blue-700 text-xs">
          <Boxes className="h-3.5 w-3.5" />
          <span>{filteredItems.length} Arts.</span>
        </div>
      </div>

      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <InventoryCard
            key={item.id}
            item={item}
            role={role}
            onAdjustStock={onAdjustStock}
          />
        ))}
      </div>
    </div>
  );
}
