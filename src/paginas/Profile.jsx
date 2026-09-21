import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

// =======================================================
// NOMES DAS PERMISSÕES
// =======================================================

const NOMES_PERMISSOES = {
  dashboard: "Dashboard",

  vehicles:
    "Consulta de veículos",

  cadastrar_veiculo:
    "Cadastrar veículos",

  excluir_veiculo:
    "Excluir veículos",

  releases:
    "Veículos liberados",

  auction:
    "Saída para leilão",

  judicial:
    "Retirada judicial",

  other_destinations:
    "Outros destinos",

  analysis:
    "Análise de veículos",

  financial:
    "Financeiro",

  reports:
    "Relatórios",

  notifications:
    "Notificações",

  manuals:
    "Manuais",

  admin:
    "Administração",
};

// =======================================================
// FORMATADORES
// =======================================================

function formatarCargo(cargo) {
  const cargos = {
    MASTER:
      "Master",

    ADMIN:
      "Administrador",

    OPERADOR:
      "Operador",

    FINANCEIRO:
      "Financeiro",

    CONSULTA:
      "Consulta",

    SEM_CARGO:
      "Sem cargo definido",
  };

  return (
    cargos[cargo] ||
    cargo ||
    "Não informado"
  );
}

function formatarStatus(status) {
  const statusMap = {
    APROVADO:
      "Aprovado",

    PENDENTE:
      "Pendente",

    BLOQUEADO:
      "Bloqueado",
  };

  return (
    statusMap[status] ||
    status ||
    "Não informado"
  );
}

function formatarData(data) {
  if (!data) {
    return "-";
  }

  return new Date(
    data
  ).toLocaleString(
    "pt-BR"
  );
}

// =======================================================
// COMPONENTE
// =======================================================

