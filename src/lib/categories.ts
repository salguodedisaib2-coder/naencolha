export type ServiceCategory =
  | "gerais"
  | "especiais"
  | "aparencia_etnia"
  | "aparencia_cabelo"
  | "aparencia_estatura"
  | "aparencia_corpo"
  | "aparencia_seios"
  | "aparencia_pubis"
  | "atendimento"
  | "contato"
  | "lugar";

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  gerais: "Serviços Gerais",
  especiais: "Serviços Especiais",
  aparencia_etnia: "Aparência — Etnia",
  aparencia_cabelo: "Aparência — Cabelo",
  aparencia_estatura: "Aparência — Estatura",
  aparencia_corpo: "Aparência — Corpo",
  aparencia_seios: "Aparência — Seios",
  aparencia_pubis: "Aparência — Púbis",
  atendimento: "Atendimento a",
  contato: "Contato",
  lugar: "Lugar",
};

export const CATEGORY_ORDER: ServiceCategory[] = [
  "gerais",
  "especiais",
  "aparencia_etnia",
  "aparencia_cabelo",
  "aparencia_estatura",
  "aparencia_corpo",
  "aparencia_seios",
  "aparencia_pubis",
  "atendimento",
  "contato",
  "lugar",
];

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function whatsappUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}
