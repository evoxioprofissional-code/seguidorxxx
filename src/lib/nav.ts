import {
  LayoutDashboard,
  ShoppingBag,
  ListOrdered,
  Wallet,
  LayoutGrid,
  Users,
  Settings,
  Plug,
  Code2,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const userNav: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/services", label: "Comprar", icon: ShoppingBag },
  { href: "/orders", label: "Pedidos", icon: ListOrdered },
  { href: "/wallet", label: "Carteira", icon: Wallet },
  { href: "/integracao", label: "API", icon: Code2 },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/services", label: "Serviços", icon: LayoutGrid },
  { href: "/admin/velocidade", label: "Velocidade", icon: Zap },
  { href: "/admin/orders", label: "Pedidos", icon: ListOrdered },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/integrations", label: "Integrações", icon: Plug },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
];