export default function Profile() {
  const {
    user,
    perfil,
    isMaster,
  } = useAuth();

  const [
    patio,
    setPatio,
  ] = useState(null);

  const [
    loadingPatio,
    setLoadingPatio,
  ] = useState(false);

  const [
    salvandoPerfil,
    setSalvandoPerfil,
  ] = useState(false);

  const [
    alterandoSenha,
    setAlterandoSenha,
  ] = useState(false);

  const [
    nome,
    setNome,
  ] = useState("");

  const [
    telefone,
    setTelefone,
  ] = useState("");

  const [
    senhaAtual,
    setSenhaAtual,
  ] = useState("");

  const [
    novaSenha,
    setNovaSenha,
  ] = useState("");

  const [
    confirmarSenha,
    setConfirmarSenha,
  ] = useState("");

  const [
    mostrarSenhaAtual,
    setMostrarSenhaAtual,
  ] = useState(false);

  const [
    mostrarNovaSenha,
    setMostrarNovaSenha,
  ] = useState(false);

  const [
    mostrarConfirmacao,
    setMostrarConfirmacao,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  // =====================================================
  // CARREGAR DADOS INICIAIS
  // =====================================================

  useEffect(() => {
    if (!perfil) {
      return;
    }

    setNome(
      perfil.nome || ""
    );

    setTelefone(
      perfil.telefone || ""
    );

    carregarPatio();
  }, [perfil]);

  // =====================================================
  // CARREGAR PÁTIO
  // =====================================================

  async function carregarPatio() {
    if (
      !perfil?.patio_id
    ) {
      setPatio(null);

      return;
    }

    try {
      setLoadingPatio(true);

      const {
        data,
        error,
      } = await supabase
        .from("patios")
        .select(
          "id, nome, cidade, estado, endereco, telefone, ativo"
        )
        .eq(
          "id",
          perfil.patio_id
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      setPatio(
        data || null
      );
    } catch (error) {
      console.error(
        "Erro ao carregar pátio:",
        error
      );
    } finally {
      setLoadingPatio(false);
    }
  }

  // =====================================================
  // INICIAIS
  // =====================================================

  const iniciais =
    useMemo(() => {
      const nomePerfil =
        nome.trim() ||
        user?.email ||
        "U";

      const partes =
        nomePerfil
          .split(" ")
          .filter(Boolean);

      if (
        partes.length === 1
      ) {
        return partes[0]
          .slice(0, 2)
          .toUpperCase();
      }

      return (
        partes[0][0] +
        partes[
          partes.length - 1
        ][0]
      ).toUpperCase();
    }, [
      nome,
      user?.email,
    ]);

  // =====================================================
  // PERMISSÕES
  // =====================================================

  const permissoes =
    useMemo(() => {
      if (isMaster) {
        return Object.keys(
          NOMES_PERMISSOES
        );
      }

      if (
        !Array.isArray(
          perfil?.permissoes
        )
      ) {
        return [];
      }

      return perfil.permissoes;
    }, [
      perfil,
      isMaster,
    ]);

  // =====================================================
  // SALVAR PERFIL
  // =====================================================

  async function salvarPerfil(
    event
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    if (
      !nome.trim() ||
      nome.trim().length < 2
    ) {
      setErro(
        "Informe um nome válido."
      );

      return;
    }

    try {
      setSalvandoPerfil(true);

      // ===============================================
      // ATUALIZA PROFILE
      // ===============================================

      const {
        error: profileError,
      } = await supabase.rpc(
        "atualizar_meu_perfil",
        {
          p_nome:
            nome.trim(),

          p_telefone:
            telefone.trim() ||
            null,
        }
      );

      if (profileError) {
        throw profileError;
      }

      // ===============================================
      // ATUALIZA METADADOS DO AUTH
      // ===============================================

      const {
        error: authError,
      } = await supabase.auth
        .updateUser({
          data: {
            nome:
              nome.trim(),
          },
        });

      if (authError) {
        console.error(
          "Perfil salvo, mas metadata não atualizada:",
          authError
        );
      }

      setMensagem(
        "Perfil atualizado com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao atualizar perfil:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível atualizar o perfil."
      );
    } finally {
      setSalvandoPerfil(false);
    }
  }

  // =====================================================
  // VALIDAÇÕES SENHA
  // =====================================================

  const senhaTemTamanho =
    novaSenha.length >= 8;

  const senhaTemMaiuscula =
    /[A-Z]/.test(
      novaSenha
    );

  const senhaTemMinuscula =
    /[a-z]/.test(
      novaSenha
    );

  const senhaTemNumero =
    /\d/.test(
      novaSenha
    );

  const senhaValida =
    senhaTemTamanho &&
    senhaTemMaiuscula &&
    senhaTemMinuscula &&
    senhaTemNumero;

  // =====================================================
  // ALTERAR SENHA
  // =====================================================

  async function alterarSenha(
    event
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    if (
      !senhaAtual
    ) {
      setErro(
        "Informe sua senha atual."
      );

      return;
    }

    if (!senhaValida) {
      setErro(
        "A nova senha não atende aos requisitos de segurança."
      );

      return;
    }

    if (
      novaSenha !==
      confirmarSenha
    ) {
      setErro(
        "A confirmação da nova senha está diferente."
      );

      return;
    }

    if (
      senhaAtual ===
      novaSenha
    ) {
      setErro(
        "A nova senha deve ser diferente da senha atual."
      );

      return;
    }

    if (!user?.email) {
      setErro(
        "Não foi possível identificar o e-mail da conta."
      );

      return;
    }

    try {
      setAlterandoSenha(true);

      // ===============================================
      // CONFIRMAR SENHA ATUAL
      // ===============================================

      const {
        error:
          loginError,
      } = await supabase.auth
        .signInWithPassword({
          email:
            user.email,

          password:
            senhaAtual,
        });

      if (loginError) {
        setErro(
          "A senha atual está incorreta."
        );

        return;
      }

      // ===============================================
      // ALTERAR SENHA
      // ===============================================

      const {
        error:
          updateError,
      } = await supabase.auth
        .updateUser({
          password:
            novaSenha,
        });

      if (updateError) {
        throw updateError;
      }

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");

      setMensagem(
        "Senha alterada com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao alterar senha:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível alterar a senha."
      );
    } finally {
      setAlterandoSenha(false);
    }
  }

  // =====================================================
  // SAIR
  // =====================================================

  async function sairDaConta() {
    const confirmou =
      window.confirm(
        "Deseja sair da sua conta?"
      );

    if (!confirmou) {
      return;
    }

    await supabase.auth
      .signOut();

    window.location.href =
      "/login";
  }

  // =====================================================
  // STATUS VISUAL
  // =====================================================

  function classeStatus() {
    if (
      perfil?.status ===
      "APROVADO"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      perfil?.status ===
      "BLOQUEADO"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl">

        {/* =============================================
            CABEÇALHO
        ============================================== */}

        <div className="mb-7">

          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Minha conta
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Meu Perfil
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Consulte seus dados pessoais,
            permissões, unidade vinculada e
            configurações de segurança.
          </p>

        </div>

        {/* =============================================
            MENSAGENS
        ============================================== */}

        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
            {mensagem}
          </div>
        )}

        {/* =============================================
            CABEÇALHO DO PERFIL
        ============================================== */}

        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="bg-gradient-to-r from-blue-700 to-slate-800 px-6 py-8">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              {/* AVATAR */}

              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white/20 bg-white text-3xl font-black text-blue-700 shadow-lg">
                {iniciais}
              </div>

              {/* DADOS */}

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-3">

                  <h2 className="text-2xl font-black text-white">
                    {nome ||
                      "Usuário"}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${classeStatus()}`}
                  >
                    {formatarStatus(
                      perfil?.status
                    )}
                  </span>

                  {isMaster && (
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-black uppercase text-purple-700">
                      MASTER
                    </span>
                  )}

                </div>

                <p className="mt-2 text-sm font-semibold text-blue-100">
                  {user?.email ||
                    perfil?.email ||
                    "-"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">

                  <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white">
                    👤{" "}
                    {formatarCargo(
                      perfil?.cargo
                    )}
                  </span>

                  <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white">
                    🏢{" "}
                    {loadingPatio
                      ? "Carregando..."
                      : patio?.nome ||
                        "Sem pátio vinculado"}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* =============================================
            GRID PRINCIPAL
        ============================================== */}

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

          {/* ===========================================
              COLUNA ESQUERDA
          ============================================ */}

          <div className="space-y-6">

            {/* =========================================
                DADOS PESSOAIS
            ========================================== */}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h2 className="text-lg font-black text-slate-900">
                  Dados pessoais
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Atualize suas informações básicas.
                </p>

              </div>

              <form
                onSubmit={
                  salvarPerfil
                }
                className="p-6"
              >

                <div className="grid gap-5 md:grid-cols-2">

                  {/* NOME */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Nome completo *
                    </label>

                    <input
                      type="text"
                      value={nome}
                      onChange={(event) =>
                        setNome(
                          event.target.value
                        )
                      }
                      placeholder="Seu nome completo"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                  </div>

                  {/* TELEFONE */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Telefone
                    </label>

                    <input
                      type="tel"
                      value={
                        telefone
                      }
                      onChange={(event) =>
                        setTelefone(
                          event.target.value
                        )
                      }
                      placeholder="(43) 99999-9999"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                  </div>

                  {/* EMAIL */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      E-mail
                    </label>

                    <input
                      type="email"
                      value={
                        user?.email ||
                        perfil?.email ||
                        ""
                      }
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      O e-mail da conta não pode ser alterado nesta página.
                    </p>

                  </div>

                  {/* CARGO */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Cargo
                    </label>

                    <input
                      value={formatarCargo(
                        perfil?.cargo
                      )}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      O cargo é definido pela administração.
                    </p>

                  </div>

                </div>

                <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">

                  <button
                    type="submit"
                    disabled={
                      salvandoPerfil
                    }
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoPerfil
                      ? "Salvando..."
                      : "Salvar alterações"}
                  </button>

                </div>

              </form>

            </div>

            {/* =========================================
                PÁTIO
            ========================================== */}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h2 className="text-lg font-black text-slate-900">
                  Pátio vinculado
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Unidade operacional associada à sua conta.
                </p>

              </div>

              <div className="p-6">

                {loadingPatio ? (
                  <p className="text-sm text-slate-500">
                    Carregando pátio...
                  </p>
                ) : patio ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

                    <div className="flex items-start gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl text-white">
                        🏢
                      </div>

                      <div>

                        <h3 className="font-black text-slate-900">
                          {patio.nome}
                        </h3>

                        {(patio.cidade ||
                          patio.estado) && (
                          <p className="mt-1 text-sm text-slate-600">
                            {patio.cidade ||
                              ""}
                            {patio.cidade &&
                            patio.estado
                              ? " - "
                              : ""}
                            {patio.estado ||
                              ""}
                          </p>
                        )}

                        {patio.endereco && (
                          <p className="mt-2 text-sm text-slate-500">
                            📍{" "}
                            {
                              patio.endereco
                            }
                          </p>
                        )}

                        {patio.telefone && (
                          <p className="mt-1 text-sm text-slate-500">
                            ☎{" "}
                            {
                              patio.telefone
                            }
                          </p>
                        )}

                        <span
                          className={`mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-black ${
                            patio.ativo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {patio.ativo
                            ? "PÁTIO ATIVO"
                            : "PÁTIO INATIVO"}
                        </span>

                      </div>

                    </div>

                  </div>
                ) : isMaster ? (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">

                    <p className="font-black text-purple-800">
                      Conta MASTER
                    </p>

                    <p className="mt-2 text-sm leading-6 text-purple-700">
                      Sua conta possui acesso geral e não precisa estar limitada a um único pátio.
                    </p>

                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

                    <p className="font-black text-amber-800">
                      Nenhum pátio vinculado
                    </p>

                    <p className="mt-2 text-sm text-amber-700">
                      Solicite ao administrador que vincule sua conta a um pátio.
                    </p>

                  </div>
                )}

              </div>

            </div>

            {/* =========================================
                PERMISSÕES
            ========================================== */}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h2 className="text-lg font-black text-slate-900">
                  Minhas permissões
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Módulos do sistema disponíveis para sua conta.
                </p>

              </div>

              <div className="p-6">

                {isMaster && (
                  <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-4">

                    <p className="font-black text-purple-800">
                      Acesso MASTER
                    </p>

                    <p className="mt-1 text-sm text-purple-700">
                      Esta conta possui acesso administrativo a todos os módulos do sistema.
                    </p>

                  </div>
                )}

                {permissoes.length ===
                0 ? (
                  <div className="rounded-xl bg-slate-50 p-5 text-center">

                    <p className="font-bold text-slate-600">
                      Nenhuma permissão adicional cadastrada.
                    </p>

                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                    {permissoes.map(
                      (permissao) => (
                        <div
                          key={
                            permissao
                          }
                          className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4"
                        >

                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600 text-sm font-black text-white">
                            ✓
                          </div>

                          <p className="text-sm font-bold text-green-800">
                            {NOMES_PERMISSOES[
                              permissao
                            ] ||
                              permissao}
                          </p>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </div>

            {/* =========================================
                SENHA
            ========================================== */}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h2 className="text-lg font-black text-slate-900">
                  Alterar senha
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Para sua segurança, informe primeiro sua senha atual.
                </p>

              </div>

              <form
                onSubmit={
                  alterarSenha
                }
                className="p-6"
              >

                <div className="grid gap-5">

                  {/* SENHA ATUAL */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Senha atual *
                    </label>

                    <div className="relative">

                      <input
                        type={
                          mostrarSenhaAtual
                            ? "text"
                            : "password"
                        }
                        value={
                          senhaAtual
                        }
                        onChange={(event) =>
                          setSenhaAtual(
                            event.target.value
                          )
                        }
                        autoComplete="current-password"
                        placeholder="Digite sua senha atual"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 text-sm outline-none focus:border-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMostrarSenhaAtual(
                            (valor) =>
                              !valor
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600"
                      >
                        {mostrarSenhaAtual
                          ? "Ocultar"
                          : "Mostrar"}
                      </button>

                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    {/* NOVA SENHA */}

                    <div>

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Nova senha *
                      </label>

                      <div className="relative">

                        <input
                          type={
                            mostrarNovaSenha
                              ? "text"
                              : "password"
                          }
                          value={
                            novaSenha
                          }
                          onChange={(event) =>
                            setNovaSenha(
                              event.target.value
                            )
                          }
                          autoComplete="new-password"
                          placeholder="Nova senha"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 text-sm outline-none focus:border-blue-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setMostrarNovaSenha(
                              (valor) =>
                                !valor
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600"
                        >
                          {mostrarNovaSenha
                            ? "Ocultar"
                            : "Mostrar"}
                        </button>

                      </div>

                    </div>

                    {/* CONFIRMAR */}

                    <div>

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Confirmar nova senha *
                      </label>

                      <div className="relative">

                        <input
                          type={
                            mostrarConfirmacao
                              ? "text"
                              : "password"
                          }
                          value={
                            confirmarSenha
                          }
                          onChange={(event) =>
                            setConfirmarSenha(
                              event.target.value
                            )
                          }
                          autoComplete="new-password"
                          placeholder="Repita a nova senha"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 text-sm outline-none focus:border-blue-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setMostrarConfirmacao(
                              (valor) =>
                                !valor
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600"
                        >
                          {mostrarConfirmacao
                            ? "Ocultar"
                            : "Mostrar"}
                        </button>

                      </div>

                    </div>

                  </div>

                  {/* REQUISITOS */}

                  {novaSenha && (
                    <div className="rounded-xl bg-slate-50 p-4">

                      <p className="mb-3 text-xs font-black uppercase text-slate-400">
                        Requisitos da senha
                      </p>

                      <div className="grid gap-2 text-sm sm:grid-cols-2">

                        <p
                          className={
                            senhaTemTamanho
                              ? "font-bold text-green-600"
                              : "text-slate-500"
                          }
                        >
                          {senhaTemTamanho
                            ? "✓"
                            : "○"}{" "}
                          Mínimo de 8 caracteres
                        </p>

                        <p
                          className={
                            senhaTemMaiuscula
                              ? "font-bold text-green-600"
                              : "text-slate-500"
                          }
                        >
                          {senhaTemMaiuscula
                            ? "✓"
                            : "○"}{" "}
                          Uma letra maiúscula
                        </p>

                        <p
                          className={
                            senhaTemMinuscula
                              ? "font-bold text-green-600"
                              : "text-slate-500"
                          }
                        >
                          {senhaTemMinuscula
                            ? "✓"
                            : "○"}{" "}
                          Uma letra minúscula
                        </p>

                        <p
                          className={
                            senhaTemNumero
                              ? "font-bold text-green-600"
                              : "text-slate-500"
                          }
                        >
                          {senhaTemNumero
                            ? "✓"
                            : "○"}{" "}
                          Pelo menos um número
                        </p>

                      </div>

                    </div>
                  )}

                </div>

                <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">

                  <button
                    type="submit"
                    disabled={
                      alterandoSenha
                    }
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {alterandoSenha
                      ? "Alterando..."
                      : "Alterar senha"}
                  </button>

                </div>

              </form>

            </div>

          </div>

          {/* ===========================================
              COLUNA DIREITA
          ============================================ */}

          <div className="space-y-6">

            {/* CONTA */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="text-lg font-black text-slate-900">
                Informações da conta
              </h2>

              <div className="mt-5 space-y-5">

                <div>

                  <p className="text-xs font-black uppercase text-slate-400">
                    E-mail
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                    {user?.email ||
                      "-"}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-black uppercase text-slate-400">
                    Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${classeStatus()}`}
                  >
                    {formatarStatus(
                      perfil?.status
                    )}
                  </span>

                </div>

                <div>

                  <p className="text-xs font-black uppercase text-slate-400">
                    Cargo
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {formatarCargo(
                      perfil?.cargo
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-black uppercase text-slate-400">
                    Conta criada
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {formatarData(
                      user?.created_at
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-black uppercase text-slate-400">
                    Último acesso
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {formatarData(
                      user?.last_sign_in_at
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-black uppercase text-slate-400">
                    ID da conta
                  </p>

                  <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                    {user?.id ||
                      "-"}
                  </p>

                </div>

              </div>

            </div>

            {/* SEGURANÇA */}

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl text-white">
                🔒
              </div>

              <h2 className="mt-4 font-black text-blue-900">
                Segurança da conta
              </h2>

              <p className="mt-2 text-sm leading-6 text-blue-700">
                Cargo, permissões, status e pátio
                não podem ser alterados pelo próprio
                usuário. Essas informações são
                controladas pela administração.
              </p>

            </div>

            {/* SAIR */}

            <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">

              <h2 className="font-black text-slate-900">
                Encerrar sessão
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Encerra sua sessão atual neste navegador.
              </p>

              <button
                type="button"
                onClick={
                  sairDaConta
                }
                className="mt-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
              >
                Sair da minha conta
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}