import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Brain, Plus, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function BrandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: brands } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div>
      <TopBar title="Brand Memory" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Brand Profiles</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Define your brand voice and guidelines. The AI will use your active profile when generating content.
            </p>
          </div>
          <Link href="/brand/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Profile
            </Button>
          </Link>
        </div>

        {!brands?.length ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Brain className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">No brand profiles yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Create a brand profile to give your AI content a consistent voice.
            </p>
            <Link href="/brand/new" className="text-sm text-blue-600 hover:underline font-medium">
              Create your first profile
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {brands.map((b) => (
              <Link key={b.id} href={`/brand/${b.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{b.name}</h3>
                        {b.is_default && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            <Star className="h-3 w-3" />
                            Default
                          </span>
                        )}
                      </div>
                      {b.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {b.tone && (
                          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{b.tone}</span>
                        )}
                        {b.preferred_vocabulary?.slice(0, 3).map((v) => (
                          <span key={v} className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">{v}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{formatDate(b.created_at)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 ml-2" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
