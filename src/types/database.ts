/**
 * Tipos do banco (mantidos em sincronia com supabase/migrations).
 * Simplificado — cobre as tabelas usadas pela aplicação.
 */

export type UserRole = "user" | "admin";
export type OrderStatus =
  | "pending"
  | "submitting"
  | "processing"
  | "completed"
  | "partial"
  | "canceled"
  | "failed"
  | "refunded";
export type TxType = "deposit" | "purchase" | "refund" | "adjustment";
export type PaymentStatus =
  | "pending"
  | "approved"
  | "expired"
  | "canceled"
  | "refunded";
export type PricingMode = "manual" | "markup" | "multiplier";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  status: "active" | "blocked";
  cpf_cnpj: string | null;
  asaas_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type WalletTransaction = {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  balance_after: number | null;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export type ProviderService = {
  id: string;
  provider: string;
  provider_service_id: string;
  name: string | null;
  category: string | null;
  type: string | null;
  provider_rate: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  has_refill: boolean;
  has_cancel: boolean;
  raw_data: unknown;
  last_synced_at: string;
}

export type ApiKey = {
  id: string;
  user_id: string;
  key: string;
  label: string | null;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export type Service = {
  id: string;
  code: number;
  provider: string;
  provider_service_id: string;
  custom_name: string | null;
  custom_description: string | null;
  category: string | null;
  platform: string | null;
  provider_cost: number;
  sale_price: number;
  min_sale_price: number;
  pricing_mode: PricingMode;
  markup_percentage: number;
  multiplier: number;
  minimum_margin_percentage: number;
  min_quantity: number;
  max_quantity: number;
  active: boolean;
  featured: boolean;
  has_refill: boolean;
  has_cancel: boolean;
  pricing_warning: boolean;
  created_at: string;
  updated_at: string;
}

export type Order = {
  id: string;
  public_order_id: string;
  user_id: string;
  service_id: string | null;
  provider: string;
  provider_order_id: string | null;
  link: string;
  quantity: number;
  customer_price: number;
  provider_cost: number;
  profit: number;
  status: OrderStatus;
  provider_status: string | null;
  start_count: number | null;
  remains: number | null;
  has_refill: boolean;
  has_cancel: boolean;
  service_name: string | null;
  source: "web" | "api" | "bonus";
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type OrderRefill = {
  id: string;
  order_id: string;
  provider_refill_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export type Payment = {
  id: string;
  user_id: string;
  provider: string;
  external_payment_id: string | null;
  amount: number;
  status: PaymentStatus;
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string | null;
  created_at: string;
  approved_at: string | null;
}

export type ProviderLog = {
  id: string;
  provider: string;
  action: string | null;
  request_data: unknown;
  response_data: unknown;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export type AppSetting = {
  key: string;
  value: unknown;
  updated_at: string;
}

export type BonusGrant = {
  id: string;
  user_id: string;
  followers: number;
  service_id: string | null;
  payment_id: string | null;
  status: "pending" | "delivered" | "failed";
  link: string | null;
  order_id: string | null;
  created_at: string;
  delivered_at: string | null;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      wallets: Table<Wallet>;
      wallet_transactions: Table<WalletTransaction>;
      provider_services: Table<ProviderService>;
      services: Table<Service>;
      orders: Table<Order>;
      order_refills: Table<OrderRefill>;
      payments: Table<Payment>;
      provider_logs: Table<ProviderLog>;
      app_settings: Table<AppSetting>;
      api_keys: Table<ApiKey>;
      bonus_grants: Table<BonusGrant>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      create_order_and_debit: { Args: Record<string, unknown>; Returns: Order };
      refund_order: { Args: Record<string, unknown>; Returns: Order };
      credit_balance: { Args: Record<string, unknown>; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
