"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { Plus, X, ArrowLeft, Star, Trash2 } from "lucide-react";
import Link from "next/link";

interface BrandProfile {
  id: string;
  name: string;
  description: string | null;
  tone: string | null;
  guidelines: string | null;
  target_audience: string | null;
  preferred_vocabulary: string[] | null;
  words_to_avoid: string[] | null;
  example_posts: string[] | null;
  is_default: boolean;
}

function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; }) {
  const [input, setInput] = useState("");
  const add = () => { const v = input.trim(); if (v && !values.includes(v)) { onChange([...values, v]); setInput(""); } };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {values.map((v) => (
            <span key={v} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [vocab, setVocab] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [examplePost, setExamplePost] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    fetch(`/api/brand/${id}`).then((r) => r.json()).then((d) => {
      setBrand(d);
      setName(d.name ?? "");
      setDescription(d.description ?? "");
      setTone(d.tone ?? "");
      setGuidelines(d.guidelines ?? "");
      setTargetAudience(d.target_audience ?? "");
      setVocab(d.preferred_vocabulary ?? []);
      setAvoid(d.words_to_avoid ?? []);
      setExamplePost(d.example_posts?.[0] ?? "");
      setIsDefault(d.is_default ?? false);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/brand/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description: description || undefined, tone: tone || undefined,
          guidelines: guidelines || undefined, target_audience: targetAudience || undefined,
          preferred_vocabulary: vocab.length ? vocab : undefined,
          words_to_avoid: avoid.length ? avoid : undefined,
          example_posts: examplePost.trim() ? [examplePost] : undefined,
          is_default: isDefault,
        }),
      });
      if (!res.ok) { const d = await res.json(); toast(d.error ?? "Save failed", "error"); return; }
      toast("Brand profile saved!", "success");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this brand profile?")) return;
    await fetch(`/api/brand/${id}`, { method: "DELETE" });
    toast("Profile deleted.", "info");
    router.push("/brand");
  };

  if (loading) return <div><TopBar title="Brand Profile" /><div className="flex justify-center mt-20"><Spinner size="lg" /></div></div>;
  if (!brand) return <div><TopBar title="Brand Profile" /><p className="p-6 text-slate-500">Profile not found.</p></div>;

  return (
    <div>
      <TopBar title={brand.name} />
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/brand" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />Brand Memory
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{brand.name}</span>
          {brand.is_default && <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Star className="h-3 w-3" />Default</span>}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
            <div className="space-y-3">
              <Input label="Brand Name *" value={name} onChange={(e) => setName(e.target.value)} required />
              <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Input label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} />
              <Input label="Target Audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Writing Guidelines</CardTitle></CardHeader>
            <div className="space-y-3">
              <Textarea label="Guidelines" value={guidelines} onChange={(e) => setGuidelines(e.target.value)} className="min-h-[100px]" />
              <TagInput label="Preferred Vocabulary" values={vocab} onChange={setVocab} placeholder="Add a word…" />
              <TagInput label="Words / Claims to Avoid" values={avoid} onChange={setAvoid} placeholder="Add a word…" />
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Example Approved Post</CardTitle></CardHeader>
            <Textarea value={examplePost} onChange={(e) => setExamplePost(e.target.value)} className="min-h-[100px]" />
          </Card>
          <Card>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
              <div>
                <p className="text-sm font-medium text-slate-700">Set as default profile</p>
                <p className="text-xs text-slate-400">Pre-selected when generating content.</p>
              </div>
            </label>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" loading={saving} size="lg" className="flex-1">Save Changes</Button>
            <Button type="button" variant="danger" size="lg" onClick={handleDelete}><Trash2 className="h-4 w-4" />Delete</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
