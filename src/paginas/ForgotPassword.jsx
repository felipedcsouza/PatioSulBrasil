import { useState } from "react";
import { Link } from "react-router-dom";

import AuthLayout from "../componentes/AuthLayout";
import { supabase } from "../API/supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function enviarRecuperacao(event) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    const emailLimpo = email
      .trim()
      .toLowerCase();

    if (!emailLimpo) {
      setErro("Informe seu e-mail.");
      return;
    }

    try {
      setLoading(true);

      const redirectTo =
        `${window.location.origin}/reset-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          emailLimpo,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      setMensagem(
        "Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha. Verifique também a caixa de spam."
      );

      setEmail("");
    } catch (error) {
      console.error(
        "Erro ao recuperar senha:",
        error
      );

      const mensagemOriginal =
        error?.message || "";

      if (
        mensagemOriginal
          .toLowerCase()
          .includes("rate limit")
      ) {
        setErro(
          "Muitas solicitações foram realizadas. Aguarde alguns minutos e tente novamente."
        );

        return;
      }

      setErro(
        mensagemOriginal ||
          "Não foi possível enviar o e-mail de recuperação."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail para receber um link de redefinição."
    >
      <form
        onSubmit={enviarRecuperacao}
        className="space-y-5"
      >
        {erro && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-bold text-green-700">
            {mensagem}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-black text-[#211E1F]">
            E-mail
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value
              );

              if (erro) {
                setErro("");
              }
            }}
            placeholder="seuemail@exemplo.com"
            autoComplete="email"
            disabled={loading}
            className="
              w-full
              rounded-xl
              border
              border-zinc-300
              bg-white
              px-4
              py-3.5
              text-[#211E1F]
              outline-none
              transition
              placeholder:text-zinc-400
              focus:border-[#FFC400]
              focus:ring-2
              focus:ring-[#FFC400]/20
              disabled:bg-zinc-100
            "
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[#FFC400]
            px-4
            py-3.5
            font-black
            text-[#211E1F]
            shadow-lg
            shadow-[#FFC400]/20
            transition
            hover:-translate-y-0.5
            hover:bg-[#FFD43B]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {loading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#211E1F]/30 border-t-[#211E1F]" />
              Enviando...
            </>
          ) : (
            <>
              Enviar recuperação
              <span>→</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-zinc-200" />

          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Acesso
          </span>

          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <Link
          to="/login"
          className="
            flex
            w-full
            items-center
            justify-center
            rounded-xl
            border
            border-[#211E1F]
            bg-white
            px-4
            py-3.5
            font-black
            text-[#211E1F]
            transition
            hover:bg-[#211E1F]
            hover:text-[#FFC400]
          "
        >
          ← Voltar para o login
        </Link>
      </form>
    </AuthLayout>
  );
}