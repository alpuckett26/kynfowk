"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type InviteFormState = { ok: boolean; message: string };
export type MemberFormState = { ok: boolean; message: string };

/** Loose phone validation — accept anything that looks roughly phone-shaped. */
const PHONE_RE = /^[+\d\s\-().]{7,20}$/;

/**
 * Server action: invite a new family member.
 * Inserts a family_member row with no user_id. When the invitee later signs
 * up with the same email, the on_auth_user_created trigger claims this row
 * by setting user_id, instead of creating a brand-new family.
 */
export async function inviteFamilyMember(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const isElder = formData.get("is_elder") === "on";

  if (!displayName) return { ok: false, message: "Display name is required." };
  if (!email && !phone) {
    return {
      ok: false,
      message: "Add either an email or a phone number — at least one.",
    };
  }
  if (phone && !PHONE_RE.test(phone)) {
    return { ok: false, message: "That doesn't look like a phone number." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in first." };

  const { data: me } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!me?.family_id) {
    return { ok: false, message: "Couldn't find your family." };
  }

  const { error } = await supabase.from("family_members").insert({
    family_id: me.family_id,
    display_name: displayName,
    email: email || null,
    phone: phone || null,
    is_elder: isElder,
  });

  if (error) {
    // Most likely cause: email unique-constraint violation
    if (error.code === "23505") {
      return {
        ok: false,
        message:
          "That email is already on a family — Kynfowk only allows one family per address right now.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/family");
  return { ok: true, message: `Invited ${displayName}.` };
}

/**
 * Server action: update an existing family member's display name,
 * email, phone, or elder status. RLS (007) scopes this to members
 * of the caller's family.
 */
export async function updateFamilyMember(
  _prev: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const memberId = String(formData.get("member_id") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const isElder = formData.get("is_elder") === "on";

  if (!memberId) return { ok: false, message: "Missing member id." };
  if (!displayName) return { ok: false, message: "Display name is required." };
  if (!email && !phone) {
    return {
      ok: false,
      message: "A member needs at least an email or a phone number.",
    };
  }
  if (phone && !PHONE_RE.test(phone)) {
    return { ok: false, message: "That doesn't look like a phone number." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("family_members")
    .update({
      display_name: displayName,
      email: email || null,
      phone: phone || null,
      is_elder: isElder,
    })
    .eq("id", memberId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "That email is already on another family member.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/family");
  return { ok: true, message: "Saved." };
}

/**
 * Server action: remove an unclaimed invitee from the family.
 * RLS (007) restricts deletes to rows where user_id is null, so
 * real signed-in members cannot be removed by this action.
 */
export async function removeFamilyMember(formData: FormData): Promise<void> {
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) return;

  const supabase = createClient();
  await supabase.from("family_members").delete().eq("id", memberId);
  revalidatePath("/family");
  redirect("/family");
}
