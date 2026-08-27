"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LogOut, Menu, X, Shield, ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { userNav, adminNav, type NavItem } from "@/lib/nav";
import { signOutAction } from "@/app/(auth)/actions";

interface Props {
  children: React.ReactNode;
  name: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  section: "user" | "admin";
}

export function AppShell({ children, name, email, balance, isAdmin, section }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = section === "admin" ? adminNav : userNav;
  const bottomNav = userNav;

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin"
      ? pathname === href
      : pathname.startsWith(href);

  async function handleSignOut() {
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-bg-soft px-4 py-5 lg:flex">
        <Link href={section === "admin" ? "/admin" : "/dashboard"} className="px-2">
          <Logo />
        </Link>

        {section === "admin" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary-soft">
            <Shield className="h-3.5 w-3.5" /> Painel administrativo
          </div>
        )}

        <nav className="mt-6 flex-1 space-y-1">
          {nav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        {section === "user" && isAdmin && (
          <Link
            href="/admin"
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <Shield className="h-4 w-4" /> Área admin
          </Link>
        )}
        {section === "admin" && (
          <Link
            href="/dashboard"
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <LayoutGridBack /> Voltar ao painel
          </Link>
        )}

        <UserCard name={name} email={email} onSignOut={handleSignOut} />
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md lg:px-8">
          <button
            className="lg:hidden text-fg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="lg:hidden">
            <Logo showText={false} size={30} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {section === "user" && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-[11px] uppercase tracking-wide text-fg-subtle">
                    Saldo
                  </p>
                  <p className="text-sm font-semibold text-fg">{formatBRL(balance)}</p>
                </div>
                <Link href="/wallet">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Adicionar saldo</span>
                    <span className="sm:hidden">{formatBRL(balance)}</span>
                  </Button>
                </Link>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1.5 hover:bg-surface-3"
              >
                <Avatar name={name} />
                <ChevronDown className="hidden h-4 w-4 text-fg-subtle sm:block" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface glass"
                    >
                      <div className="border-b border-border px-4 py-3">
                        <p className="truncate text-sm font-medium text-fg">{name}</p>
                        <p className="truncate text-xs text-fg-subtle">{email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute left-0 top-0 h-full w-72 border-r border-border bg-bg-soft px-4 py-5"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-2">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="text-fg-subtle">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-6 space-y-1" onClick={() => setMobileOpen(false)}>
                {nav.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} />
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav mobile (apenas área do usuário) */}
      {section === "user" && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-bg/90 backdrop-blur-md lg:hidden">
          {bottomNav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                  active ? "text-primary-soft" : "text-fg-subtle"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary-soft"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg"
      )}
    >
      <Icon className="h-4.5 w-4.5" />
      {item.label}
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-strong text-xs font-bold text-white">
      {initials || "S"}
    </span>
  );
}

function UserCard({
  name,
  email,
  onSignOut,
}: {
  name: string;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <div className="mt-auto flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2.5">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{name}</p>
        <p className="truncate text-xs text-fg-subtle">{email}</p>
      </div>
      <button
        onClick={onSignOut}
        className="text-fg-subtle hover:text-danger"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function LayoutGridBack() {
  return <span className="text-base leading-none">←</span>;
}
