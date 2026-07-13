"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-semibold text-ink/80 hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
    >
      <Icon name="logout" size={19} />
      Cerrar sesión
    </button>
  );
}
