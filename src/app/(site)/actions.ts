"use server";

import { createPublicClient } from "@/lib/supabase/public";

export type InquiryField = "name" | "contact" | "message";

export interface InquiryState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<InquiryField, string>>;
  values?: { name: string; contact: string; message: string };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Guarda una consulta en `inquiries`. Las reglas replican los CHECK del SQL
 * (supabase/migrations/20261020000001_init.sql); la política RLS solo deja insertar con read = false.
 */
export async function sendInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  // Campo trampa: las personas no lo ven ni lo llenan. Si viene con texto, fingimos éxito.
  if (text(formData, "empresa_web")) {
    return { status: "success", message: "Gracias, recibimos tu consulta." };
  }

  const name = text(formData, "name");
  const contact = text(formData, "contact");
  const message = text(formData, "message");
  const propertyIdRaw = text(formData, "property_id");
  const values = { name, contact, message };

  const fieldErrors: InquiryState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "Escribe tu nombre (mínimo 2 letras).";
  else if (name.length > 120) fieldErrors.name = "El nombre es demasiado largo (máximo 120 caracteres).";

  let email: string | null = null;
  let phone: string | null = null;
  if (!contact) {
    fieldErrors.contact = "Déjanos un correo o un teléfono para responderte.";
  } else if (contact.includes("@")) {
    if (contact.length > 200 || !EMAIL_RE.test(contact)) fieldErrors.contact = "Revisa el correo: parece incompleto.";
    else email = contact;
  } else {
    if (contact.length > 40 || (contact.match(/\d/g) ?? []).length < 7)
      fieldErrors.contact = "Revisa el teléfono: incluye el código de área o el 9 del celular.";
    else phone = contact;
  }

  if (message.length < 5) fieldErrors.message = "Cuéntanos un poco más (mínimo 5 caracteres).";
  else if (message.length > 3000) fieldErrors.message = "El mensaje es demasiado largo (máximo 3.000 caracteres).";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors, values };
  }

  const property_id = UUID_RE.test(propertyIdRaw) ? propertyIdRaw : null;

  try {
    const supabase = createPublicClient();
    // Sin .select(): el rol anónimo puede insertar pero no leer la tabla.
    const { error } = await supabase
      .from("inquiries")
      .insert({ property_id, name, email, phone, message, read: false });
    if (error) throw error;
  } catch {
    return {
      status: "error",
      message: "No pudimos enviar tu consulta en este momento. Inténtalo de nuevo o escríbenos por WhatsApp.",
      values,
    };
  }

  return { status: "success", message: "Gracias, recibimos tu consulta. Te responderemos a la brevedad." };
}
