/** Detecção de plataforma e categoria a partir dos dados crus do fornecedor. */

export interface PlatformDef {
  id: string;
  label: string;
  keywords: string[];
}

export const PLATFORMS: PlatformDef[] = [
  { id: "instagram", label: "Instagram", keywords: ["instagram", "insta", "ig "] },
  { id: "tiktok", label: "TikTok", keywords: ["tiktok", "tik tok"] },
  { id: "youtube", label: "YouTube", keywords: ["youtube", "you tube", "yt "] },
  { id: "facebook", label: "Facebook", keywords: ["facebook", "fb "] },
  { id: "kwai", label: "Kwai", keywords: ["kwai"] },
  { id: "telegram", label: "Telegram", keywords: ["telegram", "tg "] },
  { id: "twitter", label: "Twitter / X", keywords: ["twitter", " x ", "twitter/x"] },
  { id: "spotify", label: "Spotify", keywords: ["spotify"] },
  { id: "twitch", label: "Twitch", keywords: ["twitch"] },
  { id: "outros", label: "Outros", keywords: [] },
];

export interface CategoryDef {
  id: string;
  label: string;
  keywords: string[];
}

// ATENÇÃO: a ordem importa. "seguidores" fica por ÚLTIMO porque o campo
// "category" do fornecedor é um balaio que cita "Seguidores" em quase tudo.
// Detectar categoria SEMPRE pelo NOME do serviço, nunca pelo balaio.
export const CATEGORIES: CategoryDef[] = [
  { id: "visualizacoes", label: "Visualizações", keywords: ["visualiz", "view", "play", "watch", "assist", "impress", "reprodu"] },
  { id: "curtidas", label: "Curtidas", keywords: ["curtida", "like", "reaç", "reac"] },
  { id: "comentarios", label: "Comentários", keywords: ["coment"] },
  { id: "compartilhamentos", label: "Compartilhamentos", keywords: ["compartilh", "share", "repost", "retweet", "salvamento", "save"] },
  { id: "seguidores", label: "Seguidores", keywords: ["seguidor", "follower", "inscrit", "subscriber", "member", "membro"] },
  { id: "outros", label: "Outros", keywords: [] },
];

export function detectPlatform(...text: (string | null | undefined)[]): string {
  const hay = text.filter(Boolean).join(" ").toLowerCase();
  for (const p of PLATFORMS) {
    if (p.id === "outros") continue;
    if (p.keywords.some((k) => hay.includes(k))) return p.id;
  }
  return "outros";
}

export function detectCategory(...text: (string | null | undefined)[]): string {
  const hay = text.filter(Boolean).join(" ").toLowerCase();
  for (const c of CATEGORIES) {
    if (c.id === "outros") continue;
    if (c.keywords.some((k) => hay.includes(k))) return c.id;
  }
  return "outros";
}

export function platformLabel(id: string | null | undefined): string {
  return PLATFORMS.find((p) => p.id === id)?.label ?? "Outros";
}

export function categoryLabel(id: string | null | undefined): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Outros";
}
