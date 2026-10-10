"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Plus, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
      setInput("");
    }
  };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {values.map((v) => (
            <span key={v} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewBrandPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [vocab, setVocab] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [examplePost, setExamplePost] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast("Brand name is required.", "warning"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          tone: tone || undefined,
          guidelines: guidelines || undefined,
          target_audience: targetAudience || undefined,
          preferred_vocabulary: vocab.length ? vocab : undefined,
          words_to_avoid: avoid.length ? avoid : undefined,
          example_posts: examplePost.trim() ? [examplePost] : undefined,
          is_default: isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Failed to create profile", "error"); return; }
      toast("Brand profile created!", "success");
      router.push(`/brand/${data.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="New Brand Profile" />
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/brand" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Brand Memory
          </Link>
          <span>/</span>
          <span className="text-slate-800">New Profile</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
            <div className="space-y-3">
              <Input label="Brand Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required />
              <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of your brand…" />
              <Input label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="professional, friendly, authoritative…" />
              <Input label="Target Audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Who is your audience?" />
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Writing Guidelines</CardTitle></CardHeader>
            <div className="space-y-3">
              <Textarea
                label="Guidelines"
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                placeholder="Specific writing rules, style notes, formatting preferences…"
                className="min-h-[100px]"
              />
              <TagInput label="Preferred Vocabulary" values={vocab} onChange={setVocab} placeholder="Add a word or phrase…" />
              <TagInput label="Words / Claims to Avoid" values={avoid} onChange={setAvoid} placeholder="Add a word or phrase…" />
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Example Approved Post</CardTitle></CardHeader>
            <Textarea
              value={examplePost}
              onChange={(e) => setExamplePost(e.target.value)}
              placeholder="Paste an example of a post that represents your brand well…"
              className="min-h-[100px]"
            />
          </Card>

          <Card>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Set as default profile</p>
                <p className="text-xs text-slate-400">This profile will be pre-selected when generating content.</p>
              </div>
            </label>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" loading={loading} size="lg" className="flex-1">
              Create Brand Profile
            </Button>
            <Link href="/brand">
              <Button type="button" variant="outline" size="lg">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
