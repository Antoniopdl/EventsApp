"use client";

import { Check, User, X } from "lucide-react";
import { useState } from "react";
import type { Client } from "@/core/domain/client";
import { ClientSchema } from "@/core/validations/client";

interface EditClientModalProps {
  client: Client;
  onSave: (updatedData: Partial<Client>) => Promise<void>;
  onClose: () => void;
}

export function EditClientModal({
  client,
  onSave,
  onClose,
}: EditClientModalProps) {
  const [fullName, setFullName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone_whatsapp);
  const [notes, setNotes] = useState(client.notes || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const validation = ClientSchema.safeParse({
      full_name: fullName,
      phone_whatsapp: phone,
      notes: notes || null,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Datos inválidos");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        full_name: fullName.trim(),
        phone_whatsapp: phone.trim(),
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      setErrorMsg("Ocurrió un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="flex w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <User className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              Editar Datos de Clienta
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label
              htmlFor="clientFullNameInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Nombre Completo o Familiar
            </label>
            <input
              id="clientFullNameInput"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Sra. Carmen López"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div>
            <label
              htmlFor="clientPhoneInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Teléfono de WhatsApp (10 dígitos)
            </label>
            <input
              id="clientPhoneInput"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 6971034488"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div>
            <label
              htmlFor="clientNotesInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Notas Internas para la Familia
            </label>
            <textarea
              id="clientNotesInput"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Clienta muy puntual, siempre pide manteles blancos, pariente de Doña Silvia"
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? "Guardando..." : "Guardar Cambios"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
