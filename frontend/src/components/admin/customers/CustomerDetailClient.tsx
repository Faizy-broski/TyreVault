"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MapPin, Pencil, Plus, Trash2, Truck } from "lucide-react";
import EditCustomerModal from "./EditCustomerModal";
import CreateAddressModal from "./CreateAddressModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Address,
  CustomerGroup,
  CustomerListItem,
} from "@/types/admin.types";
import type {
  CustomerOrder,
  OrderStats,
} from "@/app/admin/customers/[customerId]/page";
import {
  BACKEND_API_URL,
  createBackendHeaders,
  readBackendError,
} from "@/lib/backend-api";
import { toastSuccess, toastError } from "@/lib/toast";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function AccountBadge({ isGuest }: { isGuest: boolean }) {
  return (
    <Badge
      className={`inline-flex h-auto items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isGuest
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-green-200 bg-green-50 text-green-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isGuest ? "bg-amber-500" : "bg-green-500"}`}
      />
      {isGuest ? "Guest" : "Registered"}
    </Badge>
  );
}

function PaymentDot({ status }: { status: string }) {
  const colMap: Record<string, string> = {
    paid: "bg-green-500",
    unpaid: "bg-amber-500",
    partially_paid: "bg-blue-500",
    refunded: "bg-zinc-400",
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-zinc-600">
      <span className={`h-2 w-2 rounded-full ${colMap[status] ?? colMap.unpaid}`} />
      {(status ?? "unpaid").replace(/_/g, " ")}
    </span>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    fulfilled: "border-green-200 bg-green-50 text-green-700",
    processing: "border-amber-200 bg-amber-50 text-amber-700",
    paid: "border-blue-200 bg-blue-50 text-blue-700",
    pending: "border-zinc-200 bg-zinc-100 text-zinc-600",
    cancelled: "border-red-200 bg-red-50 text-red-700",
    refunded: "border-zinc-200 bg-zinc-100 text-zinc-600",
  };

  return (
    <Badge
      className={`h-auto whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? map.pending}`}
    >
      {(status ?? "pending").replace(/_/g, " ")}
    </Badge>
  );
}

function DeliveryTypeCell({
  orderType,
  fitmentId,
}: {
  orderType: string | null;
  fitmentId: string | null;
}) {
  if (!orderType || orderType === "home_delivery" || orderType === "shipping") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700">
        <Truck className="h-3.5 w-3.5 text-zinc-400" />
        Home Delivery
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-0.5 text-xs">
      <span className="flex items-center gap-1 text-zinc-700">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
        Fitment Centre
      </span>
      {fitmentId && (
        <Link
          href={`/admin/fitters/${fitmentId}`}
          className="pl-5 text-primary hover:underline"
        >
          #{fitmentId.slice(0, 8).toUpperCase()}
        </Link>
      )}
    </span>
  );
}

type Props = {
  accessToken: string;
  customer: CustomerListItem;
  orders: CustomerOrder[];
  orderStats: OrderStats;
  groups: CustomerGroup[];
  addresses: Address[];
  primaryAddress: Address | null;
  onRefresh?: () => void;
};

