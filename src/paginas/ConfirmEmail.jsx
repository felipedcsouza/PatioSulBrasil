import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import AuthLayout from "../componentes/AuthLayout";
import { supabase } from "../API/supabaseClient";

export default function ConfirmEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const emailRecebido =
    location.state?.email ||
    sessionStorage.getItem(
      "emailConfirmacao"
    ) ||
    "";

  const [email, setEmail] =
    useState(emailRecebido);

  const [codigo, setCodigo] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [reenviando, setReenviando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [confirmado, setConfirmado] =
    useState(false);

  // =====================================================
  // SALVAR E-MAIL TEMPORARIAMENTE
  // =====================================================

  useEffect(() => {
    if (email) {
      sessionStorage.setItem(
        "emailConfirmacao",
        email
          .trim()
          .toLowerCase()
      );
    }
  }, [email]);

  // =====================================================
  // TRATAR CÓDIGO
  // =====================================================

  function alterarCodigo(event) {
    const somenteNumeros =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    setCodigo(somenteNumeros);
  }

  // =====================================================
  // CONFIRMAR CÓDIGO
  // =====================================================

  async function confirmarCodigo(
    event
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    const emailLimpo =
      email
        .trim()
        .toLowerCase();

    if (!emailLimpo) {
      setErro(
        "Informe o e-mail utilizado no cadastro."
      );

      return;
    }

    if (!codigo) {
      setErro(
        "Digite o código recebido no e-mail."
      );

      return;
    }

    if (codigo.length !== 6) {
      setErro(
        "O código deve possuir 6 números."
      );

      return;
    }

    try {
      setLoading(true);

      // ===============================================
      // VALIDAR OTP NO SUPABASE
      // ===============================================

      const {
        data,
        error,
      } =
        await supabase.auth.verifyOtp({
          email: emailLimpo,
          token: codigo,
          type: "email",
        });

      if (error) {
        console.error(
          "Erro ao confirmar código:",
          {
            message:
              error.message,
            status:
              error.status,
            code:
              error.code,
          }
        );

        throw error;
      }

      // ===============================================
      // CÓDIGO CONFIRMADO
      // ===============================================

      setConfirmado(true);

      setMensagem(
        "E-mail confirmado com sucesso!"
      );

      sessionStorage.removeItem(
        "emailConfirmacao"
      );

      /*
        O verifyOtp pode criar uma sessão.

        Por enquanto encerramos essa sessão,
        porque no próximo passo vamos configurar
        corretamente o modo VISITANTE.
      */

      if (data?.session) {
        await supabase.auth.signOut();
      }

    } catch (error) {
      const mensagemOriginal =
        error?.message ||
        "Não foi possível confirmar o código.";

      const texto =
        mensagemOriginal
          .toLowerCase();

      let mensagemErro =
        mensagemOriginal;

      if (
        texto.includes(
          "expired"
        )
      ) {
        mensagemErro =
          "Esse código expirou. Solicite um novo código.";
      }

      else if (
        texto.includes(
          "invalid"
        )
      ) {
        mensagemErro =
          "Código inválido. Confira os números recebidos no e-mail.";
      }

      else if (
        texto.includes(
          "token"
        )
      ) {
        mensagemErro =
          "O código informado é inválido ou expirou.";
      }

      setErro(
        mensagemErro
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // REENVIAR CÓDIGO
  // =====================================================

  async function reenviarCodigo() {
    setErro("");
    setMensagem("");

    const emailLimpo =
      email
        .trim()
        .toLowerCase();

    if (!emailLimpo) {
      setErro(
        "Informe seu e-mail antes de reenviar o código."
      );

      return;
    }

    try {
      setReenviando(true);

      const { error } =
        await supabase.auth.resend({
          type: "signup",
          email: emailLimpo,
        });

      if (error) {
        console.error(
          "Erro ao reenviar código:",
          error
        );

        throw error;
      }

      setMensagem(
        "Um novo código foi enviado para seu e-mail."
      );

      setCodigo("");

    } catch (error) {
      const texto =
        error?.message
          ?.toLowerCase() ||
        "";

      if (
        texto.includes(
          "rate limit"
        )
      ) {
        setErro(
          "Você solicitou muitos códigos. Aguarde alguns minutos antes de tentar novamente."
        );
      } else {
        setErro(
          error?.message ||
            "Não foi possível reenviar o código."
        );
      }
    } finally {
      setReenviando(false);
    }
  }

  // =====================================================
  // E-MAIL CONFIRMADO
  // =====================================================

  if (confirmado) {
    return (
      <AuthLayout
        title="E-mail confirmado"
        subtitle="Seu endereço de e-mail foi verificado com sucesso."
      >

        <div className="space-y-5">

          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">

            <div className="text-5xl">
              ✓
            </div>

            <h2 className="mt-4 text-xl font-black text-green-800">
              Verificação concluída
            </h2>

            <p className="mt-2 text-sm leading-6 text-green-700">
              Seu e-mail foi confirmado com sucesso.
            </p>

          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

            <p className="font-bold text-amber-800">
              Próxima etapa
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-700">
              Sua identidade por e-mail já foi confirmada.
              Agora o administrador poderá definir seu
              cargo e suas permissões dentro do sistema.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/login",
                {
                  replace: true,
                }
              )
            }
            className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            Ir para o login
          </button>

        </div>

      </AuthLayout>
    );
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <AuthLayout
      title="Confirmar e-mail"
      subtitle="Digite o código de 6 números enviado para seu e-mail."
    >

      <form
        onSubmit={
          confirmarCodigo
        }
        className="space-y-5"
      >

        {/* ===============================================
            ERRO
        ================================================ */}

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        {/* ===============================================
            MENSAGEM
        ================================================ */}

        {mensagem && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {mensagem}
          </div>
        )}

        {/* ===============================================
            INFORMAÇÃO
        ================================================ */}

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

          <p className="text-sm font-bold text-blue-800">
            Verifique seu e-mail
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            Enviamos um código de confirmação.
            Verifique também sua pasta de spam ou lixo eletrônico.
          </p>

        </div>

        {/* ===============================================
            E-MAIL
        ================================================ */}

        <div>

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            E-mail
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            disabled={loading}
            placeholder="exemplo@gmail.com"
            autoComplete="email"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />

        </div>

        {/* ===============================================
            CÓDIGO
        ================================================ */}

        <div>

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Código de confirmação
          </label>

          <input
            type="text"
            value={codigo}
            onChange={
              alterarCodigo
            }
            disabled={loading}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="w-full rounded-xl border border-slate-300 px-4 py-4 text-center text-3xl font-black tracking-[0.5em] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <p className="mt-2 text-center text-xs text-slate-400">
            Digite os 6 números recebidos no e-mail.
          </p>

        </div>

        {/* ===============================================
            CONFIRMAR
        ================================================ */}

        <button
          type="submit"
          disabled={
            loading ||
            codigo.length !== 6
          }
          className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Confirmando..."
            : "Confirmar e-mail"}
        </button>

        {/* ===============================================
            REENVIAR
        ================================================ */}

        <button
          type="button"
          onClick={
            reenviarCodigo
          }
          disabled={
            reenviando ||
            loading
          }
          className="w-full rounded-xl border border-slate-300 bg-white py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reenviando
            ? "Reenviando..."
            : "Reenviar código"}
        </button>

        {/* ===============================================
            VOLTAR
        ================================================ */}

        <Link
          to="/register"
          className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Voltar ao cadastro
        </Link>

      </form>

    </AuthLayout>
  );
}