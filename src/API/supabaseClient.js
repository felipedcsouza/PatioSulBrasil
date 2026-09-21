import { createClient } from "@supabase/supabase-js";

// URL do projeto Supabase.
// Em produção, tenta usar a variável da Vercel.
// Se ela não existir, usa a URL do seu projeto como fallback.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://mqxdhhscinqmjnynmazp.supabase.co";

// Aceita tanto a chave publishable quanto a anon key,
// caso você esteja usando uma nomenclatura diferente na Vercel.
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error(
    "Chave pública do Supabase não configurada. Adicione VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);