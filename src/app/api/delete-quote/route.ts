import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the user owns this quote
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("id, contractor_id, items, photos")
      .eq("id", quoteId)
      .eq("contractor_id", user.id)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Use admin client to bypass storage RLS (no DELETE policies exist)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete receipt files from payment-receipts/{quoteId}/
    const { data: receiptFiles } = await supabaseAdmin.storage
      .from("payment-receipts")
      .list(quoteId);
    if (receiptFiles && receiptFiles.length > 0) {
      const paths = receiptFiles
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => `${quoteId}/${f.name}`);
      if (paths.length > 0) {
        const { error: delErr } = await supabaseAdmin.storage
          .from("payment-receipts")
          .remove(paths);
        if (delErr) console.error("Failed to delete receipts:", delErr);
        else console.log(`Deleted ${paths.length} receipt files for quote ${quoteId}`);
      }
    }

    // Delete quote photo files from quote-photos bucket
    const photoUrls: string[] = [];
    const items = (quote.items as { photos?: string[] }[]) || [];
    for (const item of items) {
      if (item.photos) photoUrls.push(...item.photos);
    }
    const topPhotos = (quote.photos as string[]) || [];
    photoUrls.push(...topPhotos);

    console.log(`Quote ${quoteId} — found ${items.length} line items, ${photoUrls.length} total photo URLs`);
    console.log("Photo URLs:", JSON.stringify(photoUrls));

    if (photoUrls.length > 0) {
      const pathsToDelete = photoUrls
        .map((url) => {
          // Handle both encoded and non-encoded URLs
          const decoded = decodeURIComponent(url);
          const match = decoded.match(/quote-photos\/(.+?)(?:\?.*)?$/);
          return match ? match[1] : null;
        })
        .filter((p): p is string => p !== null);

      console.log("Storage paths to delete:", JSON.stringify(pathsToDelete));

      if (pathsToDelete.length > 0) {
        const { data: delData, error: delErr } = await supabaseAdmin.storage
          .from("quote-photos")
          .remove(pathsToDelete);
        if (delErr) console.error("Failed to delete photos:", delErr);
        else console.log(`Deleted ${pathsToDelete.length} photo files for quote ${quoteId}. Result:`, JSON.stringify(delData));
      }
    } else {
      console.log(`No photo URLs found in quote ${quoteId} data`);
    }

    // Delete payments then quote (using user client — cascade handles this too)
    await supabase.from("payments").delete().eq("quote_id", quoteId);
    const { error: deleteErr } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteId);

    if (deleteErr) {
      console.error("Failed to delete quote:", deleteErr);
      return NextResponse.json(
        { error: "Failed to delete quote" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete quote error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
