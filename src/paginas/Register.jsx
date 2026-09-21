import { useState } from "react";
import { Link } from "react-router-dom";

import AuthLayout from "../componentes/AuthLayout";
import { supabase } from "../API/supabaseClient";

export default function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarSenha, setConfirmarSenha] =
    useState("");

  const [mostrarSenha, setMostrarSenha] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  // =====================================================
  // VALIDAR E-MAIL
  // =====================================================

  function emailValido(emailInformado) {
    const regex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(
      emailInformado
    );
  }

  // =====================================================
  // CADASTRAR USUÁRIO
  // =====================================================

  async function cadastrar(event) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    // Remove espaços e deixa o e-mail minúsculo
    const nomeLimpo =
      nome.trim();

    const emailLimpo =
      email
        .trim()
        .toLowerCase();

    // ===================================================
    // VALIDAÇÕES
    // ===================================================

    if (!nomeLimpo) {
      setErro(
        "Informe o nome do usuário."
      );

      return;
    }

    if (!emailLimpo) {
      setErro(
        "Informe o e-mail."
      );

      return;
    }

    if (!emailValido(emailLimpo)) {
      setErro(
        "Informe um endereço de e-mail válido."
      );

      return;
    }

    if (!password) {
      setErro(
        "Informe uma senha."
      );

      return;
    }

    if (password.length < 6) {
      setErro(
        "A senha deve possuir pelo menos 6 caracteres."
      );

      return;
    }

    if (
      password !==
      confirmarSenha
    ) {
      setErro(
        "As senhas informadas não são iguais."
      );

      return;
    }

    try {
      setLoading(true);

      // =================================================
      // CRIAR USUÁRIO NO SUPABASE
      // =================================================

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: emailLimpo,

          password,

          options: {
            data: {
              nome: nomeLimpo,
            },
          },
        });

      // =================================================
      // ERRO DO SUPABASE
      // =================================================

      if (error) {
        console.error(
          "Erro Supabase no cadastro:",
          {
            message: error.message,
            status: error.status,
            code: error.code,
          }
        );

        throw error;
      }

      if (!data?.user) {
        throw new Error(
          "Não foi possível criar o usuário."
        );
      }

      // Alguns casos de e-mail já cadastrado
      // podem retornar um usuário sem identities.
      if (
        Array.isArray(
          data.user.identities
        ) &&
        data.user.identities.length ===
          0
      ) {
        throw new Error(
          "Este e-mail já possui uma conta cadastrada."
        );
      }

      // =================================================
      // IMPORTANTE:
      // NÃO DEIXAR NOVO USUÁRIO LOGADO
      // =================================================

      /*
        Se a confirmação de e-mail estiver desativada,
        o Supabase pode criar uma sessão automaticamente.

        Como o funcionário ainda precisa ser aprovado
        pelo MASTER, encerramos essa sessão.
      */

      if (data.session) {
        await supabase.auth.signOut();
      }

      // =================================================
      // SUCESSO
      // =================================================
      const precisaConfirmarEmail = !data.session;

      setMensagem(
        precisaConfirmarEmail
          ? "Conta criada com sucesso! Confirme seu e-mail e depois aguarde a aprovação do administrador."
          : "Conta criada com sucesso! O cadastro está aguardando aprovação do administrador."
      );

      setNome("");
      setEmail("");
      setPassword("");
      setConfirmarSenha("");
    } catch (error) {
      console.error(
        "Erro ao criar conta:",
        error
      );

      const mensagemOriginal =
        error?.message ||
        "Não foi possível criar sua conta.";

      const mensagemMinuscula =
        mensagemOriginal.toLowerCase();

      let mensagemErro =
        mensagemOriginal;

      // =================================================
      // TRADUÇÃO DOS ERROS
      // =================================================

      if (
        mensagemMinuscula.includes(
          "already registered"
        ) ||
        mensagemMinuscula.includes(
          "already been registered"
        ) ||
        mensagemMinuscula.includes(
          "already exists"
        )
      ) {
        mensagemErro =
          "Este e-mail já possui uma conta cadastrada.";
      }

      else if (
        mensagemMinuscula.includes(
          "email address"
        ) &&
        mensagemMinuscula.includes(
          "invalid"
        )
      ) {
        mensagemErro =
          "O Supabase recusou esse endereço de e-mail. Verifique se o e-mail foi digitado corretamente.";
      }

      else if (
        mensagemMinuscula.includes(
          "email_address_invalid"
        )
      ) {
        mensagemErro =
          "O endereço de e-mail informado foi considerado inválido.";
      }

      else if (
        mensagemMinuscula.includes(
          "not authorized"
        )
      ) {
        mensagemErro =
          "Este endereço de e-mail não está autorizado pelo serviço de autenticação.";
      }

      else if (
        mensagemMinuscula.includes(
          "rate limit"
        ) ||
        mensagemMinuscula.includes(
          "too many requests"
        )
      ) {
        mensagemErro =
          "Muitos cadastros foram realizados em pouco tempo. Aguarde alguns minutos e tente novamente.";
      }

      else if (
        mensagemMinuscula.includes(
          "password"
        )
      ) {
        mensagemErro =
          "A senha informada não atende aos requisitos de segurança.";
      }

      else if (
        mensagemMinuscula.includes(
          "network"
        ) ||
        mensagemMinuscula.includes(
          "fetch"
        )
      ) {
        mensagemErro =
          "Não foi possível conectar ao servidor. Verifique sua internet.";
      }

      setErro(
        mensagemErro
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Cadastre um novo usuário para solicitar acesso ao sistema."
    >
      <form
        onSubmit={cadastrar}
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
            SUCESSO
        ================================================ */}

        {mensagem && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {mensagem}
          </div>
        )}

        {/* ===============================================
            NOME
        ================================================ */}

        <div>
          <label className="mb-2 block text-sm font-black text-[#211E1F]">
            Nome completo
          </label>

          <input
            type="text"
            value={nome}
            onChange={(event) =>
              setNome(
                event.target.value
              )
            }
            placeholder="Ex.: Maria Silva"
            disabled={loading}
            autoComplete="name"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-[#211E1F] outline-none transition placeholder:text-zinc-400 focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20 disabled:bg-zinc-100"
          />
        </div>

        {/* ===============================================
            E-MAIL
        ================================================ */}

        <div>
          <label className="mb-2 block text-sm font-black text-[#211E1F]">
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
            placeholder="exemplo@gmail.com"
            disabled={loading}
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-[#211E1F] outline-none transition placeholder:text-zinc-400 focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20 disabled:bg-zinc-100"
          />

          <p className="mt-1 text-xs text-zinc-500">
            Digite um endereço de e-mail válido.
          </p>
        </div>

        {/* ===============================================
            SENHA
        ================================================ */}

        <div>
          <label className="mb-2 block text-sm font-black text-[#211E1F]">
            Senha
          </label>

          <div className="relative">

            <input
              type={
                mostrarSenha
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
              autoComplete="new-password"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 pr-20 text-[#211E1F] outline-none transition placeholder:text-zinc-400 focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20 disabled:bg-zinc-100"
            />

            <button
              type="button"
              onClick={() =>
                setMostrarSenha(
                  !mostrarSenha
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#9A7600] transition hover:text-[#211E1F]"
            >
              {mostrarSenha
                ? "Ocultar"
                : "Mostrar"}
            </button>

          </div>
        </div>

        {/* ===============================================
            CONFIRMAR SENHA
        ================================================ */}

        <div>
          <label className="mb-2 block text-sm font-black text-[#211E1F]">
            Confirmar senha
          </label>

          <input
            type={
              mostrarSenha
                ? "text"
                : "password"
            }
            value={confirmarSenha}
            onChange={(event) =>
              setConfirmarSenha(
                event.target.value
              )
            }
            placeholder="Digite a senha novamente"
            disabled={loading}
            autoComplete="new-password"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-[#211E1F] outline-none transition placeholder:text-zinc-400 focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20 disabled:bg-zinc-100"
          />
        </div>

        {/* ===============================================
            INFORMAÇÃO
        ================================================ */}

        <div className="rounded-xl border border-[#FFC400]/40 bg-[#FFC400]/10 p-4">

          <p className="text-sm font-black text-[#211E1F]">
            Aprovação necessária
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Após criar a conta, um administrador deverá definir seu cargo, pátio e permissões antes que você possa acessar o sistema.
          </p>

        </div>

        {/* ===============================================
            CADASTRAR
        ================================================ */}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC400] px-4 py-3.5 font-black text-[#211E1F] shadow-lg shadow-[#FFC400]/20 transition hover:-translate-y-0.5 hover:bg-[#FFD43B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#211E1F]/30 border-t-[#211E1F]" />
              Criando conta...
            </>
          ) : (
            <>
              Criar conta
              <span>→</span>
            </>
          )}
        </button>

        {/* ===============================================
            LOGIN
        ================================================ */}

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Já possui conta?
          </span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <Link
          className="flex w-full items-center justify-center rounded-xl border border-[#211E1F] bg-white px-4 py-3.5 font-black text-[#211E1F] transition hover:bg-[#211E1F] hover:text-[#FFC400]"
          to="/login"
        >
          ← Voltar para o login
        </Link>

      </form>
    </AuthLayout>
  );
}