export default function CustomerDetailClient({
  accessToken,
  customer,
  orders,
  orderStats,
  groups,
  addresses,
  primaryAddress,
  onRefresh,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const modalParam = searchParams.get('modal');

  function closeModal() { router.replace(pathname) }

  const [addressPendingId, setAddressPendingId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [fulfilFilter, setFulfilFilter] = useState<string | null>(null);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);

  const [groupSearch, setGroupSearch]     = useState('');
  const [groupResults, setGroupResults]   = useState<CustomerGroup[]>([]);
  const [groupSearching, setGroupSearching] = useState(false);
  const [addingGroupId, setAddingGroupId] = useState<string | null>(null);
  const groupSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleGroupSearchChange(q: string) {
    setGroupSearch(q);
    if (groupSearchRef.current) clearTimeout(groupSearchRef.current);
    if (!q.trim()) { setGroupResults([]); return; }
    groupSearchRef.current = setTimeout(async () => {
      setGroupSearching(true);
      try {
        const res = await fetch(
          `${BACKEND_API_URL}/api/admin/customers/groups/list?search=${encodeURIComponent(q)}&page=1`,
          { headers: createBackendHeaders(accessToken) },
        );
        const json = await res.json();
        setGroupResults((json.data ?? []).slice(0, 5));
      } finally { setGroupSearching(false); }
    }, 300);
  }

  async function handleAddToGroup(group: CustomerGroup) {
    setAddingGroupId(group.group_id);
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/api/admin/customers/${customer.customer_id}/groups/${group.group_id}`,
        { method: 'PUT', headers: createBackendHeaders(accessToken) },
      );
      if (!res.ok) throw new Error(await readBackendError(res, 'Failed to add to group'));
      setLocalGroups(prev => prev.some(g => g.group_id === group.group_id) ? prev : [...prev, group]);
      setGroupSearch('');
      setGroupResults([]);
      toastSuccess(`Added to "${group.group_name}"`)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to add to group');
    } finally { setAddingGroupId(null); }
  }

  const fullName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "—";
  const isGuest = !customer.profile_id;

  const filteredOrders = orders.filter((order) => {
    if (paymentFilter && order.payment_status !== paymentFilter) return false;
    if (fulfilFilter && order.order_status !== fulfilFilter) return false;
    return true;
  });

  const addressDisplay = primaryAddress
    ? [
        primaryAddress.address_line1,
        primaryAddress.address_line2,
        primaryAddress.city,
        primaryAddress.state,
        primaryAddress.postal_code,
        primaryAddress.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "—";

  async function handleRemoveFromGroup(groupId: string, groupName: string) {
    setRemovingGroupId(groupId);
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/api/admin/customers/${customer.customer_id}/groups/${groupId}`,
        { method: 'DELETE', headers: createBackendHeaders(accessToken) },
      );
      if (!res.ok) throw new Error(await readBackendError(res, 'Failed to remove from group'));
      setLocalGroups(gs => gs.filter(g => g.group_id !== groupId));
      toastSuccess(`Removed from "${groupName}"`)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to remove from group')
    } finally {
      setRemovingGroupId(null);
    }
  }

  async function handleDeleteAddress(addressId: string) {
    setAddressPendingId(addressId);
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/api/admin/customers/${customer.customer_id}/addresses/${addressId}`,
        {
          method: "DELETE",
          headers: createBackendHeaders(accessToken),
        },
      );
      if (!res.ok) {
        throw new Error(await readBackendError(res, "Failed to delete address"));
      }
      toastSuccess("Address deleted");
      onRefresh?.();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to delete address");
    } finally {
      setAddressPendingId(null);
    }
  }

  return (
    <>
      {modalParam === 'add-address' && (
        <CreateAddressModal
          accessToken={accessToken}
          customerId={customer.customer_id}
          onClose={closeModal}
          onSuccess={() => { closeModal(); onRefresh?.() }}
        />
      )}

      {modalParam === 'edit' && (
        <EditCustomerModal
          accessToken={accessToken}
          customer={customer}
          onClose={closeModal}
          onSuccess={() => { closeModal(); onRefresh?.() }}
        />
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-primary">{fullName}</h1>
          <AccountBadge isGuest={isGuest} />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`${pathname}?modal=add-address`)}
            className="flex items-center gap-2 rounded-lg border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" />
            Add Address
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`${pathname}?modal=edit`)}
            className="flex items-center gap-2 rounded-lg border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Customer ID</p>
                <p className="font-mono text-sm font-medium text-zinc-800">
                  {customer.customer_id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Email</p>
                <p className="truncate text-sm text-zinc-800">{customer.email}</p>
              </div>
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Full Name</p>
                <p className="text-sm text-zinc-800">{fullName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Member Since</p>
                <p className="text-sm text-zinc-800">{fmtDate(customer.created_at)}</p>
              </div>
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Phone</p>
                <p className="text-sm text-zinc-800">{customer.phone || "—"}</p>
              </div>
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Auth Status</p>
                <AccountBadge isGuest={isGuest} />
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Customer Type</p>
                {customer.customer_type ? (
                  <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
                    {customer.customer_type}
                  </span>
                ) : <p className="text-sm text-zinc-400">—</p>}
              </div>
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Account Status</p>
                {customer.account_status ? (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    customer.account_status === 'active'  ? 'bg-green-50 text-green-700' :
                    customer.account_status === 'paused'  ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {customer.account_status}
                  </span>
                ) : <p className="text-sm text-zinc-400">—</p>}
              </div>
              <div className="px-5 py-4">
                <p className="mb-1 text-xs text-zinc-400">Business</p>
                <p className="text-sm text-zinc-800">{customer.business_name || "—"}</p>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="mb-1 text-xs text-zinc-400">Primary Address</p>
              <p className="text-sm text-zinc-800">{addressDisplay}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Orders</h2>
              <div className="flex flex-wrap items-center gap-2">
                {(["unpaid", "paid", "partially_paid", "refunded"] as const).map(
                  (status) => (
                    <Button
                      key={status}
                      type="button"
                      onClick={() =>
                        setPaymentFilter(paymentFilter === status ? null : status)
                      }
                      className={`inline-flex h-auto items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                        paymentFilter === status
                          ? " bg-primary text-black"
                          : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500"
                      }`}
                    >
                      + {status}
                    </Button>
                  ),
                )}
                <div className="mx-1 h-4 w-px bg-zinc-200" />
                {(["pending", "processing", "fulfilled"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    onClick={() =>
                      setFulfilFilter(fulfilFilter === status ? null : status)
                    }
                    className={`inline-flex h-auto items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                      fulfilFilter === status
                        ? " bg-primary text-black"
                        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500"
                    }`}
                  >
                    + {status}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
                    {[
                      "Order #",
                      "Delivery Type",
                      "Created ↓",
                      "Payment",
                      "Fulfillment",
                      "Items",
                      "Type",
                      "Order Total",
                    ].map((heading) => (
                      <TableHead
                        key={heading}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-zinc-500"
                      >
                        {heading}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-zinc-400"
                      >
                        No orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.order_id} className="hover:bg-zinc-50">
                        <TableCell className="px-4 py-3">
                          <Link
                            href={`/admin/orders/${order.order_id}`}
                            className="whitespace-nowrap font-medium text-primary hover:underline"
                          >
                            {order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <DeliveryTypeCell
                            orderType={order.order_type}
                            fitmentId={order.fitment_id ?? null}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                          {fmtDateTime(order.created_at)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <PaymentDot status={order.payment_status} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <OrderStatusBadge status={order.order_status} />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-zinc-600">
                          {order.item_count}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs capitalize text-zinc-600">
                          {order.payment_method?.replace(/_/g, " ") ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3 font-medium text-zinc-800">
                          {fmtMoney(order.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
              <span>
                Showing {filteredOrders.length} of {orders.length} orders
              </span>
              <span>Page 1 of 1</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Customer Groups
                  {localGroups.length > 0 && (
                    <span className="ml-1.5 font-normal text-zinc-400">({localGroups.length})</span>
                  )}
                </h2>
              </div>
              <div className="relative">
                <div className="relative max-w-xs">
                  <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    value={groupSearch}
                    onChange={e => handleGroupSearchChange(e.target.value)}
                    placeholder="Search groups to add…"
                    className="w-full rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {groupSearching && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-primary" />
                    </div>
                  )}
                </div>
                {groupResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-w-xs rounded-lg border border-zinc-200 bg-white shadow-lg">
                    {groupResults.map(g => {
                      const already = localGroups.some(lg => lg.group_id === g.group_id);
                      return (
                        <div key={g.group_id} className="flex items-center justify-between px-3 py-2 hover:bg-zinc-50 first:rounded-t-lg last:rounded-b-lg">
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{g.group_name}</p>
                            <p className="text-xs text-zinc-400">{g.customer_count} member{g.customer_count !== 1 ? 's' : ''}</p>
                          </div>
                          {already ? (
                            <span className="text-xs text-zinc-400">Already in group</span>
                          ) : (
                            <Button
                              type="button"
                              size="xs"
                              disabled={addingGroupId === g.group_id}
                              onClick={() => handleAddToGroup(g)}
                            >
                              {addingGroupId === g.group_id ? 'Adding…' : 'Add'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Group Name</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Members</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Created</TableHead>
                  <TableHead className="w-20 px-4 py-3" />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100">
                {localGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                      Not in any group.
                    </TableCell>
                  </TableRow>
                ) : (
                  localGroups.map((group) => (
                    <TableRow key={group.group_id} className="hover:bg-zinc-50">
                      <TableCell className="px-4 py-3 font-medium text-zinc-800">
                        <Link href={`/admin/customers/groups/${group.group_id}`} className="hover:underline">
                          {group.group_name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-zinc-600">{group.customer_count}</TableCell>
                      <TableCell className="px-4 py-3 text-xs text-zinc-500">{fmtDate(group.created_at)}</TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={removingGroupId === group.group_id}
                          onClick={() => handleRemoveFromGroup(group.group_id, group.group_name)}
                          className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          {removingGroupId === group.group_id ? 'Removing…' : 'Remove'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>

        <div className="w-full flex-shrink-0 space-y-4 lg:w-64">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900">Orders</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Total Value</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {fmtMoney(orderStats.totalValue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Orders</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {orderStats.count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Avg. Order Value</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {fmtMoney(orderStats.avgOrderValue)}
                </span>
              </div>
              {orderStats.lastOrderDate && (
                <div className="border-t border-zinc-100 pt-2">
                  <p className="text-xs text-zinc-400">Last Order</p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {fmtDate(orderStats.lastOrderDate)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {(customer.credit_limit != null || customer.payment_terms) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-zinc-900">Account Terms</h3>
              <div className="space-y-3">
                {customer.credit_limit != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Credit Limit</span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {fmtMoney(customer.credit_limit)}
                    </span>
                  </div>
                )}
                {customer.payment_terms && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Payment Terms</span>
                    <span className="text-sm text-zinc-700">{customer.payment_terms}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Addresses
                {addresses.length > 0 && (
                  <span className="ml-1.5 font-normal text-zinc-400">
                    ({addresses.length})
                  </span>
                )}
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`${pathname}?modal=add-address`)}
                className="h-auto rounded-lg border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Add
              </Button>
            </div>

            {addresses.length === 0 ? (
              <p className="py-2 text-center text-xs text-zinc-400">
                No addresses on file.
              </p>
            ) : (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <div
                    key={address.address_id}
                    className="rounded-lg border border-zinc-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium text-zinc-700">
                        {address.address_name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteAddress(address.address_id)}
                        disabled={addressPendingId === address.address_id}
                        aria-label={`Delete ${address.address_name} address`}
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {[address.address_line1, address.city, address.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
