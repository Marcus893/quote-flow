"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  );
}
