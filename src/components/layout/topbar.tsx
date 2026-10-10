"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

export function TopBar({ title }: { title?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {title && <h1 className="text-base font-semibold text-slate-800">{title}</h1>}
      {!title && <div />}
      <div className="flex items-center gap-3">
        {email && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User className="h-3.5 w-3.5" />
            <span>{email}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
