"use client";

import { useState, useEffect, useMemo } from "react";
import { TopBar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ScheduledItem {
  id: string;
  title: string;
  status: string;
  platform: string | null;
  scheduled_at: string;
  asset_type: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function CalendarPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("content_assets")
        .select("id,title,status,platform,scheduled_at,asset_type")
        .eq("user_id", user.id)
        .not("scheduled_at", "is", null)
        .order("scheduled_at")
        .then(({ data }) => {
          setItems((data as ScheduledItem[]) ?? []);
          setLoading(false);
        });
    });
  }, []);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewDate]);

  const itemsByDay = useMemo(() => {
    const map: Record<string, ScheduledItem[]> = {};
    items.forEach((item) => {
      const d = new Date(item.scheduled_at);
      if (
        d.getFullYear() === viewDate.getFullYear() &&
        d.getMonth() === viewDate.getMonth()
      ) {
        const key = String(d.getDate());
        if (!map[key]) map[key] = [];
        map[key].push(item);
      }
    });
    return map;
  }, [items, viewDate]);

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  if (loading) return (
    <div><TopBar title="Content Calendar" /><div className="flex justify-center mt-20"><Spinner size="lg" /></div></div>
  );

  return (
    <div>
      <TopBar title="Content Calendar" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-sm text-slate-500">
            View scheduled content drafts. Schedules are saved metadata — no external publishing occurs.
          </p>
        </div>

        <Card>
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <h2 className="text-base font-semibold text-slate-900">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="bg-slate-50 min-h-[80px]" />;
              }
              const isToday =
                today.getDate() === day &&
                today.getMonth() === viewDate.getMonth() &&
                today.getFullYear() === viewDate.getFullYear();
              const dayItems = itemsByDay[String(day)] ?? [];

              return (
                <div
                  key={day}
                  className={`bg-white min-h-[80px] p-1.5 ${isToday ? "bg-blue-50" : ""}`}
                >
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday
                        ? "bg-blue-600 text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <Link key={item.id} href={`/studio`}>
                        <div className="truncate text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded cursor-pointer hover:bg-blue-200 transition-colors">
                          {item.title}
                        </div>
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-xs text-slate-400">+{dayItems.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming scheduled items */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Scheduled</CardTitle>
          </CardHeader>
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CalendarDays className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-500">No scheduled content</p>
              <p className="text-xs text-slate-400 mt-1">
                Set a scheduled date on any content asset to see it here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.slice(0, 10).map((item) => (
                <li key={item.id} className="py-3 flex items-center gap-3">
                  <div className="w-12 text-center">
                    <p className="text-xs text-slate-400">{new Date(item.scheduled_at).toLocaleDateString("en-US", { month: "short" })}</p>
                    <p className="text-lg font-bold text-slate-700 leading-none">{new Date(item.scheduled_at).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.platform ?? "Generic"}</p>
                  </div>
                  <Badge label={item.status} variant="status" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
