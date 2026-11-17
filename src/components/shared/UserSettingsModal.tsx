"use client";

import { Edit2, ShieldCheck, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AppUser, UserRole } from "@/core/domain/user";
import { testSupabaseConnection } from "@/infrastructure/supabase/client";
import {
  createAppUser,
  getAppUsers,
  updateAppUserDetails,
} from "@/infrastructure/supabase/user-repository";

interface UserSettingsModalProps {
  onClose: () => void;
  onNotification: (msg: string) => void;
}

export function UserSettingsModal({
  onClose,
  onNotification,
}: UserSettingsModalProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("driver");
  const [newPin, setNewPin] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Nuevo usuario
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("driver");
  const [newUserPin, setNewUserPin] = useState("");
  const loadUsers = useCallback(async () => {
    const list = await getAppUsers();
    setUsers(list);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSaveUserChanges = async (userId: string) => {
    if (!editFullName.trim()) {
      onNotification("El nombre no puede estar vacío.");
      return;
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      onNotification("El PIN debe ser exactamente de 6 dígitos numéricos.");
      return;
    }

    const ok = await updateAppUserDetails(userId, {
      full_name: editFullName,
      role: editRole,
      pin_code: newPin,
    });
    if (ok) {
      onNotification("Datos y permisos de usuario actualizados.");
      setEditingUserId(null);
      setNewPin("");
      loadUsers();
    } else {
      onNotification("Error al actualizar el usuario.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim()) {
      onNotification("Por favor completa el nombre y usuario.");
      return;
    }
    if (newUserPin.length !== 6 || !/^\d{6}$/.test(newUserPin)) {
      onNotification("El PIN debe tener 6 números.");
      return;
    }

    const created = await createAppUser({
      username: newUsername,
      full_name: newFullName,
      role: newRole,
      pin_code: newUserPin,
      is_active: true,
    });

    if (created) {
      onNotification(`Usuario ${created.full_name} creado con éxito.`);
      setShowCreateForm(false);
      setNewUsername("");
      setNewFullName("");
      setNewUserPin("");
      loadUsers();
    } else {
      onNotification("Error: El nombre de usuario ya existe.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Configuración de Usuarios y PINs
              </h3>
              <p className="text-[11px] text-slate-500">
                Administración y Repartidores
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

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Usuarios registrados ({users.length})
            </span>
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{showCreateForm ? "Cancelar" : "+ Nuevo Usuario"}</span>
            </button>
          </div>

          {/* Formulario de creación rápida */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateUser}
              className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2.5 animate-in fade-in"
            >
              <span className="block text-xs font-bold text-blue-900">
                Registrar nuevo usuario o chofer
              </span>
              <div>
                <label
                  htmlFor="userSettingsFullName"
                  className="block text-[11px] font-semibold text-slate-700"
                >
                  Nombre Completo
                </label>
                <input
                  id="userSettingsFullName"
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="userSettingsUsername"
                    className="block text-[11px] font-semibold text-slate-700"
                  >
                    Usuario
                  </label>
                  <input
                    id="userSettingsUsername"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="juan"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="userSettingsRole"
                    className="block text-[11px] font-semibold text-slate-700"
                  >
                    Rol
                  </label>
                  <select
                    id="userSettingsRole"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="driver">Entregas / Chofer</option>
                    <option value="admin">Administración</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="userSettingsPin"
                  className="block text-[11px] font-semibold text-slate-700"
                >
                  PIN de 6 Dígitos
                </label>
                <input
                  id="userSettingsPin"
                  type="password"
                  maxLength={6}
                  value={newUserPin}
                  onChange={(e) =>
                    setNewUserPin(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="6 números (ej. 123456)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-2 font-bold text-xs text-white shadow-xs hover:bg-blue-700 active:scale-98"
              >
                Guardar Usuario
              </button>
            </form>
          )}

          {/* Lista de usuarios existentes */}
          <div className="space-y-2">
            {users.map((u) => {
              const isAdmin = u.role === "admin";
              const isEditing = editingUserId === u.id;

              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {u.full_name}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Usuario:{" "}
                        <span className="font-mono font-bold text-slate-700">
                          {u.username}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isAdmin
                          ? "bg-purple-100 text-purple-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isAdmin ? "Administración" : "Entregas"}
                    </span>
                  </div>

                  {/* Edición de Nombre, Rol y PIN */}
                  {isEditing ? (
                    <div className="space-y-2 pt-2 border-t border-slate-200/80">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Nombre Completo
                        </span>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Permisos / Rol
                          </span>
                          <select
                            value={editRole}
                            onChange={(e) =>
                              setEditRole(e.target.value as UserRole)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="driver">Entregas / Chofer</option>
                            <option value="admin">Administración</option>
                          </select>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            PIN (6 dígitos)
                          </span>
                          <input
                            type="text"
                            maxLength={6}
                            value={newPin}
                            onChange={(e) =>
                              setNewPin(e.target.value.replace(/\D/g, ""))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveUserChanges(u.id)}
                          className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                          Guardar Cambios
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUserId(null)}
                          className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                      <span className="font-mono text-[11px] text-slate-500">
                        PIN: •••••• ({u.pin_code})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUserId(u.id);
                          setEditFullName(u.full_name);
                          setEditRole(u.role);
                          setNewPin(u.pin_code);
                        }}
                        className="flex items-center gap-1 font-bold text-blue-600 text-[11px] hover:underline"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Editar Usuario</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Diagnóstico de Conexión Supabase */}
          <SupabaseConnectionDiagnostic />
        </div>
      </div>
    </div>
  );
}

function SupabaseConnectionDiagnostic() {
  const [status, setStatus] = useState<{
    loading: boolean;
    data?: {
      configured: boolean;
      url: string;
      hasKey: boolean;
      keyPrefix: string;
      ok: boolean;
      error?: string;
    };
  }>({ loading: false });

  const checkConnection = async () => {
    setStatus({ loading: true });
    const res = await testSupabaseConnection();
    setStatus({ loading: false, data: res });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">
          Diagnóstico Supabase (Nube)
        </span>
        <button
          type="button"
          onClick={checkConnection}
          disabled={status.loading}
          className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {status.loading ? "Probando..." : "Probar Conexión"}
        </button>
      </div>

      {status.data && (
        <div
          className={`rounded-xl p-2.5 text-[11px] space-y-1 ${
            status.data.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <p className="font-extrabold">
            {status.data.ok
              ? "✅ Conexión con Supabase Exitosa (En Vivo)"
              : "❌ Falló la conexión con Supabase"}
          </p>
          <p className="text-[10px] font-mono">
            URL: {status.data.url} | Key: {status.data.keyPrefix}
          </p>
          {status.data.error && (
            <p className="font-semibold text-rose-700">
              Detalle: {status.data.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
