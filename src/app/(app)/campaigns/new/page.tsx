"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/utils";
import { Brain, Megaphone, Sparkles } from "lucide-react";

interface BrandProfile { id: string; name: string; is_default: boolean; }

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [product, setProduct] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [coreMessage, setCoreMessage] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin", "twitter", "email"]);
  const [brandProfileId, setBrandProfileId] = useState("");
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) {
        setBrands(d);
        const def = d.find((b: BrandProfile) => b.is_default);
        if (def) setBrandProfileId(def.id);
      }
    });
  }, []);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p)
        ? prev.length > 1 ? prev.filter((x) => x !== p) : prev
        : prev.length < 6 ? [...prev, p] : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) {
      toast("Campaign objective is required.", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || `Campaign ${new Date().toLocaleDateString()}`,
          objective,
          product: product || undefined,
          targetAudience: targetAudience || undefined,
          coreMessage: coreMessage || undefined,
          callToAction: callToAction || undefined,
          platforms: selectedPlatforms,
          brandProfileId: brandProfileId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to create campaign", "error");
        return;
      }
      toast("Campaign created successfully!", "success");
      router.push(`/campaigns/${data.campaign.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="New Campaign" />
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Campaign DNA</h2>
          <p className="text-sm text-slate-500 mt-1">
            Fill in your campaign brief and we&apos;ll generate coordinated content across all selected platforms.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Identity</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input
                label="Campaign Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q4 Product Launch"
              />
              <Textarea
                label="Campaign Objective *"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Describe the goal of this campaign…"
                className="min-h-[80px]"
                required
              />
              <Input
                label="Product / Subject"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="What are you promoting?"
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messaging</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input
                label="Target Audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who are you speaking to?"
              />
              <Textarea
                label="Core Message"
                value={coreMessage}
                onChange={(e) => setCoreMessage(e.target.value)}
                placeholder="The key message you want to convey…"
                className="min-h-[70px]"
              />
              <Input
                label="Call to Action"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                placeholder="Sign up, Learn more, Buy now…"
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platforms</CardTitle>
              <span className="text-xs text-slate-400">{selectedPlatforms.length}/6</span>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePlatform(value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    selectedPlatforms.includes(value)
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              We&apos;ll always generate an email draft and blog outline in addition to selected platforms.
            </p>
          </Card>

          {brands.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">Brand Profile</label>
              </div>
              <select
                value={brandProfileId}
                onChange={(e) => setBrandProfileId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </Card>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            <Sparkles className="h-4 w-4" />
            Generate Campaign DNA
          </Button>
        </form>
      </div>
    </div>
  );
}
