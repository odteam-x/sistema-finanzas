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
      className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-tile text-sm font-semibold text-muted hover:bg-surface-sunken transition-colors cursor-pointer disabled:opacity-50"
    >
      <Icon name="logout" size={19} />
      Cerrar sesión
    </button>
  );
}
