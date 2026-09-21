import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../biblioteca/AuthContext";
import { getAuthReturnTo } from "../biblioteca/authReturnTo";

import logoPatioSulBrasil from "../assets/logo-patio-sul-brasil.png";

// =======================================================
// LOGIN
// =======================================================

export default function Login() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [mostrarSenha, setMostrarSenha] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const { login } = useAuth();

  const navigate = useNavigate();

  // =====================================================
  // FAZER LOGIN
  // =====================================================

  async function submit(event) {
    event.preventDefault();

    setError("");

    // ===================================================
    // VALIDAÇÕES
    // ===================================================

    if (!email.trim()) {
      setError(
        "Informe seu e-mail."
      );

      return;
    }

    if (!password) {
      setError(
        "Informe sua senha."
      );

      return;
    }

    try {
      setLoading(true);

      // =================================================
      // LOGIN
      // =================================================

      await login({
        email: email
          .trim()
          .toLowerCase(),

        password,
      });

      // =================================================
      // LOGIN APROVADO
      // =================================================

      navigate(
        getAuthReturnTo(),
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error(
        "Erro ao entrar:",
        err
      );

      const mensagem =
        err?.message || "";

      if (
        mensagem
          .toLowerCase()
          .includes("pendente")
      ) {
        setError(
          "Seu cadastro ainda está aguardando aprovação do administrador."
        );

        return;
      }

      if (
        mensagem
          .toLowerCase()
          .includes("bloqueado")
      ) {
        setError(
          "Seu acesso está bloqueado. Entre em contato com o administrador."
        );

        return;
      }

      if (
        mensagem
          .toLowerCase()
          .includes(
            "invalid login credentials"
          )
      ) {
        setError(
          "E-mail ou senha incorretos."
        );

        return;
      }

      setError(
        mensagem ||
          "Não foi possível entrar no sistema."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#211E1F]">

      {/* =================================================
          DECORAÇÃO DO FUNDO
      ================================================== */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#FFC400]/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#FFC400]/10 blur-3xl" />

      {/* LINHA AMARELA SUPERIOR */}

      <div className="absolute left-0 top-0 h-1.5 w-full bg-[#FFC400]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">

        {/* =================================================
            LADO ESQUERDO
        ================================================== */}

        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/10 bg-[#191718] p-12 lg:flex xl:p-16">

          {/* EFEITO */}

          <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#FFC400]/10 blur-3xl" />

          {/* LOGO */}

          <div className="relative z-10">

            <Link
              to="/"
              className="inline-flex"
            >
              <div className="rounded-2xl bg-white p-5 shadow-2xl">
                <img
                  src={
                    logoPatioSulBrasil
                  }
                  alt="Pátio Sul Brasil"
                  className="h-auto w-full max-w-[390px] object-contain"
                />
              </div>
            </Link>

          </div>

          {/* TEXTO CENTRAL */}

          <div className="relative z-10 max-w-xl">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFC400]/30 bg-[#FFC400]/10 px-4 py-2">

              <span className="h-2 w-2 rounded-full bg-[#FFC400]" />

              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#FFC400]">
                Sistema de Gestão
              </span>

            </div>

            <h1 className="text-5xl font-black leading-tight text-white xl:text-6xl">
              Gestão completa
              para sua{" "}
              <span className="text-[#FFC400]">
                operação.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-400">
              Controle veículos, pátios,
              liberações, leilões,
              documentos, financeiro e
              relatórios em uma única
              plataforma.
            </p>

            {/* BENEFÍCIOS */}

            <div className="mt-10 grid gap-4 sm:grid-cols-2">

              <Beneficio
                icone="🚗"
                titulo="Veículos"
                texto="Controle operacional"
              />

              <Beneficio
                icone="🏢"
                titulo="Pátios"
                texto="Gestão por unidade"
              />

              <Beneficio
                icone="📁"
                titulo="Documentos"
                texto="Arquivos centralizados"
              />

              <Beneficio
                icone="▤"
                titulo="Relatórios"
                texto="Informações estratégicas"
              />

            </div>

          </div>

          {/* RODAPÉ */}

          <div className="relative z-10">

            <p className="text-xs font-semibold text-zinc-600">
              ©{" "}
              {new Date().getFullYear()}{" "}
              Pátio Sul Brasil
            </p>

          </div>

        </section>

        {/* =================================================
            LADO DIREITO
        ================================================== */}

        <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:px-12">

          <div className="w-full max-w-md">

            {/* =============================================
                LOGO MOBILE
            ============================================== */}

            <div className="mb-8 flex justify-center lg:hidden">

              <Link
                to="/"
                className="rounded-2xl bg-white p-4 shadow-2xl"
              >
                <img
                  src={
                    logoPatioSulBrasil
                  }
                  alt="Pátio Sul Brasil"
                  className="h-auto w-full max-w-[280px] object-contain"
                />
              </Link>

            </div>

            {/* =============================================
                CARD LOGIN
            ============================================== */}

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl">

              {/* FAIXA */}

              <div className="h-2 bg-[#FFC400]" />

              <div className="p-6 sm:p-8">

                {/* CABEÇALHO */}

                <div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFC400] text-xl font-black text-[#211E1F] shadow-sm">
                    →
                  </div>

                  <h2 className="mt-5 text-3xl font-black text-[#211E1F]">
                    Bem-vindo
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Entre com sua conta para
                    acessar o sistema Pátio Sul
                    Brasil.
                  </p>

                </div>

                {/* =========================================
                    FORMULÁRIO
                ========================================== */}

                <form
                  onSubmit={submit}
                  className="mt-8 space-y-5"
                >

                  {/* =======================================
                      ERRO
                  ======================================== */}

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                      <div className="flex gap-3">

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 font-black text-red-600">
                          !
                        </div>

                        <div>

                          <p className="font-bold text-red-700">
                            Não foi possível entrar
                          </p>

                          <p className="mt-1 text-sm leading-5 text-red-600">
                            {error}
                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* =======================================
                      EMAIL
                  ======================================== */}

                  <label className="block">

                    <span className="mb-2 block text-sm font-black text-[#211E1F]">
                      E-mail
                    </span>

                    <div className="relative">

                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">

                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="5"
                            width="18"
                            height="14"
                            rx="2"
                          />

                          <path d="m3 7 9 6 9-6" />
                        </svg>

                      </div>

                      <input
                        value={email}
                        onChange={(event) => {
                          setEmail(
                            event.target.value
                          );

                          if (error) {
                            setError("");
                          }
                        }}
                        type="email"
                        autoComplete="email"
                        placeholder="seuemail@exemplo.com"
                        disabled={loading}
                        className="
                          w-full
                          rounded-xl
                          border
                          border-zinc-300
                          bg-white
                          py-3.5
                          pl-12
                          pr-4
                          text-[#211E1F]
                          outline-none
                          transition
                          placeholder:text-zinc-400
                          focus:border-[#FFC400]
                          focus:ring-4
                          focus:ring-[#FFC400]/15
                          disabled:cursor-not-allowed
                          disabled:bg-zinc-100
                          disabled:opacity-70
                        "
                      />

                    </div>

                  </label>

                  {/* =======================================
                      SENHA
                  ======================================== */}

                  <label className="block">

                    <span className="mb-2 block text-sm font-black text-[#211E1F]">
                      Senha
                    </span>

                    <div className="relative">

                      {/* CADEADO */}

                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">

                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="10"
                            rx="2"
                          />

                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>

                      </div>

                      <input
                        value={password}
                        onChange={(event) => {
                          setPassword(
                            event.target.value
                          );

                          if (error) {
                            setError("");
                          }
                        }}
                        type={
                          mostrarSenha
                            ? "text"
                            : "password"
                        }
                        autoComplete="current-password"
                        placeholder="Digite sua senha"
                        disabled={loading}
                        className="
                          w-full
                          rounded-xl
                          border
                          border-zinc-300
                          bg-white
                          py-3.5
                          pl-12
                          pr-24
                          text-[#211E1F]
                          outline-none
                          transition
                          placeholder:text-zinc-400
                          focus:border-[#FFC400]
                          focus:ring-4
                          focus:ring-[#FFC400]/15
                          disabled:cursor-not-allowed
                          disabled:bg-zinc-100
                          disabled:opacity-70
                        "
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMostrarSenha(
                            (anterior) =>
                              !anterior
                          )
                        }
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-zinc-500 transition hover:bg-[#FFC400]/15 hover:text-[#211E1F]"
                      >
                        {mostrarSenha
                          ? "Ocultar"
                          : "Mostrar"}
                      </button>

                    </div>

                  </label>

                  {/* =======================================
                      ESQUECI SENHA
                  ======================================== */}

                  <div className="flex justify-end">

                    <Link
                      to="/forgot-password"
                      className="text-sm font-bold text-[#9C7800] transition hover:text-[#211E1F]"
                    >
                      Esqueci minha senha
                    </Link>

                  </div>

                  {/* =======================================
                      BOTÃO LOGIN
                  ======================================== */}

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

                        Verificando acesso...
                      </>
                    ) : (
                      <>
                        Entrar no sistema

                        <span>
                          →
                        </span>
                      </>
                    )}

                  </button>

                  {/* =======================================
                      DIVISOR
                  ======================================== */}

                  <div className="flex items-center gap-3 py-1">

                    <div className="h-px flex-1 bg-zinc-200" />

                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                      Novo usuário
                    </span>

                    <div className="h-px flex-1 bg-zinc-200" />

                  </div>

                  {/* =======================================
                      CRIAR CONTA
                  ======================================== */}

                  <Link
                    to="/register"
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
                    Criar uma conta
                  </Link>

                  {/* =======================================
                      PRIMEIRO ACESSO
                  ======================================== */}

                  <div className="rounded-xl border border-[#FFC400]/30 bg-[#FFC400]/10 p-4">

                    <div className="flex gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFC400] font-black text-[#211E1F]">
                        i
                      </div>

                      <div>

                        <p className="text-sm font-black text-[#211E1F]">
                          Primeiro acesso?
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          Após criar sua conta,
                          ela precisará ser aprovada
                          por um administrador antes
                          que você possa acessar o
                          sistema.
                        </p>

                      </div>

                    </div>

                  </div>

                </form>

              </div>

            </div>

            {/* =============================================
                VOLTAR
            ============================================== */}

            <div className="mt-6 text-center">

              <Link
                to="/"
                className="text-sm font-bold text-zinc-400 transition hover:text-[#FFC400]"
              >
                ← Voltar para a página inicial
              </Link>

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}

// =======================================================
// BENEFÍCIO
// =======================================================

function Beneficio({
  icone,
  titulo,
  texto,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFC400] text-lg text-[#211E1F]">
          {icone}
        </div>

        <div>

          <p className="text-sm font-black text-white">
            {titulo}
          </p>

          <p className="mt-0.5 text-xs text-zinc-500">
            {texto}
          </p>

        </div>

      </div>

    </div>
  );
}
