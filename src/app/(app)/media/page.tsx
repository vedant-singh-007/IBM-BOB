"use client";

import { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { formatBytes, formatDate, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/utils";
import { Upload, Search, ImageIcon, Trash2, Tag, X, Sparkles } from "lucide-react";

interface MediaAsset {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  ai_description: string | null;
  tags: string[] | null;
  alt_text: string | null;
  created_at: string;
}

export default function MediaPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [editTag, setEditTag] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [aiDescribing, setAiDescribing] = useState(false);

  const loadMedia = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMedia(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast(`File too large. Max ${formatBytes(MAX_FILE_SIZE)}.`, "error");
      return;
    }

    const aiDescribe = confirm("Use AI to auto-generate a description and tags? (Requires AI provider to be configured)");
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      if (aiDescribe) form.append("ai_describe", "true");

      const res = await fetch("/api/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Upload failed", "error");
        return;
      }
      toast("File uploaded successfully!", "success");
      loadMedia(search);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMedia(search);
  };

  const handleDelete = async (item: MediaAsset) => {
    if (!confirm(`Delete "${item.filename}"?`)) return;
    const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("File deleted.", "info");
      setSelected(null);
      loadMedia(search);
    }
  };

  const handleSaveMeta = async () => {
    if (!selected) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/media/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: selected.tags,
          alt_text: selected.alt_text,
          ai_description: selected.ai_description,
        }),
      });
      if (!res.ok) { toast("Save failed", "error"); return; }
      toast("Metadata saved.", "success");
      setItems((prev) => prev.map((i) => i.id === selected.id ? selected : i));
    } finally {
      setSavingMeta(false);
    }
  };

  const addTag = () => {
    if (!selected || !editTag.trim()) return;
    const tags = [...(selected.tags ?? []), editTag.trim()];
    setSelected({ ...selected, tags });
    setEditTag("");
  };

  const removeTag = (tag: string) => {
    if (!selected) return;
    setSelected({ ...selected, tags: (selected.tags ?? []).filter((t) => t !== tag) });
  };

  return (
    <div>
      <TopBar title="Media Library" />
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        {/* Actions bar */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by filename or description…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" variant="outline" size="md">Search</Button>
          </form>

          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>

        <p className="text-xs text-slate-400">{total} file{total !== 1 ? "s" : ""}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Grid */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : items.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <ImageIcon className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">No media files yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload an image to get started.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      selected?.id === item.id ? "ring-2 ring-blue-500 border-blue-300" : "border-slate-200"
                    }`}
                  >
                    <div className="bg-slate-100 h-32 flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-slate-300" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-slate-700 truncate">{item.filename}</p>
                      <p className="text-xs text-slate-400">{formatBytes(item.size_bytes)}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 3).map((t) => (
                            <span key={t} className="bg-slate-100 text-slate-600 text-xs px-1 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="truncate">{selected.filename}</CardTitle>
                  <button onClick={() => setSelected(null)}>
                    <X className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                  </button>
                </CardHeader>

                <div className="space-y-3">
                  <div className="text-xs text-slate-500 space-y-1">
                    <p><span className="font-medium">Type:</span> {selected.mime_type}</p>
                    <p><span className="font-medium">Size:</span> {formatBytes(selected.size_bytes)}</p>
                    <p><span className="font-medium">Uploaded:</span> {formatDate(selected.created_at)}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                      <Sparkles className="h-3 w-3" />AI Description
                    </label>
                    <textarea
                      value={selected.ai_description ?? ""}
                      onChange={(e) => setSelected({ ...selected, ai_description: e.target.value })}
                      rows={3}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Alt Text</label>
                    <input
                      type="text"
                      value={selected.alt_text ?? ""}
                      onChange={(e) => setSelected({ ...selected, alt_text: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                      <Tag className="h-3 w-3" />Tags
                    </label>
                    <div className="flex gap-1 mb-1">
                      <input
                        type="text"
                        value={editTag}
                        onChange={(e) => setEditTag(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        placeholder="Add tag…"
                        className="flex-1 px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <button onClick={addTag} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs">+</button>
                    </div>
                    {(selected.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(selected.tags ?? []).map((t) => (
                          <span key={t} className="flex items-center gap-0.5 bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                            {t}
                            <button onClick={() => removeTag(t)}><X className="h-2.5 w-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleSaveMeta} loading={savingMeta} className="flex-1">Save</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(selected)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Select a file to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
