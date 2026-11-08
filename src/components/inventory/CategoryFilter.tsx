interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "todas", label: "Todas", icon: "✨" },
  { id: "sillas", label: "Sillas", icon: "🪑" },
  { id: "mesas", label: "Mesas", icon: "🍽️" },
  { id: "manteleria", label: "Manteles", icon: "🧵" },
  { id: "vajilla", label: "Vajilla", icon: "🍷" },
  { id: "decoracion", label: "Decoración", icon: "🏺" },
  { id: "toldos_carpas", label: "Toldos", icon: "⛺" },
];

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 font-medium text-xs no-scrollbar">
      {CATEGORIES.map((cat) => {
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 transition-all ${
              isActive
                ? "bg-slate-900 font-bold text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
