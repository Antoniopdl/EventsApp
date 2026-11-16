import { Settings2 } from "lucide-react";
import type { Category } from "@/core/domain/inventory";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenManager?: () => void;
  isAdmin?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  onOpenManager,
  isAdmin = false,
}: CategoryFilterProps) {
  return (
    <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 font-medium text-xs no-scrollbar">
      <button
        type="button"
        onClick={() => onSelectCategory("todas")}
        className={`whitespace-nowrap rounded-full px-3.5 py-1.5 transition-all shrink-0 ${
          selectedCategory === "todas"
            ? "bg-slate-900 font-bold text-white shadow-xs"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        <span className="mr-1">✨</span>
        Todas
      </button>

      {categories.map((cat) => {
        const isActive = selectedCategory === cat.slug;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.slug)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 transition-all shrink-0 ${
              isActive
                ? "bg-slate-900 font-bold text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        );
      })}

      {isAdmin && onOpenManager && (
        <button
          type="button"
          onClick={onOpenManager}
          title="Gestionar Categorías"
          className="flex items-center gap-1 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-bold text-blue-700 hover:bg-blue-100 shrink-0 active:scale-95"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Categorías</span>
        </button>
      )}
    </div>
  );
}
