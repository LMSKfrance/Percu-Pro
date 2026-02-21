"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const SCROLL_KEY = "percu_bottom_sheet_scroll";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Scrollable bottom sheet anchored above the sticky footer.
 * - position: fixed; left/right 16px; bottom: calc(var(--footer-h) + 12px)
 * - max-height so it never overlaps header or footer
 * - overscroll-behavior: contain so page behind doesn't scroll when sheet is focused
 * - Backdrop: click to close; ESC to close
 * - Remembers scroll position per session (sessionStorage)
 */
export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && scrollRef.current) {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(scrollRef.current.scrollTop));
      } catch {}
    }
  }, [open]);

  useEffect(() => {
    if (open && scrollRef.current) {
      const id = requestAnimationFrame(() => {
        try {
          const saved = sessionStorage.getItem(SCROLL_KEY);
          if (saved != null && scrollRef.current) scrollRef.current.scrollTop = Number(saved);
        } catch {}
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, handleEscape]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop: low opacity + blur, click closes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[99] bg-[#121212]/40 backdrop-blur-[2px]"
            style={{ touchAction: "none" }}
            onClick={onClose}
            aria-hidden
          />
          {/* Sheet: above footer, scrollable */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed left-4 right-4 z-[100] flex flex-col rounded-md overflow-hidden border border-[#121212]/10 bg-[#181818] shadow-[0_8px_32px_rgba(0,0,0,0.18),0_1px_0_rgba(255,255,255,0.04)_inset]"
            style={{
              bottom: "calc(var(--footer-h, 64px) + 12px)",
              maxHeight: "calc(100vh - var(--header-h, 80px) - var(--footer-h, 64px) - 24px)",
              overscrollBehavior: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tools panel"
          >
            <div
              ref={scrollRef}
              className="overflow-y-auto overflow-x-hidden min-h-0 flex-1 overscroll-contain"
              style={{ scrollbarWidth: "thin" }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
