"use client";

import { TopBar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink, CheckCircle2, Info } from "lucide-react";

function EnvCheck({ name, label }: { name: string; label: string }) {
  // Only NEXT_PUBLIC_ vars are visible client-side; for others we show N/A
  const isPublic = name.startsWith("NEXT_PUBLIC_");
  const value = isPublic ? process.env[name] : undefined;
  const configured = isPublic ? Boolean(value && !value.includes("your-")) : null;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div>
        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{name}</code>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
      {configured === null ? (
        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Server-side only</span>
      ) : configured ? (
        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircle2 className="h-3 w-3" />Configured
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
          <AlertTriangle className="h-3 w-3" />Not set
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        {/* Environment status */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
          </CardHeader>
          <EnvCheck name="NEXT_PUBLIC_SUPABASE_URL" label="Supabase project URL" />
          <EnvCheck name="NEXT_PUBLIC_SUPABASE_ANON_KEY" label="Supabase anonymous key" />
          <p className="text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg">
            Server-only variables (SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY) are not shown here for security.
            Check your terminal output or Vercel dashboard to verify they are set.
          </p>
        </Card>

        {/* Supabase setup guide */}
        <Card>
          <CardHeader>
            <CardTitle>Supabase Setup</CardTitle>
          </CardHeader>
          <ol className="space-y-3 text-sm text-slate-700">
            {[
              "Create a project at supabase.com",
              "Go to Settings → API → copy Project URL and anon/public key",
              "Go to Settings → API → copy service_role secret key",
              "Run the SQL from supabase/migrations/001_initial_schema.sql in the SQL editor",
              'Create a private storage bucket named "media"',
              "Run the storage bucket policies from the comments at the bottom of the migration file",
              "Copy .env.example to .env.local and fill in the values",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-medium">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-4"
          >
            Supabase documentation <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>

        {/* AI provider guide */}
        <Card>
          <CardHeader>
            <CardTitle>AI Provider Setup</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm text-slate-700">
            <p>ContentFlow AI uses an OpenAI-compatible API. Configure one of:</p>
            <ul className="space-y-2">
              {[
                { name: "OpenAI", url: "https://platform.openai.com", key: "OPENAI_API_KEY", note: "Works out of the box with gpt-4o-mini" },
                { name: "Azure OpenAI", url: "https://azure.microsoft.com/en-us/products/ai-services/openai-service", key: "OPENAI_API_KEY + OPENAI_BASE_URL", note: "Set BASE_URL to your Azure endpoint" },
                { name: "Groq", url: "https://console.groq.com", key: "OPENAI_API_KEY + OPENAI_BASE_URL", note: "Set BASE_URL to https://api.groq.com/openai/v1" },
              ].map((p) => (
                <li key={p.name} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{p.note}</p>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">{p.key}</code>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Rate limiting notice */}
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Rate Limiting Notice</p>
              <p className="text-sm text-amber-800 mt-1">
                ContentFlow AI uses an in-process rate limiter: 20 AI requests per user per minute.
                In multi-instance deployments (e.g. Vercel), this limit applies per instance.
                For distributed production use, replace with a Redis-backed limiter (e.g. Upstash).
              </p>
            </div>
          </div>
        </Card>

        {/* Security notes */}
        <Card>
          <CardHeader>
            <CardTitle>Security Notes</CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              "All AI keys are server-side only — never exposed to the browser",
              "Every database operation is protected by Supabase Row Level Security",
              "File uploads use magic-byte MIME validation (not just extension checks)",
              "Media files are stored in a private bucket with signed URLs",
              "Zod validates all API request bodies",
              "Security headers (CSP, X-Frame-Options, etc.) are set globally",
              "Rate limiting prevents AI abuse per user session",
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
