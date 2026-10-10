"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { CriticPanel } from "@/components/studio/critic-panel";
import { ContentCard } from "@/components/studio/content-card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, RefreshCw, Trash2, FileText } from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  objective: string;
  product?: string;
  target_audience?: string;
  core_message?: string;
  call_to_action?: string;
  platforms?: string[];
  status: string;
  strategy?: string;
  created_at: string;
  updated_at: string;
}

interface Asset {
  id: string;
  title: string;
  content: string;
  platform: string;
  asset_type: string;
  status: string;
  word_count?: number;
  created_at: string;
}

const STATUSES = ["draft", "review", "approved", "scheduled", "published"] as const;

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [criticAssetId, setCriticAssetId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCampaign(d.campaign);
        setAssets(d.assets ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Update failed", "error"); return; }
      setCampaign((c) => c ? { ...c, status: data.status } : c);
      toast("Status updated.", "success");
    } finally {
      setSavingStatus(false);
    }
  };

  const deleteCampaign = async () => {
    if (!confirm("Delete this campaign and all its assets?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    toast("Campaign deleted.", "info");
    router.push("/campaigns");
  };

  if (loading) return (
    <div><TopBar title="Campaign" /><div className="flex justify-center mt-20"><Spinner size="lg" /></div></div>
  );
  if (!campaign) return (
    <div><TopBar title="Campaign" /><p className="p-6 text-slate-500">Campaign not found.</p></div>
  );

  const groupedAssets: Record<string, Asset[]> = {};
  assets.forEach((a) => {
    const key = a.asset_type;
    if (!groupedAssets[key]) groupedAssets[key] = [];
    groupedAssets[key].push(a);
  });

  return (
    <div>
      <TopBar />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/campaigns" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Campaigns
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{campaign.name}</span>
        </div>

        {/* Campaign header */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{campaign.name}</h1>
                <Badge label={campaign.status} variant="status" />
              </div>
              <p className="text-sm text-slate-600 mt-2">{campaign.objective}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs text-slate-500">
                {campaign.product && <div><span className="font-medium">Product:</span> {campaign.product}</div>}
                {campaign.target_audience && <div><span className="font-medium">Audience:</span> {campaign.target_audience}</div>}
                {campaign.call_to_action && <div><span className="font-medium">CTA:</span> {campaign.call_to_action}</div>}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {campaign.platforms?.map((p) => <Badge key={p} label={p} variant="platform" />)}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {/* Status updater */}
              <select
                value={campaign.status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={savingStatus}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <Button variant="danger" size="sm" onClick={deleteCampaign}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </Card>

        {/* Strategy */}
        {campaign.strategy && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Strategy</CardTitle>
            </CardHeader>
            <div className="prose-content text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-4">
              {campaign.strategy}
            </div>
          </Card>
        )}

        {/* Assets by type */}
        {assets.length === 0 ? (
          <Card className="text-center py-10">
            <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No assets generated yet.</p>
          </Card>
        ) : (
          Object.entries(groupedAssets).map(([type, typeAssets]) => (
            <div key={type}>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 capitalize">
                {type.replace("_", " ")}s ({typeAssets.length})
              </h3>
              <div className="space-y-3">
                {typeAssets.map((asset) => (
                  <ContentCard
                    key={asset.id}
                    asset={asset}
                    onCritic={() => setCriticAssetId(asset.id)}
                    onUpdate={(updated) =>
                      setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, ...updated } : a))
                    }
                    onDelete={() => setAssets((prev) => prev.filter((a) => a.id !== asset.id))}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {criticAssetId && (
        <CriticPanel
          assetId={criticAssetId}
          objective={campaign.objective}
          onClose={() => setCriticAssetId(null)}
        />
      )}
    </div>
  );
}
