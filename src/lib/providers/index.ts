import "server-only";
import { baratoSociais } from "./barato-sociais";
import type { Provider } from "./types";

/** Registro de fornecedores. Adicionar novos aqui — sem reescrever o sistema. */
const registry: Record<string, Provider> = {
  [baratoSociais.id]: baratoSociais,
};

export const DEFAULT_PROVIDER = baratoSociais.id;

export function getProvider(id: string = DEFAULT_PROVIDER): Provider {
  const provider = registry[id];
  if (!provider) {
    throw new Error(`Fornecedor desconhecido: ${id}`);
  }
  return provider;
}

export function listProviders(): Provider[] {
  return Object.values(registry);
}

export type { Provider } from "./types";
export { ProviderError } from "./types";
