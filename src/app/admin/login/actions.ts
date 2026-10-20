"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/admin/property-form";

function safeNext(raw: FormDataEntryValue | null) {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/admin") && !v.startsWith("//") && !v.includes("\\") && !v.startsWith("/admin/login") ? v : "/admin";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { email };

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, values, errors: { email: "Escribe tu correo completo." } };
  }
  if (!password) return { ok: false, values, errors: { password: "Escribe tu contraseña." } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const network = error.status === 0 || /fetch|network/i.test(error.message);
    return {
      ok: false,
      values,
      errors: {
        form: network
          ? "No pudimos conectar. Revisa tu internet e inténtalo otra vez."
          : "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.",
      },
    };
  }
  redirect(safeNext(formData.get("next")));
}
