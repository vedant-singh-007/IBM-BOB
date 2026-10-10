"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { wordCount, formatDate } from "@/lib/utils";
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  MessageSquare,
  Save,
  Download,
  X,
  ExternalLink,
} from "lucide-react";

interface ContentCardProps {
  asset: {
    id: string;
    title: string;
    content: string;
    platform: string;
    status: string;
  };
  onCritic?: () => void;
  onUpdate?: (updated: Partial<{ content: string; status: string }>) => void;
  onDelete?: () => void;
}

export function ContentCard({ asset, onCritic, onUpdate, onDelete }: ContentCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(asset.content);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(asset.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (editContent === asset.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast(d.error ?? "Save failed", "error");
        return;
      }
      onUpdate?.({ content: editContent });
      toast("Content saved.", "success");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setEditContent(asset.content);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this content piece?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      onDelete?.();
      toast("Content deleted.", "info");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([asset.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset.title.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="group relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={asset.platform ?? "generic"} variant="platform" />
            <Badge label={asset.status} variant="status" />
            <span className="text-xs text-slate-400">{wordCount(asset.content)} words</span>
          </div>
          <p className="text-sm font-medium text-slate-700 mt-1 truncate">{asset.title}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { setEditContent(asset.content); setEditing(true); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {onCritic && (
            <button
              onClick={onCritic}
              className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600 transition-colors"
              title="AI Review"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Export"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[150px] text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDiscard}>
              <X className="h-3.5 w-3.5" />
              Discard
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose-content text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 max-h-[300px] overflow-y-auto">
          {asset.content}
        </div>
      )}
    </Card>
  );
}
