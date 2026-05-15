"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { AdminFitmentCentreSummary } from "@/types/admin.types";
import FitmentCentreRowMenu from "./FitmentCentreRowMenu";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_LIMIT = 20;

interface Props {
  initialCentres: AdminFitmentCentreSummary[];
  initialTotal: number;
  accessToken: string;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={`inline-flex items-center gap-1 h-auto rounded-full px-2 py-0.5 text-xs font-medium border-0 ${
        active ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-amber-500"}`}
      />
      {active ? "Active" : "Hold"}
    </Badge>
  );
}

export default function FitmentCentresClient({
  initialCentres,
  initialTotal,
  accessToken,
}: Props) {
  const [centres, setCentres] =
    useState<AdminFitmentCentreSummary[]>(initialCentres);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const headers = { Authorization: `Bearer ${accessToken}` };

  async function fetchCentres(opts: {
    search?: string;
    status?: string;
    page?: number;
  }) {
    setLoading(true);
    setFetchError(null);
    const qs = new URLSearchParams();
    if (opts.search) qs.set("search", opts.search);
    if (opts.status) qs.set("status", opts.status);
    qs.set("page", String(opts.page ?? 1));
    try {
      const res = await fetch(`${API}/api/admin/fitment-centres?${qs}`, {
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load centres (${res.status})`);
      }
      const json = await res.json();
      setCentres(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function applyStatus(s: string) {
    const next = s === status ? "" : s;
    setStatus(next);
    setPage(1);
    fetchCentres({ search, status: next, page: 1 });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchCentres({ search, status, page: 1 });
  }

  function goPage(p: number) {
    setPage(p);
    fetchCentres({ search, status, page: p });
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb
        crumbs={[
          { label: "Fitment Centre", href: "/admin/fitters" },
          { label: "Registered Centres" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Fitment Centres
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage all registered fitment centres
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          {(["active", "hold"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              onClick={() => applyStatus(s)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs h-auto transition-colors ${
                status === s
                  ? "border-primary bg-primary text-zinc-900 hover:bg-primary/90"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-500"
              }`}
            >
              <span>+</span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
          <div className="flex-1" />
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search centres..."
              className="pl-8 pr-3 text-xs border-zinc-300 rounded-lg focus:ring-primary/30 focus:border-primary w-48 h-8"
            />
          </form>
        </div>

        {fetchError && (
          <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
            {fetchError}
          </div>
        )}

        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Centre</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Partner ID</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Contact</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">ABN</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Joined</TableHead>
              <TableHead className="px-5 py-3 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100">
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : centres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-400">
                  No fitment centres found.
                </TableCell>
              </TableRow>
            ) : (
              centres.map((c) => (
                <TableRow key={c.fitment_id} className="hover:bg-zinc-50">
                  <TableCell className="px-5 py-3">
                    <Link href={`/admin/fitters/${c.fitment_id}`} className="flex flex-col group">
                      <span className="font-medium text-primary w-fit group-hover:underline">
                        {c.business_name}
                      </span>
                      <span className="text-zinc-400 text-xs w-fit group-hover:text-zinc-400 group-hover:underline">
                        {c.profiles?.email ?? "—"}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs font-mono text-zinc-600">{c.partner_id}</TableCell>
                  <TableCell className="px-5 py-3 text-xs text-zinc-600">{c.contact_phone ?? "—"}</TableCell>
                  <TableCell className="px-5 py-3 text-xs text-zinc-600">{c.business_number ?? "—"}</TableCell>
                  <TableCell className="px-5 py-3">
                    <StatusBadge active={c.is_active} />
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-zinc-500">{fmtDate(c.created_at)}</TableCell>
                  <TableCell className="px-5 py-3">
                    <FitmentCentreRowMenu
                      centre={c}
                      accessToken={accessToken}
                      onUpdated={(updated) =>
                        setCentres((prev) =>
                          prev.map((x) =>
                            x.fitment_id === updated.fitment_id ? updated : x,
                          ),
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs text-zinc-500">
          <span>
            Showing {centres.length} of {total}
          </span>
          <div className="flex items-center gap-3">
            <span>
              {page} of {totalPages || 1} pages
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => page > 1 && goPage(page - 1)}
                disabled={page <= 1}
                className="px-2 py-1 h-auto rounded border-zinc-300 text-xs"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => page < totalPages && goPage(page + 1)}
                disabled={page >= totalPages}
                className="px-2 py-1 h-auto rounded border-zinc-300 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
