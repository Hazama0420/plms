// components/invoices/CommissionLedgerTable.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Coins,
  CheckCircle2,
  Clock,
  Building2,
  User,
  FileText,
  AlertCircle,
  XCircle,
  Loader2,
  BadgePercent,
  Wallet,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CommissionLedgerEntry } from "@/services/revenue-operations.service";
import {
  getCommissionLedgersAction,
  updateCommissionStatusAction,
} from "@/actions/commissions.action";

export function CommissionLedgerTable() {
  const { t } = useTranslation();
  const { userRole } = usePermissions();

  const [ledgers, setLedgers] = useState<CommissionLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Mutation dialog state
  const [targetItem, setTargetItem] = useState<CommissionLedgerEntry | null>(null);
  const [nextStatus, setNextStatus] = useState<"approved" | "paid" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Privileged check: Only Admin and Super Admin can mutate commission status
  const canManage = userRole === "admin" || userRole === "super_admin";

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: {
      label: t("commissions.status_pending"),
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
    },
    approved: {
      label: t("commissions.status_approved"),
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
    },
    paid: {
      label: t("commissions.status_paid"),
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
    },
    cancelled: {
      label: t("commissions.status_cancelled"),
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800 border-slate-200",
    },
  };

  const formatCurrency = (val: number | null | undefined) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatRate = (rate: number | null | undefined) => {
    if (typeof rate !== "number") return "2.5%";
    const pct = rate * 100;
    return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // Fetch data via Server Action
  const fetchLedgers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommissionLedgersAction({
        status: filterStatus !== "all" ? filterStatus : undefined,
        limit: 100,
      });

      if (!res.success) {
        toast.error(t("commissions.toast.load_failed"), {
          description: res.error || undefined,
        });
        setLedgers([]);
      } else {
        setLedgers(res.data || []);
      }
    } catch (err: any) {
      console.error("Error loading commissions:", err);
      toast.error(t("commissions.toast.load_failed"));
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, t]);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  // Client-side search filtering
  const filtered = useMemo(() => {
    return ledgers.filter((item) => {
      // Status filter
      if (filterStatus !== "all" && item.status !== filterStatus) {
        return false;
      }

      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();

      const agentName = item.agent?.full_name?.toLowerCase() || "";
      const agentEmail = item.agent?.email?.toLowerCase() || "";
      const propertyTitle = item.property?.title?.toLowerCase() || "";
      const listingCode = item.property?.listing_code?.toLowerCase() || "";
      const invoiceNo = item.invoice?.invoice_number?.toLowerCase() || "";
      const dealRef = item.deal_id?.toLowerCase() || "";
      const idStr = item.id.toLowerCase();

      return (
        agentName.includes(q) ||
        agentEmail.includes(q) ||
        propertyTitle.includes(q) ||
        listingCode.includes(q) ||
        invoiceNo.includes(q) ||
        dealRef.includes(q) ||
        idStr.includes(q)
      );
    });
  }, [ledgers, search, filterStatus]);

  // Statistics calculation
  const stats = useMemo(() => {
    let total = 0;
    let pending = 0;
    let approved = 0;
    let paid = 0;

    for (const item of ledgers) {
      const amt = Number(item.commission_amount) || 0;
      total += amt;
      if (item.status === "pending") pending += amt;
      else if (item.status === "approved") approved += amt;
      else if (item.status === "paid") paid += amt;
    }

    return { total, pending, approved, paid };
  }, [ledgers]);

  // Action mutation handler
  const handleConfirmStatusChange = async () => {
    if (!targetItem || !nextStatus || submitting) return;

    setSubmitting(true);
    try {
      const res = await updateCommissionStatusAction(targetItem.id, nextStatus);

      if (res.success) {
        toast.success(
          nextStatus === "approved"
            ? t("commissions.toast.approve_success")
            : t("commissions.toast.pay_success")
        );
        // Refresh local data
        setLedgers((prev) =>
          prev.map((item) =>
            item.id === targetItem.id
              ? { ...item, status: nextStatus, updated_at: new Date().toISOString() }
              : item
          )
        );
        setTargetItem(null);
        setNextStatus(null);
      } else {
        toast.error(t("commissions.toast.update_failed"), {
          description: res.error || undefined,
        });
      }
    } catch (err: any) {
      toast.error(t("commissions.toast.update_failed"), {
        description: err?.message || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header & Subtitle */}
      <div className="border-b border-border/60 pb-3">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Coins className="h-5 w-5 text-emerald-600" />
          {t("commissions.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("commissions.subtitle")}
        </p>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          {
            label: t("commissions.stats.total_commission"),
            value: formatCurrency(stats.total),
            icon: Coins,
            border: "border-l-emerald-500",
            textColor: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: t("commissions.stats.pending_commission"),
            value: formatCurrency(stats.pending),
            icon: Clock,
            border: "border-l-amber-500",
            textColor: "text-amber-600 dark:text-amber-400",
          },
          {
            label: t("commissions.stats.approved_commission"),
            value: formatCurrency(stats.approved),
            icon: ShieldCheck,
            border: "border-l-blue-500",
            textColor: "text-blue-600 dark:text-blue-400",
          },
          {
            label: t("commissions.stats.paid_commission"),
            value: formatCurrency(stats.paid),
            icon: Wallet,
            border: "border-l-indigo-500",
            textColor: "text-indigo-600 dark:text-indigo-400",
          },
        ].map((st, idx) => {
          const IconComp = st.icon;
          return (
            <Card key={idx} className={cn("border-l-4 shadow-xs bg-card rounded-xl", st.border)}>
              <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground">{st.label}</p>
                  <h3 className={cn("text-sm sm:text-base font-bold font-mono mt-0.5", st.textColor)}>
                    {st.value}
                  </h3>
                </div>
                <div className="p-1.5 sm:p-2 bg-muted rounded-lg text-muted-foreground shrink-0">
                  <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between bg-card p-3 rounded-2xl border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("commissions.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl focus-visible:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "all")}>
            <SelectTrigger className="flex-1 sm:w-[170px] h-9 text-xs rounded-xl">
              <SelectValue placeholder={t("commissions.filter_status")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">{t("commissions.all_status")}</SelectItem>
              <SelectItem value="pending" className="text-xs">{t("commissions.status_pending")}</SelectItem>
              <SelectItem value="approved" className="text-xs">{t("commissions.status_approved")}</SelectItem>
              <SelectItem value="paid" className="text-xs">{t("commissions.status_paid")}</SelectItem>
              <SelectItem value="cancelled" className="text-xs">{t("commissions.status_cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLedgers}
            disabled={loading}
            className="h-9 px-2.5 rounded-xl gap-1 text-xs shrink-0 cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">{t("commissions.refresh")}</span>
          </Button>
        </div>
      </div>

      {/* 4. Mobile Cards Layout */}
      <div className="block md:hidden space-y-2.5">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground rounded-2xl">
            {ledgers.length === 0 ? t("commissions.empty") : t("commissions.no_results")}
          </Card>
        ) : (
          filtered.map((item) => {
            const st = statusConfig[item.status] || statusConfig.pending;

            return (
              <Card
                key={item.id}
                className="border shadow-xs p-3.5 space-y-2.5 rounded-2xl bg-card"
              >
                {/* Header: Date + Status Badge */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-semibold border px-2 py-0.5 rounded-md", st.bg, st.color)}
                  >
                    {st.label}
                  </Badge>
                </div>

                {/* Agent & Property */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-xs text-foreground">
                      {item.agent?.full_name || "Agen"}
                    </span>
                    {item.agent?.email && (
                      <span className="text-[10px] text-muted-foreground">
                        ({item.agent.email})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="line-clamp-1">
                      {item.property?.title || "Properti"}
                    </span>
                    {item.property?.listing_code && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        [{item.property.listing_code}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial breakdown: Closing & Commission */}
                <div className="bg-muted/40 p-2.5 rounded-xl border border-border/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">{t("commissions.table.sale_amount")}</span>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {formatCurrency(item.sale_amount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">
                      {t("commissions.table.commission_amount")} ({formatRate(item.commission_rate)})
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.commission_amount)}
                    </span>
                  </div>
                </div>

                {/* Invoice reference & Action button */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    {item.invoice?.invoice_number ? (
                      <span className="font-mono font-semibold text-foreground">
                        {item.invoice.invoice_number}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground text-[10px]">
                        {t("commissions.no_invoice")}
                      </span>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      {item.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTargetItem(item);
                            setNextStatus("approved");
                          }}
                          className="h-7 text-xs px-2.5 rounded-lg border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          {t("commissions.actions.approve")}
                        </Button>
                      )}
                      {item.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setTargetItem(item);
                            setNextStatus("paid");
                          }}
                          className="h-7 text-xs px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer font-medium"
                        >
                          <Wallet className="w-3 h-3" />
                          {t("commissions.actions.mark_paid")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. Desktop Table Layout */}
      <div className="hidden md:block">
        <Card className="border shadow-xs rounded-2xl overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="font-bold">{t("commissions.table.date")}</TableHead>
                <TableHead className="font-bold">{t("commissions.table.agent")}</TableHead>
                <TableHead className="font-bold">{t("commissions.table.property")}</TableHead>
                <TableHead className="font-bold text-right">{t("commissions.table.sale_amount")}</TableHead>
                <TableHead className="font-bold text-center">{t("commissions.table.commission_rate")}</TableHead>
                <TableHead className="font-bold text-right">{t("commissions.table.commission_amount")}</TableHead>
                <TableHead className="font-bold">{t("commissions.table.invoice")}</TableHead>
                <TableHead className="font-bold text-center">{t("commissions.table.status")}</TableHead>
                <TableHead className="font-bold text-right">{t("commissions.table.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-border/40">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-20 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                    {ledgers.length === 0 ? t("commissions.empty") : t("commissions.no_results")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const st = statusConfig[item.status] || statusConfig.pending;

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Tanggal */}
                      <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </TableCell>

                      {/* Agen */}
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {item.agent?.full_name || "Agen"}
                        </div>
                        {item.agent?.email && (
                          <div className="text-[10px] text-muted-foreground">
                            {item.agent.email}
                          </div>
                        )}
                      </TableCell>

                      {/* Properti */}
                      <TableCell className="max-w-[200px]">
                        <div className="font-medium text-foreground line-clamp-1">
                          {item.property?.title || "Properti"}
                        </div>
                        {item.property?.listing_code && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {item.property.listing_code}
                          </span>
                        )}
                      </TableCell>

                      {/* Nilai Closing */}
                      <TableCell className="text-right font-mono font-medium text-foreground whitespace-nowrap">
                        {formatCurrency(item.sale_amount)}
                      </TableCell>

                      {/* Rate Komisi */}
                      <TableCell className="text-center font-mono font-medium text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                          {formatRate(item.commission_rate)}
                        </Badge>
                      </TableCell>

                      {/* Nominal Komisi */}
                      <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(item.commission_amount)}
                      </TableCell>

                      {/* Invoice terkait */}
                      <TableCell>
                        {item.invoice?.invoice_number ? (
                          <div className="flex items-center gap-1 font-mono text-[11px] text-foreground">
                            <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>{item.invoice.invoice_number}</span>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground text-[10px]">
                            {t("commissions.no_invoice")}
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-semibold border px-2 py-0.5 rounded-md whitespace-nowrap", st.bg, st.color)}
                        >
                          {st.label}
                        </Badge>
                      </TableCell>

                      {/* Action buttons */}
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTargetItem(item);
                                  setNextStatus("approved");
                                }}
                                className="h-7 text-xs px-2.5 rounded-lg border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                {t("commissions.actions.approve")}
                              </Button>
                            )}
                            {item.status === "approved" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setTargetItem(item);
                                  setNextStatus("paid");
                                }}
                                className="h-7 text-xs px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer font-medium"
                              >
                                <Wallet className="w-3 h-3" />
                                {t("commissions.actions.mark_paid")}
                              </Button>
                            )}
                            {item.status === "paid" && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {t("commissions.status_paid")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            {t("commissions.actions.read_only")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* 6. Confirmation Dialog */}
      <Dialog open={!!targetItem && !!nextStatus} onOpenChange={(open) => !open && !submitting && setTargetItem(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {nextStatus === "approved" ? (
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              ) : (
                <Wallet className="w-5 h-5 text-emerald-600" />
              )}
              {nextStatus === "approved"
                ? t("commissions.dialog.approve_title")
                : t("commissions.dialog.pay_title")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5">
              {nextStatus === "approved"
                ? t("commissions.dialog.approve_desc")
                : t("commissions.dialog.pay_desc")}
            </DialogDescription>
          </DialogHeader>

          {targetItem && (
            <div className="bg-muted/40 p-3 rounded-xl border border-border/40 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("commissions.table.agent")}:</span>
                <span className="font-semibold text-foreground">{targetItem.agent?.full_name || "Agen"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("commissions.table.property")}:</span>
                <span className="font-medium text-foreground">{targetItem.property?.title || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("commissions.table.sale_amount")}:</span>
                <span className="font-mono text-foreground">{formatCurrency(targetItem.sale_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1">
                <span className="font-semibold text-foreground">
                  {t("commissions.table.commission_amount")} ({formatRate(targetItem.commission_rate)}):
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(targetItem.commission_amount)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => {
                setTargetItem(null);
                setNextStatus(null);
              }}
              className="rounded-xl text-xs"
            >
              {t("commissions.dialog.cancel_btn")}
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleConfirmStatusChange}
              className={cn(
                "rounded-xl text-xs gap-1 font-medium",
                nextStatus === "approved"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  {nextStatus === "approved"
                    ? t("commissions.actions.approving")
                    : t("commissions.actions.paying")}
                </>
              ) : (
                t("commissions.dialog.confirm_btn")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
