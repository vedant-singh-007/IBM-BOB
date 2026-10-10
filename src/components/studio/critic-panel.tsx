"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { X, AlertTriangle, Info, AlertCircle, Sparkles, CheckCircle2, Send } from "lucide-react";

interface CriticFinding {
  category: string;
  severity: "info" | "warning" | "error";
  description: string;
  suggestion: string | null;
}

interface CriticPanelProps {
  assetId: string;
  objective?: string;
  onClose: () => void;
}

export function CriticPanel({ assetId, objective, onClose }: CriticPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [findings, setFindings] = useState<CriticFinding[]>([]);
  const [overall, setOverall] = useState<string | null>(null);
  const [improving, setImproving] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [improving2, setImproving2] = useState(false);

  const runReview = async () => {
    setLoading(true);
    setFindings([]);
    setOverall(null);
    try {
      const res = await fetch("/api/critic?action=review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, objective }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Review failed", "error");
        return;
      }
      setFindings(data.review?.findings ?? []);
      setOverall(data.review?.overall ?? null);
    } finally {
      setLoading(false);
    }
  };

  const applyImprovement = async (suggestion: string) => {
    setImproving(suggestion);
    try {
      const res = await fetch("/api/critic?action=improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, instruction: suggestion, saveRevision: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Improvement failed", "error");
        return;
      }
      toast("Improvement applied and saved.", "success");
      // Re-run review
      runReview();
    } finally {
      setImproving(null);
    }
  };

  const applyCustom = async () => {
    if (!instruction.trim()) return;
    setImproving2(true);
    try {
      const res = await fetch("/api/critic?action=improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, instruction, saveRevision: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Improvement failed", "error");
        return;
      }
      toast("Improvement applied.", "success");
      setInstruction("");
    } finally {
      setImproving2(false);
    }
  };

  const severityIcon = {
    info: <Info className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  const severityClass = {
    info: "border-blue-100 bg-blue-50",
    warning: "border-amber-100 bg-amber-50",
    error: "border-red-100 bg-red-50",
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-end p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-base font-semibold text-slate-900">Content Critic</h2>
            <span className="text-xs text-slate-400 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Heuristic · Not a factual guarantee
            </span>
          </div>
          <button onClick={onClose} className="hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!findings.length && !loading && (
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Get an AI review of your content&apos;s brand alignment, readability, and platform fit.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Note: findings are heuristic evaluations, not objective truths.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-slate-500">Analyzing content…</p>
            </div>
          )}

          {overall && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <p className="text-sm text-green-800">{overall}</p>
            </div>
          )}

          {findings.map((f, i) => (
            <div key={i} className={cn("rounded-xl border p-4", severityClass[f.severity])}>
              <div className="flex items-start gap-2">
                {severityIcon[f.severity]}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">{f.category}</span>
                  </div>
                  <p className="text-sm text-slate-700">{f.description}</p>
                  {f.suggestion && (
                    <div className="mt-2 flex items-start gap-2">
                      <p className="text-xs text-slate-500 italic flex-1">💡 {f.suggestion}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyImprovement(f.suggestion!)}
                        loading={improving === f.suggestion}
                        className="text-xs shrink-0"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 space-y-3">
          {/* Custom improvement */}
          {findings.length > 0 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Custom improvement instruction…"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={applyCustom}
                loading={improving2}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Button
            onClick={runReview}
            loading={loading}
            className="w-full"
            variant={findings.length ? "outline" : "primary"}
          >
            <Sparkles className="h-4 w-4" />
            {findings.length ? "Re-analyze" : "Analyze Content"}
          </Button>
        </div>
      </div>
    </div>
  );
}
