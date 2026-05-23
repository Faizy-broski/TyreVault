"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogPortal, DialogOverlay } from "@/components/ui/dialog";

interface SelectorDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  step: string;
  options: string[];
  popularOptions?: string[];
  selected?: string;
  onSelect: (value: string) => void;
}

export function SelectorDialog({
  open,
  onClose,
  title,
  subtitle,
  step,
  options,
  popularOptions,
  selected,
  onSelect,
}: SelectorDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (open) {
      setQuery("");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        selectedRef.current?.scrollIntoView({ block: "nearest" });
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50 backdrop-blur-sm" />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border-t-5 border-primary bg-[#111111] shadow-[0_32px_80px_rgba(0,0,0,0.9),0_0_0_1px_rgba(217,164,7,0.07)] outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          {/* Header */}
          <div className="border-b border-white/5 px-6 pb-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.35em] text-primary">
                  {step}
                </p>
                <DialogPrimitive.Title className="font-oswald text-[22px] font-black leading-none text-white">
                  {title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1.5 text-xs text-white/40">
                  {subtitle}
                </DialogPrimitive.Description>
              </div>

              <DialogPrimitive.Close className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/35 transition-all hover:border-white/25 hover:bg-white/5 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9a407]/40">
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full rounded-xl border border-white/7 bg-white/3 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-all duration-200 focus:border-[#d9a407]/35 focus:bg-white/5 focus:shadow-[0_0_0_3px_rgba(217,164,7,0.08)]"
              />
            </div>
          </div>

          {/* Popular chips */}
          {popularOptions && popularOptions.length > 0 && !query && (
            <div className="flex flex-wrap gap-2 border-b border-white/5 px-6 py-4">
              <p className="w-full text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                Popular
              </p>
              {popularOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelect(opt)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9a407]/40",
                    selected === opt
                      ? "border-primary bg-[#d9a407]/12 text-primary"
                      : "border-white/8 bg-white/3 text-white/55 hover:border-primary hover:bg-white/7 hover:text-primary",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable list */}
          <div className="max-h-67 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/25">
                No results for &ldquo;{query}&rdquo;
              </p>
            ) : (
              filtered.map((option, i) => {
                const isSelected = selected === option;
                return (
                  <button
                    key={option}
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => onSelect(option)}
                    className={cn(
                      "flex w-full items-center justify-between px-6 py-3 text-sm transition-all duration-150 focus-visible:bg-white/5 focus-visible:outline-none",
                      isSelected
                        ? "bg-[#d9a407]/8 text-[#d9a407]"
                        : "text-white/65 hover:bg-primary/4 hover:text-primary",
                      i < filtered.length - 1 && "border-b border-white/4",
                    )}
                  >
                    <span className="font-medium">{option}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#d9a407]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
