"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { CriticPanel } from "@/components/studio/critic-panel";
import { ContentCard } from "@/components/studio/content-card";
import { PLATFORMS, wordCount } from "@/lib/utils";
import {
  PenTool,
  RefreshCw,
  FileText,
  Repeat2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Brain,
} from "lucide-react";

const MODES = [
  { value: "generate", label: "Generate", icon: Sparkles, description: "Create new content from a brief" },
  { value: "rewrite", label: "Rewrite", icon: RefreshCw, description: "Rewrite existing text" },
  { value: "summarize", label: "Summarize", icon: FileText, description: "Summarize source material" },
  { value: "repurpose", label: "Repurpose", icon: Repeat2, description: "Adapt long-form content" },
] as const;

type Mode = typeof MODES[number]["value"];

interface BrandProfile {
  id: string;
  name: string;
  is_default: boolean;
}

interface GeneratedAsset {
  id: string;
  title: string;
  content: string;
  platform: string;
  status: string;
}

export default function StudioPage() {
  const { toast } = useToast();

  // Form state
  const [mode, setMode] = useState<Mode>("generate");
  const [brief, setBrief] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [targetAudience, setTargetAudience] = useState("");
  const [desiredLength, setDesiredLength] = useState<"short" | "medium" | "long">("medium");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["generic"]);
  const [brandProfileId, setBrandProfileId] = useState<string>("");

  // Data
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [criticAssetId, setCriticAssetId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setBrands(data);
        const def = data.find((b: BrandProfile) => b.is_default);
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

  const handleGenerate = async () => {
    if (mode !== "generate" && !sourceText.trim()) {
      toast("Please provide source text for this mode.", "warning");
      return;
    }
    if (mode === "generate" && !brief.trim()) {
      toast("Please provide a brief.", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          brief: brief || undefined,
          sourceText: sourceText || undefined,
          tone,
          language,
          targetAudience: targetAudience || undefined,
          desiredLength,
          platforms: selectedPlatforms,
          brandProfileId: brandProfileId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Generation failed", "error");
        return;
      }
      setGeneratedAssets((prev) => [...(data.assets ?? []), ...prev]);
      toast(`Generated ${data.assets?.length ?? 0} content piece(s).`, "success");
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const needsSource = mode !== "generate";

  return (
    <div>
      <TopBar title="Content Studio" />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          {/* Left: Input panel */}
          <div className="space-y-4">
            {/* Mode selector */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Mode</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      mode === value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {MODES.find((m) => m.value === mode)?.description}
              </p>
            </Card>

            {/* Brief/Source */}
            <Card>
              {needsSource ? (
                <Textarea
                  label="Source Text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste the text you want to rewrite, summarize, or repurpose…"
                  className="min-h-[140px]"
                  hint={`${wordCount(sourceText)} words`}
                />
              ) : (
                <Textarea
                  label="Brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe what you want to create…"
                  className="min-h-[100px]"
                />
              )}
            </Card>

            {/* Platform selector */}
            <Card>
              <CardHeader>
                <CardTitle>Target Platforms</CardTitle>
                <span className="text-xs text-slate-400">{selectedPlatforms.length}/6</span>
              </CardHeader>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ value, label }) => (
                  <button
                    key={value}
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
            </Card>

            {/* Advanced options */}
            <Card>
              <button
                className="flex items-center justify-between w-full text-sm font-medium text-slate-700"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Advanced Options
                </span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-3">
                  <Input
                    label="Tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="professional, casual, inspiring…"
                  />
                  <Input
                    label="Target Audience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Marketing managers, 25–40…"
                  />
                  <Select
                    label="Language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="pt">Portuguese</option>
                    <option value="it">Italian</option>
                    <option value="ja">Japanese</option>
                  </Select>
                  <Select
                    label="Length"
                    value={desiredLength}
                    onChange={(e) => setDesiredLength(e.target.value as "short" | "medium" | "long")}
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </Select>
                  {brands.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5" />
                        Brand Profile
                      </label>
                      <select
                        value={brandProfileId}
                        onChange={(e) => setBrandProfileId(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— None —</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}{b.is_default ? " (default)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Button
              onClick={handleGenerate}
              loading={loading}
              className="w-full"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              Generate Content
            </Button>
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            {loading && (
              <Card className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Spinner size="lg" className="mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Generating content…</p>
                </div>
              </Card>
            )}

            {!loading && generatedAssets.length === 0 && (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">No content yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Set up your brief and click Generate Content to start.
                </p>
              </Card>
            )}

            {generatedAssets.map((asset) => (
              <ContentCard
                key={asset.id}
                asset={asset}
                onCritic={() => setCriticAssetId(asset.id)}
                onUpdate={(updated) =>
                  setGeneratedAssets((prev) =>
                    prev.map((a) => (a.id === asset.id ? { ...a, ...updated } : a))
                  )
                }
                onDelete={() =>
                  setGeneratedAssets((prev) => prev.filter((a) => a.id !== asset.id))
                }
              />
            ))}
          </div>
        </div>

        {/* Critic Panel */}
        {criticAssetId && (
          <CriticPanel
            assetId={criticAssetId}
            onClose={() => setCriticAssetId(null)}
          />
        )}
      </div>
    </div>
  );
}
