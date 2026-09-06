import { PaymentGatewaysPanel } from "@/components/admin/payment-gateways-panel";

export const dynamic = "force-dynamic";

export default function AdminPaymentsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="display text-[2rem] leading-none">Pagamentos</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Conecte e ative o gateway que recebe os PIX dos clientes. As chaves ficam
          guardadas com segurança — só o servidor acessa.
        </p>
      </div>
      <PaymentGatewaysPanel />
    </div>
  );
}
