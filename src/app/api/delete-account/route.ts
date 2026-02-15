import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Delete all user data (cascading: profiles → customers → quotes → payments)
    // Storage files
    const { data: logoFiles } = await supabase.storage
      .from("logos")
      .list(user.id);
    if (logoFiles && logoFiles.length > 0) {
      await supabase.storage
        .from("logos")
        .remove(logoFiles.map((f) => `${user.id}/${f.name}`));
    }

    const { data: photoFiles } = await supabase.storage
      .from("quote-photos")
      .list(user.id);
    if (photoFiles && photoFiles.length > 0) {
      await supabase.storage
        .from("quote-photos")
        .remove(photoFiles.map((f) => `${user.id}/${f.name}`));
    }

    // Delete profile (cascades to customers, quotes, payments)
    await supabase.from("profiles").delete().eq("id", user.id);

    // Delete auth user using service role
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      // Profile data is already deleted, so still return success
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
