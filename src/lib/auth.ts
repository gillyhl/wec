import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL } from "@/lib/types";

// Returns the signed-in user (or null), and whether they are the admin
// allowed to mutate data.
export async function getAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return { user, isAdmin };
}
