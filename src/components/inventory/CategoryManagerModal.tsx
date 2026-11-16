"use client";

import { Check, Edit2, FolderPlus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Category } from "@/core/domain/inventory";
import {
  deleteCategoryById,
  upsertCategory,
} from "@/infrastructure/supabase/category-repository";

interface CategoryManagerModalProps {
  categories: Category[];
  onCategoriesUpdated: (updated: Category[]) => void;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

const EMOJI_PRESETS = [
  "🪑",
  "🍽️",
  "🧵",
  "✨",
  "🍷",
  "🏺",
  "⛺",
  "🛋️",
  "🎵",
  "🎈",
  "💡",
  "📦",
];

export function CategoryManagerModal({
  categories,
  onCategoriesUpdated,
  onClose,
  onNotification,
}: CategoryManagerModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [iconInput, setIconInput] = useState("📦");

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setLabelInput(cat.label);
    setIconInput(cat.icon);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setLabelInput("");
    setIconInput("📦");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelInput.trim()) {
      onNotification("Escribe un nombre para la categoría.");
      return;
    }

    const updated = upsertCategory({
      id: editingId || undefined,
      label: labelInput,
      icon: iconInput,
    });

    onCategoriesUpdated(updated);
    onNotification(
      editingId
        ? `Categoría "${labelInput}" actualizada.`
        : `Categoría "${labelInput}" creada.`,
    );
    handleCancelEdit();
  };

  const handleDelete = (cat: Category) => {
    const updated = deleteCategoryById(cat.id);
    onCategoriesUpdated(updated);
    onNotification(`Categoría "${cat.label}" eliminada.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FolderPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Gestor de Categorías
              </h3>
              <p className="text-[11px] text-slate-500">
                Agrega o modifica secciones del inventario
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Formulario de Crear / Editar */}
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-3"
          >
            <span className="block text-xs font-bold text-blue-950">
              {editingId ? "✏️ Modificar Categoría" : "➕ Nueva Categoría"}
            </span>

            <div className="space-y-1">
              <label
                htmlFor="cat-label-input"
                className="block text-[11px] font-bold text-slate-700"
              >
                Nombre de la Categoría
              </label>
              <input
                id="cat-label-input"
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Ej. Salas Lounge, Pistas de Baile..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <span className="block text-[11px] font-bold text-slate-700">
                Icono
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIconInput(em)}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm transition-all ${
                      iconInput === em
                        ? "border-blue-600 bg-blue-100 ring-2 ring-blue-400/50 scale-110"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex flex-1 h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 font-bold text-xs text-white shadow-xs hover:bg-blue-700 active:scale-98"
              >
                <Check className="h-4 w-4" />
                <span>{editingId ? "Guardar Cambios" : "Crear Categoría"}</span>
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-xl bg-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-300"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Lista de categorías existentes */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-800">
              Categorías Actuales ({categories.length})
            </span>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-base">
                    {cat.icon}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">
                      {cat.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {cat.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(cat)}
                    title="Editar categoría"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    title="Eliminar categoría"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
