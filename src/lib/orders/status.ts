import type { OrderStatus } from "@/types/database";

/** Converte status cru do fornecedor -> status interno do SeguidorX. */
export function mapProviderStatus(raw: string | null | undefined): OrderStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "processing";
  if (s.includes("partial")) return "partial";
  if (s.includes("complete")) return "completed";
  if (s.includes("cancel")) return "canceled";
  if (s.includes("refund")) return "refunded";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("pending") || s.includes("await") || s.includes("queue"))
    return "pending";
  if (s.includes("progress") || s.includes("processing") || s.includes("active"))
    return "processing";
  return "processing";
}

export const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; dot: string }
> = {
  pending: { label: "Pendente", color: "text-info", dot: "bg-info" },
  submitting: { label: "Enviando", color: "text-info", dot: "bg-info" },
  processing: { label: "Processando", color: "text-pending", dot: "bg-pending" },
  completed: { label: "Concluído", color: "text-success", dot: "bg-success" },
  partial: { label: "Parcial", color: "text-warning", dot: "bg-warning" },
  canceled: { label: "Cancelado", color: "text-danger", dot: "bg-danger" },
  failed: { label: "Falhou", color: "text-danger", dot: "bg-danger" },
  refunded: { label: "Estornado", color: "text-fg-muted", dot: "bg-fg-subtle" },
};

/** Status considerados "em andamento". */
export const OPEN_STATUSES: OrderStatus[] = [
  "pending",
  "submitting",
  "processing",
  "partial",
];
