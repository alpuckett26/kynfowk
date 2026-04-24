import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Profile is just the edit page for the signed-in user's own
 * family_member row. We resolve that row's id and redirect there.
 */
export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: me } = await supabase
    .from("family_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!me?.id) redirect("/dashboard");
  redirect(`/family/${me.id}/edit`);
}
