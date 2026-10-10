import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  PenTool,
  Megaphone,
  Brain,
  FileText,
  ImageIcon,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Parallel data fetches
  const [
    { data: assets, count: assetCount },
    { data: campaigns, count: campaignCount },
    { data: brands },
    { data: media, count: mediaCount },
  ] = await Promise.all([
    supabase
      .from("content_assets")
      .select("*", { count: "exact" })
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("campaigns")
      .select("*", { count: "exact" })
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("brand_profiles")
      .select("id,name,is_default")
      .eq("user_id", user!.id)
      .limit(3),
    supabase
      .from("media_assets")
      .select("*", { count: "exact" })
      .eq("user_id", user!.id)
      .limit(1),
  ]);

  const stats = [
    { label: "Total Content", value: assetCount ?? 0, icon: FileText, href: "/studio", color: "text-blue-600 bg-blue-50" },
    { label: "Campaigns", value: campaignCount ?? 0, icon: Megaphone, href: "/campaigns", color: "text-purple-600 bg-purple-50" },
    { label: "Brand Profiles", value: brands?.length ?? 0, icon: Brain, href: "/brand", color: "text-green-600 bg-green-50" },
    { label: "Media Assets", value: mediaCount ?? 0, icon: ImageIcon, href: "/media", color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div>
      <TopBar title="Overview" />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s what&apos;s happening in your workspace.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, href, color }) => (
            <Link key={label} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Content</CardTitle>
                <Link href="/studio" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              {!assets?.length ? (
                <EmptyState
                  icon={<PenTool className="h-8 w-8 text-slate-300" />}
                  title="No content yet"
                  description="Head to Content Studio to generate your first piece."
                  href="/studio"
                  cta="Go to Studio"
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {assets.map((a) => (
                    <li key={a.id} className="py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {a.platform ?? "Generic"} · {formatDate(a.created_at)}
                        </p>
                      </div>
                      <Badge label={a.status} variant="status" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {[
                  { label: "New Content", href: "/studio", icon: PenTool },
                  { label: "New Campaign", href: "/campaigns/new", icon: Megaphone },
                  { label: "Upload Media", href: "/media", icon: ImageIcon },
                  { label: "Brand Profile", href: "/brand/new", icon: Brain },
                ].map(({ label, href, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {label}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
                  </Link>
                ))}
              </div>
            </Card>

            {/* Recent campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Active Campaigns</CardTitle>
                <Link href="/campaigns" className="text-xs text-blue-600 hover:underline">View all</Link>
              </CardHeader>
              {!campaigns?.length ? (
                <p className="text-xs text-slate-400 text-center py-4">No campaigns yet</p>
              ) : (
                <ul className="space-y-2">
                  {campaigns.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="flex items-center justify-between hover:bg-slate-50 px-2 py-2 rounded-lg transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[140px]">{c.name}</p>
                          <p className="text-xs text-slate-400">{formatDate(c.created_at)}</p>
                        </div>
                        <Badge label={c.status} variant="status" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Performance hint */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Content Tip</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Use Brand Memory to maintain a consistent voice across all your AI-generated content.
                  </p>
                  <Link href="/brand" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                    Set up brand profile →
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon, title, description, href, cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>
      <Link
        href={href}
        className="mt-4 text-xs text-blue-600 hover:underline font-medium"
      >
        {cta}
      </Link>
    </div>
  );
}
