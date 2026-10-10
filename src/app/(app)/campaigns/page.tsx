import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Megaphone, Plus, ArrowRight } from "lucide-react";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*, content_assets(id)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <TopBar title="Campaigns" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All Campaigns</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your content campaigns and generate coordinated assets.
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        {!campaigns?.length ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">No campaigns yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Create a campaign to generate coordinated content across all your platforms.
            </p>
            <Link href="/campaigns/new">
              <Button size="sm">Create your first campaign</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const assetCount = Array.isArray(c.content_assets) ? c.content_assets.length : 0;
              return (
                <Link key={c.id} href={`/campaigns/${c.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                          <Badge label={c.status} variant="status" />
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{c.objective}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span>{assetCount} asset{assetCount !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span>{formatDate(c.created_at)}</span>
                          {c.platforms?.length && (
                            <>
                              <span>·</span>
                              <span>{c.platforms.slice(0, 3).join(", ")}{c.platforms.length > 3 ? "…" : ""}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
