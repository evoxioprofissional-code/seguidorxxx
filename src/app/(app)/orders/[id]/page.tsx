import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrderDetail } from "@/components/orders/order-detail";
import type { Order } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos pedidos
      </Link>
      <OrderDetail order={data as Order} />
    </div>
  );
}
