"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";

export interface Announcement {
  enabled: boolean;
  title: string;
  message: string;
}

/** Hash simples pra saber quando a mensagem mudou (reexibe ao trocar o texto). */
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

export function AnnouncementPopup({ announcement }: { announcement: Announcement | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!announcement?.enabled || !announcement.message) return;
    const id = hash(announcement.title + announcement.message);
    let dismissed: string | null = null;
    try {
      dismissed = localStorage.getItem("sx_announcement");
    } catch {
      /* private mode */
    }
    if (dismissed !== id) setOpen(true);
  }, [announcement]);

  function close() {
    if (announcement) {
      try {
        localStorage.setItem(
          "sx_announcement",
          hash(announcement.title + announcement.message)
        );
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  if (!announcement?.enabled) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            className="relative z-10 w-full max-w-md glass rounded-2xl"
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            <button
              onClick={close}
              className="absolute right-3 top-3 text-fg-subtle hover:text-fg"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
                <Megaphone className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-fg">
                {announcement.title || "Aviso"}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-fg-muted">
                {announcement.message}
              </p>
              <button
                onClick={close}
                className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-strong"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
