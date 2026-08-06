// components/dashboard/DashboardAgendaPanel.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronRight,
  MapPin,
  UserCheck,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Survey } from "@/types/survey.types";

export interface AgendaLeadItem {
  id: string;
  name: string;
  property: string;
  phone: string;
  status?: string | null;
  created_at?: string | null;
}

interface AgendaPanelProps {
  leads: AgendaLeadItem[];
  surveys: Survey[];
  loadingLeads: boolean;
  loadingSurveys: boolean;
}

/** Maksimal baris per tab — panel tidak boleh mendominasi layar ponsel. */
const MAX_ROWS = 3;

/** Warna titik status lead, mengikuti kolom `status` di crm_leads. */
const STATUS_DOT: Record<string, string> = {
  baru: "bg-emerald-500",
  new: "bg-emerald-500",
  contacted: "bg-amber-500",
  follow_up: "bg-amber-500",
  negotiation: "bg-amber-500",
  cold: "bg-slate-400",
  lost: "bg-slate-400",
};

const STATUS_LABEL: Record<string, string> = {
  baru: "Baru",
  new: "Baru",
  contacted: "Dihubungi",
  follow_up: "Follow-up",
  negotiation: "Negosiasi",
  cold: "Dingin",
  lost: "Hilang",
};

const MONTH_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGU", "SEP", "OKT", "NOV", "DES",
];

/** "3 jam lalu", "2 hari lalu" — cukup untuk menilai mendesak atau tidak. */
function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return `${Math.floor(days / 30)} bln lalu`;
}

function timeOfDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Satu baris, bukan blok — inilah yang memangkas tinggi panel lebih dari separuh. */
const ROW_CLASS =
  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors " +
  "hover:bg-[#FDFBF7] dark:hover:bg-slate-800/60 cursor-pointer";

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 py-3 text-[11px] text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2 px-2.5 py-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-8 rounded-lg bg-[#F4EFE6] dark:bg-slate-800 animate-pulse"
        />
      ))}
    </div>
  );
}

/** Angka kecil di label tab, supaya isi tab yang tersembunyi tetap terlihat. */
function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-bold leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/**
 * Muncul hanya bila ada entri yang tidak tertampung MAX_ROWS. Sengaja tanpa
 * angka total: daftar lead yang masuk ke panel ini sudah dipotong di sisi
 * query, jadi jumlah yang diketahui komponen bukan jumlah sebenarnya.
 */
function MoreLink({ total, onClick }: { total: number; onClick: () => void }) {
  if (total <= MAX_ROWS) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full pt-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
    >
      Lihat semua →
    </button>
  );
}

/**
 * Satu kartu dua tab menggantikan dua kartu bertumpuk. Karena TabsContent
 * melepas isi tab yang tidak aktif, tinggi kartunya tetap dan dashboard di
 * ponsel tidak ikut memanjang saat prospek atau survei bertambah.
 */
export function DashboardAgendaPanel({
  leads,
  surveys,
  loadingLeads,
  loadingSurveys,
}: AgendaPanelProps) {
  const router = useRouter();

  const visibleLeads = leads.slice(0, MAX_ROWS);
  const visibleSurveys = surveys.slice(0, MAX_ROWS);

  return (
    <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-xl overflow-hidden">
      <CardContent className="p-3">
        <Tabs defaultValue="followup">
          <TabsList className="w-full grid grid-cols-2 h-8 bg-[#FDFBF7] dark:bg-slate-800/60 rounded-lg p-0.5">
            <TabsTrigger
              value="followup"
              className="h-7 text-[11px] font-semibold rounded-md cursor-pointer"
            >
              <UserCheck className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
              Follow Up
              <CountBadge count={leads.length} />
            </TabsTrigger>
            <TabsTrigger
              value="survey"
              className="h-7 text-[11px] font-semibold rounded-md cursor-pointer"
            >
              <CalendarClock className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
              Survei
              <CountBadge count={surveys.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followup" className="mt-2 space-y-0.5">
            {loadingLeads ? (
              <LoadingRows />
            ) : visibleLeads.length === 0 ? (
              <EmptyRow>Tidak ada prospek yang menunggu.</EmptyRow>
            ) : (
              visibleLeads.map((lead) => {
                const status = (lead.status ?? "").toLowerCase();
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    className={ROW_CLASS}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        STATUS_DOT[status] ?? "bg-slate-400"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-slate-900 dark:text-white">
                        {lead.name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {lead.property}
                        {STATUS_LABEL[status] ? ` · ${STATUS_LABEL[status]}` : ""}
                      </span>
                    </span>
                    {lead.created_at && (
                      <time
                        dateTime={lead.created_at}
                        className="shrink-0 text-[9px] text-slate-400 dark:text-slate-500"
                      >
                        {relativeTime(lead.created_at)}
                      </time>
                    )}
                    <ChevronRight className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                );
              })
            )}
            <MoreLink total={leads.length} onClick={() => router.push("/crm/leads")} />
          </TabsContent>

          <TabsContent value="survey" className="mt-2 space-y-0.5">
            {loadingSurveys ? (
              <LoadingRows />
            ) : visibleSurveys.length === 0 ? (
              <EmptyRow>Belum ada jadwal survei mendatang.</EmptyRow>
            ) : (
              visibleSurveys.map((survey) => {
                const date = new Date(survey.scheduled_at);
                const isVirtual = survey.type === "virtual";
                return (
                  <button
                    key={survey.id}
                    type="button"
                    onClick={() => router.push("/surveys")}
                    className={ROW_CLASS}
                  >
                    {/* Chip tanggal dua baris: tanggal dan bulan terbaca sekilas
                        tanpa memakan lebar baris. */}
                    <span className="shrink-0 w-8 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-center leading-none">
                      <span className="block text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
                        {date.getDate()}
                      </span>
                      <span className="block text-[8px] font-semibold text-emerald-600/70 dark:text-emerald-500/70">
                        {MONTH_SHORT[date.getMonth()]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-slate-900 dark:text-white">
                        {survey.property?.title ?? "Survei properti"}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <time dateTime={survey.scheduled_at}>
                          {timeOfDay(survey.scheduled_at)}
                        </time>
                        <span aria-hidden>·</span>
                        {isVirtual ? (
                          <Video className="w-2.5 h-2.5" />
                        ) : (
                          <MapPin className="w-2.5 h-2.5" />
                        )}
                        {isVirtual ? "Virtual" : "Lapangan"}
                      </span>
                    </span>
                    <ChevronRight className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                );
              })
            )}
            <MoreLink total={surveys.length} onClick={() => router.push("/surveys")} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
