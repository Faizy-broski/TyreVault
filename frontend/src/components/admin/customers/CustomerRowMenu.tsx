"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EditCustomerModal from "./EditCustomerModal";
import type { CustomerListItem } from "@/types/admin.types";
import {
  BACKEND_API_URL,
  createBackendHeaders,
  readBackendError,
} from "@/lib/backend-api";
import { toastError } from "@/lib/toast";

interface Props {
  customer: CustomerListItem;
  accessToken: string;
}

export default function CustomerRowMenu({ customer, accessToken }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/api/admin/customers/${customer.customer_id}`,
        {
          method: "DELETE",
          headers: createBackendHeaders(accessToken),
        },
      );
      if (!res.ok) {
        throw new Error(await readBackendError(res));
      }
      router.refresh();
      setShowDel(false);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div ref={ref} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="customer actions"
          onClick={() => setOpen((o) => !o)}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
            <button
              onClick={() => {
                setOpen(false);
                setShowEdit(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-zinc-400" />
              Edit Customer
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setShowDel(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {showEdit && (
        <EditCustomerModal
          accessToken={accessToken}
          customer={customer}
          onClose={() => setShowEdit(false)}
        />
      )}

      <Dialog
        open={showDel}
        onOpenChange={(o) => {
          if (!o) setShowDel(false);
        }}
      >
        <DialogContent
          className="rounded-2xl shadow-xl ring-0 bg-white sm:max-w-sm"
          showCloseButton={false}
        >
          <DialogTitle className="text-base font-semibold text-zinc-900">
            Delete Customer
          </DialogTitle>
          <p className="text-sm text-zinc-600">
            Are you sure you want to delete <strong>{customer.email}</strong>?
            This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
