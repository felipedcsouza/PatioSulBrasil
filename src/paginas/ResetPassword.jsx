import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import AuthLayout from "../componentes/AuthLayout";
import { supabase } from "../API/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [senha, setSenha] =
    useState("");

  const [
    confirmarSenha,
    setConfirmarSenha,
  ] = useState("");

  const [
    mostrarSenha,
    setMostrarSenha,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    verificando,
    setVerificando,
  ] = useState(true);

  const [erro, setErro] =
    useState("");

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    sessaoValida,
    setSessaoValida,
  ] = useState(false);

  // =====================================================
  // VERIFICAR LINK DE RECUPERAÇÃO
  // =====================================================

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        setVerificando(true);
        setErro("");

        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!ativo) {
          return;
        }

        if (data?.session?.user) {
          setSessaoValida(true);
        }
      } catch (error) {
        console.error(
          "Erro ao verificar recuperação:",
          error
        );
      } finally {
        if (ativo) {
          setVerificando(false);
        }
      }
    }

    verificarSessao();

    // ===================================================
    // OBSERVAR EVENTO DE RECUPERAÇÃO
    // ===================================================

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!ativo) {
            return;
          }

          if (
            event ===
              "PASSWORD_RECOVERY" ||
            session?.user
          ) {
            setSessaoValida(true);
            setVerificando(false);
          }
        }
      );

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // SALVAR NOVA SENHA
  // =====================================================

  async function salvarSenha(
    event
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    // ===================================================
    // VALIDAÇÕES
    // ===================================================

    if (!senha) {
      setErro(
        "Informe a nova senha."
      );

      return;
    }

    if (senha.length < 6) {
      setErro(
        "A senha deve possuir pelo menos 6 caracteres."
      );

      return;
    }

    if (!confirmarSenha) {
      setErro(
        "Confirme a nova senha."
      );

      return;
    }

    if (
      senha !== confirmarSenha
    ) {
      setErro(
        "As senhas informadas não são iguais."
      );

      return;
    }

    if (!sessaoValida) {
      setErro(
        "O link de recuperação é inválido ou expirou. Solicite um novo link."
      );

      return;
    }

    try {
      setLoading(true);

      // =================================================
      // ATUALIZAR SENHA NO SUPABASE
      // =================================================

      const {
        data,
        error,
      } =
        await supabase.auth.updateUser({
          password: senha,
        });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error(
          "Não foi possível atualizar a senha."
        );
      }

      setMensagem(
        "Senha alterada com sucesso! Você já pode entrar usando sua nova senha."
      );

      setSenha("");
      setConfirmarSenha("");

      // =================================================
      // ENCERRAR SESSÃO DE RECUPERAÇÃO
      // =================================================

      await supabase.auth.signOut();

      // =================================================
      // IR PARA LOGIN APÓS 2 SEGUNDOS
      // =================================================

      setTimeout(() => {
        navigate(
          "/login",
          {
            replace: true,
          }
        );
      }, 2000);
    } catch (error) {
      console.error(
        "Erro ao atualizar senha:",
        error
      );

      const mensagemOriginal =
        error?.message || "";

      const mensagemMinuscula =
        mensagemOriginal.toLowerCase();

      if (
        mensagemMinuscula.includes(
          "same password"
        )
      ) {
        setErro(
          "A nova senha deve ser diferente da senha atual."
        );

        return;
      }

      if (
        mensagemMinuscula.includes(
          "password"
        ) &&
        mensagemMinuscula.includes(
          "characters"
        )
      ) {
        setErro(
          "A nova senha não atende aos requisitos de segurança."
        );

        return;
      }

      if (
        mensagemMinuscula.includes(
          "session"
        ) ||
        mensagemMinuscula.includes(
          "jwt"
        )
      ) {
        setErro(
          "O link de recuperação expirou. Solicite um novo link."
        );

        setSessaoValida(false);

        return;
      }

      setErro(
        mensagemOriginal ||
          "Não foi possível alterar a senha."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CARREGANDO LINK
  // =====================================================

  if (verificando) {
    return (
      <AuthLayout
        title="Nova senha"
        subtitle="Verificando seu link de recuperação."
      >
        <div className="py-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-[#FFC400]" />

          <p className="mt-4 text-sm font-semibold text-zinc-500">
            Verificando recuperação...
          </p>
        </div>
      </AuthLayout>
    );
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <AuthLayout
      title="Nova senha"
      subtitle="Defina uma nova senha para sua conta."
    >
      <form
        onSubmit={salvarSenha}
        className="space-y-5"
      >
        {/* ===============================================
            ERRO
        ================================================ */}

        {erro && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="font-black text-red-700">
              Não foi possível alterar
              a senha
            </p>

            <p className="mt-1 text-sm text-red-600">
              {erro}
            </p>
          </div>
        )}

        {/* ===============================================
            SUCESSO
        ================================================ */}

        {mensagem && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4">
            <p className="font-black text-green-700">
              ✓ Senha atualizada
            </p>

            <p className="mt-1 text-sm text-green-600">
              {mensagem}
            </p>
          </div>
        )}

        {/* ===============================================
            LINK INVÁLIDO
        ================================================ */}

        {!sessaoValida &&
          !mensagem && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="font-black text-amber-800">
                Link de recuperação
                inválido
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                Este link pode ter
                expirado ou já ter sido
                utilizado. Solicite uma
                nova recuperação de
                senha.
              </p>

              <Link
                to="/forgot-password"
                className="
                  mt-4
                  inline-flex
                  rounded-lg
                  bg-[#FFC400]
                  px-4
                  py-2
                  text-sm
                  font-black
                  text-[#211E1F]
                  transition
                  hover:bg-[#FFD43B]
                "
              >
                Solicitar novo link
              </Link>
            </div>
          )}

        {/* ===============================================
            FORMULÁRIO
        ================================================ */}

        {sessaoValida &&
          !mensagem && (
            <>
              {/* NOVA SENHA */}

              <div>
                <label className="mb-2 block text-sm font-black text-[#211E1F]">
                  Nova senha
                </label>

                <div className="relative">
                  <input
                    type={
                      mostrarSenha
                        ? "text"
                        : "password"
                    }
                    value={senha}
                    onChange={(
                      event
                    ) => {
                      setSenha(
                        event.target
                          .value
                      );

                      if (erro) {
                        setErro("");
                      }
                    }}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    disabled={loading}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-zinc-300
                      bg-white
                      px-4
                      py-3.5
                      pr-20
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

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarSenha(
                        !mostrarSenha
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#9A7600] hover:text-[#211E1F]"
                  >
                    {mostrarSenha
                      ? "Ocultar"
                      : "Mostrar"}
                  </button>
                </div>
              </div>

              {/* CONFIRMAR SENHA */}

              <div>
                <label className="mb-2 block text-sm font-black text-[#211E1F]">
                  Confirmar nova senha
                </label>

                <input
                  type={
                    mostrarSenha
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmarSenha
                  }
                  onChange={(
                    event
                  ) => {
                    setConfirmarSenha(
                      event.target.value
                    );

                    if (erro) {
                      setErro("");
                    }
                  }}
                  placeholder="Digite novamente"
                  autoComplete="new-password"
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

              {/* INFORMAÇÃO */}

              <div className="rounded-xl border border-[#FFC400]/40 bg-[#FFC400]/10 p-4">
                <p className="text-sm font-black text-[#211E1F]">
                  🔒 Segurança da senha
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  Utilize pelo menos 6
                  caracteres. Depois de
                  salvar, você deverá
                  entrar novamente com a
                  nova senha.
                </p>
              </div>

              {/* SALVAR */}

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

                    Salvando...
                  </>
                ) : (
                  <>
                    Salvar nova senha
                    <span>→</span>
                  </>
                )}
              </button>
            </>
          )}

        {/* ===============================================
            VOLTAR
        ================================================ */}

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