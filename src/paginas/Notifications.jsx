import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

// =======================================================
// CONFIGURAÇÕES
// =======================================================

const TIPOS = {
  INFO: {
    nome: "Informação",
    icone: "ℹ",
    card:
      "border-blue-200 bg-blue-50",
    badge:
      "bg-blue-100 text-blue-700",
    circulo:
      "bg-blue-600 text-white",
  },

  ALERTA: {
    nome: "Alerta",
    icone: "!",
    card:
      "border-amber-200 bg-amber-50",
    badge:
      "bg-amber-100 text-amber-700",
    circulo:
      "bg-amber-500 text-white",
  },

  SUCESSO: {
    nome: "Sucesso",
    icone: "✓",
    card:
      "border-green-200 bg-green-50",
    badge:
      "bg-green-100 text-green-700",
    circulo:
      "bg-green-600 text-white",
  },

  URGENTE: {
    nome: "Urgente",
    icone: "⚠",
    card:
      "border-red-200 bg-red-50",
    badge:
      "bg-red-100 text-red-700",
    circulo:
      "bg-red-600 text-white",
  },
};

// =======================================================
// COMPONENTE
// =======================================================

export default function Notifications() {
  const {
    user,
    perfil,
    isMaster,
  } = useAuth();

  const [
    notificacoes,
    setNotificacoes,
  ] = useState([]);

  const [
    leituras,
    setLeituras,
  ] = useState([]);

  const [
    patios,
    setPatios,
  ] = useState([]);

  const [
    usuarios,
    setUsuarios,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    pesquisa,
    setPesquisa,
  ] = useState("");

  const [
    filtroLeitura,
    setFiltroLeitura,
  ] = useState("TODAS");

  const [
    filtroTipo,
    setFiltroTipo,
  ] = useState("TODOS");

  const [
    patioFiltro,
    setPatioFiltro,
  ] = useState("TODOS");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState({
    titulo: "",
    mensagem: "",
    tipo: "INFO",
    escopo: "GLOBAL",
    patioId: "",
    usuarioId: "",
    expiraEm: "",
  });

  // =====================================================
  // CARREGAR
  // =====================================================

  useEffect(() => {
    if (!user?.id || !perfil) {
      return;
    }

    carregarDados();
  }, [
    user?.id,
    perfil,
    isMaster,
  ]);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      let consultaNotificacoes =
        supabase
          .from("notificacoes")
          .select("*")
          .eq("ativo", true)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      // ===============================================
      // USUÁRIO COMUM: SOMENTE NOTIFICAÇÕES PERMITIDAS
      // ===============================================

      if (!isMaster) {
        if (!perfil?.patio_id) {
          setNotificacoes([]);
          setLeituras([]);
          setPatios([]);
          setUsuarios([]);

          setErro(
            "Sua conta ainda não possui um pátio vinculado. Peça ao administrador para definir sua unidade."
          );

          return;
        }

        consultaNotificacoes =
          consultaNotificacoes.or(
            [
              "escopo.eq.GLOBAL",
              `and(escopo.eq.PATIO,patio_id.eq.${perfil.patio_id})`,
              `and(escopo.eq.USUARIO,destinatario_id.eq.${user.id})`,
            ].join(",")
          );
      }

      const requisicoes = [
        consultaNotificacoes,

        supabase
          .from(
            "notificacoes_leituras"
          )
          .select(
            "notificacao_id, user_id, lida_em"
          )
          .eq(
            "user_id",
            user.id
          ),

        supabase
          .from("patios")
          .select(
            "id, nome, cidade, estado, ativo"
          )
          .order("nome"),
      ];

      if (isMaster) {
        requisicoes.push(
          supabase
            .from("profiles")
            .select(
              "id, nome, email, status, cargo, patio_id"
            )
            .eq(
              "status",
              "APROVADO"
            )
            .order("nome")
        );
      }

      const respostas =
        await Promise.all(
          requisicoes
        );

      const notificacoesResponse =
        respostas[0];

      const leiturasResponse =
        respostas[1];

      const patiosResponse =
        respostas[2];

      const usuariosResponse =
        isMaster
          ? respostas[3]
          : null;

      if (
        notificacoesResponse.error
      ) {
        throw notificacoesResponse.error;
      }

      if (
        leiturasResponse.error
      ) {
        throw leiturasResponse.error;
      }

      if (
        patiosResponse.error
      ) {
        console.error(
          "Erro ao carregar pátios:",
          patiosResponse.error
        );
      }

      if (
        usuariosResponse?.error
      ) {
        console.error(
          "Erro ao carregar usuários:",
          usuariosResponse.error
        );
      }

      setNotificacoes(
        notificacoesResponse.data ||
          []
      );

      setLeituras(
        leiturasResponse.data ||
          []
      );

      setPatios(
        patiosResponse.data ||
          []
      );

      setUsuarios(
        usuariosResponse?.data ||
          []
      );
    } catch (error) {
      console.error(
        "Erro ao carregar notificações:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar as notificações."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PÁTIO
  // =====================================================

  function nomePatio(
    patioId
  ) {
    const patio =
      patios.find(
        (item) =>
          String(item.id) ===
          String(patioId)
      );

    return (
      patio?.nome ||
      "Pátio não informado"
    );
  }

  // =====================================================
  // USUÁRIO
  // =====================================================

  function nomeUsuario(
    usuarioId
  ) {
    const usuario =
      usuarios.find(
        (item) =>
          item.id ===
          usuarioId
      );

    if (!usuario) {
      return "Usuário específico";
    }

    return (
      usuario.nome ||
      usuario.email ||
      "Usuário"
    );
  }

  // =====================================================
  // ACESSO À NOTIFICAÇÃO
  // =====================================================

  function podeAcessarNotificacao(item) {
    if (isMaster) {
      return true;
    }

    if (!item) {
      return false;
    }

    if (item.escopo === "GLOBAL") {
      return true;
    }

    if (item.escopo === "PATIO") {
      return (
        Boolean(perfil?.patio_id) &&
        String(item.patio_id) ===
          String(perfil.patio_id)
      );
    }

    if (item.escopo === "USUARIO") {
      return (
        String(item.destinatario_id) ===
        String(user?.id)
      );
    }

    return false;
  }

  // =====================================================
  // LEITURA
  // =====================================================

  const idsLidas =
    useMemo(() => {
      return new Set(
        leituras.map(
          (item) =>
            String(
              item.notificacao_id
            )
        )
      );
    }, [
      leituras,
    ]);

  function estaLida(
    notificacaoId
  ) {
    return idsLidas.has(
      String(
        notificacaoId
      )
    );
  }

  // =====================================================
  // FILTRAR
  // =====================================================

  const notificacoesFiltradas =
    useMemo(() => {
      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      return notificacoes.filter(
        (item) => {
          if (
            !podeAcessarNotificacao(
              item
            )
          ) {
            return false;
          }

          const lida =
            idsLidas.has(
              String(item.id)
            );

          if (
            filtroLeitura ===
              "NAO_LIDAS" &&
            lida
          ) {
            return false;
          }

          if (
            filtroLeitura ===
              "LIDAS" &&
            !lida
          ) {
            return false;
          }

          if (
            filtroTipo !==
              "TODOS" &&
            item.tipo !==
              filtroTipo
          ) {
            return false;
          }

          if (
            isMaster &&
            patioFiltro !==
              "TODOS"
          ) {
            const corresponde =
              item.escopo ===
                "GLOBAL" ||
              (
                item.escopo ===
                  "PATIO" &&
                String(
                  item.patio_id
                ) ===
                  String(
                    patioFiltro
                  )
              );

            if (
              !corresponde
            ) {
              return false;
            }
          }

          if (!termo) {
            return true;
          }

          const texto = [
            item.titulo,
            item.mensagem,
            item.tipo,
            item.escopo,
            item.criado_por_nome,

            item.patio_id
              ? nomePatio(
                  item.patio_id
                )
              : "",

            item.destinatario_id
              ? nomeUsuario(
                  item.destinatario_id
                )
              : "",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return texto.includes(
            termo
          );
        }
      );
    }, [
      notificacoes,
      idsLidas,
      pesquisa,
      filtroLeitura,
      filtroTipo,
      patioFiltro,
      patios,
      usuarios,
      isMaster,
      perfil?.patio_id,
      user?.id,
    ]);

  // =====================================================
  // CONTADORES
  // =====================================================

  const total =
    notificacoes.filter(
      (item) =>
        podeAcessarNotificacao(
          item
        )
    ).length;

  const totalNaoLidas =
    notificacoes.filter(
      (item) =>
        podeAcessarNotificacao(
          item
        ) &&
        !idsLidas.has(
          String(item.id)
        )
    ).length;

  const totalUrgentes =
    notificacoes.filter(
      (item) =>
        podeAcessarNotificacao(
          item
        ) &&
        item.tipo ===
          "URGENTE"
    ).length;

  // =====================================================
  // FORMATAR DATA
  // =====================================================

  function formatarData(
    data
  ) {
    if (!data) {
      return "-";
    }

    return new Date(
      data
    ).toLocaleString(
      "pt-BR"
    );
  }

  // =====================================================
  // MARCAR COMO LIDA
  // =====================================================

  async function marcarComoLida(
    notificacaoId
  ) {
    const notificacao =
      notificacoes.find(
        (item) =>
          String(item.id) ===
          String(notificacaoId)
      );

    if (
      !podeAcessarNotificacao(
        notificacao
      )
    ) {
      setErro(
        "Você não tem acesso a esta notificação."
      );
      return;
    }

    if (
      estaLida(
        notificacaoId
      )
    ) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from(
          "notificacoes_leituras"
        )
        .upsert(
          {
            notificacao_id:
              notificacaoId,

            user_id:
              user.id,

            lida_em:
              new Date().toISOString(),
          },

          {
            onConflict:
              "notificacao_id,user_id",
          }
        );

      if (error) {
        throw error;
      }

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao marcar como lida:",
        error
      );

      setErro(
        "Não foi possível marcar a notificação como lida."
      );
    }
  }

  // =====================================================
  // MARCAR COMO NÃO LIDA
  // =====================================================

  async function marcarComoNaoLida(
    notificacaoId
  ) {
    const notificacao =
      notificacoes.find(
        (item) =>
          String(item.id) ===
          String(notificacaoId)
      );

    if (
      !podeAcessarNotificacao(
        notificacao
      )
    ) {
      setErro(
        "Você não tem acesso a esta notificação."
      );
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from(
          "notificacoes_leituras"
        )
        .delete()
        .eq(
          "notificacao_id",
          notificacaoId
        )
        .eq(
          "user_id",
          user.id
        );

      if (error) {
        throw error;
      }

      await carregarDados();
    } catch (error) {
      setErro(
        "Não foi possível alterar a notificação."
      );
    }
  }

  // =====================================================
  // MARCAR TODAS
  // =====================================================

  async function marcarTodasComoLidas() {
    const naoLidas =
      notificacoesFiltradas.filter(
        (item) =>
          !estaLida(
            item.id
          )
      );

    if (
      naoLidas.length === 0
    ) {
      setMensagem(
        "Todas as notificações já estão lidas."
      );

      return;
    }

    try {
      const registros =
        naoLidas.map(
          (item) => ({
            notificacao_id:
              item.id,

            user_id:
              user.id,

            lida_em:
              new Date().toISOString(),
          })
        );

      const {
        error,
      } = await supabase
        .from(
          "notificacoes_leituras"
        )
        .upsert(
          registros,
          {
            onConflict:
              "notificacao_id,user_id",
          }
        );

      if (error) {
        throw error;
      }

      setMensagem(
        "Notificações marcadas como lidas."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível marcar todas como lidas."
      );
    }
  }

  // =====================================================
  // FORMULÁRIO MASTER
  // =====================================================

  function abrirFormulario() {
    setForm({
      titulo: "",
      mensagem: "",
      tipo: "INFO",
      escopo: "GLOBAL",
      patioId: "",
      usuarioId: "",
      expiraEm: "",
    });

    setErro("");
    setMensagem("");

    setMostrarFormulario(
      true
    );
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setMostrarFormulario(
      false
    );
  }

  function alterarCampo(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (anterior) => {
        const novo = {
          ...anterior,
          [name]: value,
        };

        if (
          name === "escopo"
        ) {
          novo.patioId = "";
          novo.usuarioId = "";
        }

        return novo;
      }
    );
  }

  // =====================================================
  // CRIAR NOTIFICAÇÃO
  // =====================================================

  async function criarNotificacao(
    event
  ) {
    event.preventDefault();

    if (!isMaster) {
      return;
    }

    setErro("");
    setMensagem("");

    if (
      !form.titulo.trim()
    ) {
      setErro(
        "Informe o título da notificação."
      );

      return;
    }

    if (
      !form.mensagem.trim()
    ) {
      setErro(
        "Informe a mensagem."
      );

      return;
    }

    if (
      form.escopo ===
        "PATIO" &&
      !form.patioId
    ) {
      setErro(
        "Selecione o pátio que receberá a notificação."
      );

      return;
    }

    if (
      form.escopo ===
        "USUARIO" &&
      !form.usuarioId
    ) {
      setErro(
        "Selecione o usuário."
      );

      return;
    }

    try {
      setSalvando(true);

      let expiraEm =
        null;

      if (
        form.expiraEm
      ) {
        expiraEm =
          new Date(
            `${form.expiraEm}T23:59:59`
          ).toISOString();
      }

      const dados = {
        titulo:
          form.titulo.trim(),

        mensagem:
          form.mensagem.trim(),

        tipo:
          form.tipo,

        escopo:
          form.escopo,

        patio_id:
          form.escopo ===
            "PATIO"
            ? Number(
                form.patioId
              )
            : null,

        destinatario_id:
          form.escopo ===
            "USUARIO"
            ? form.usuarioId
            : null,

        criado_por:
          user?.id ||
          null,

        criado_por_nome:
          perfil?.nome ||
          user?.email ||
          "MASTER",

        expira_em:
          expiraEm,

        ativo:
          true,
      };

      const {
        error,
      } = await supabase
        .from(
          "notificacoes"
        )
        .insert(
          dados
        );

      if (error) {
        throw error;
      }

      setMostrarFormulario(
        false
      );

      setMensagem(
        "Notificação enviada com sucesso."
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao criar notificação:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível enviar a notificação."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =====================================================
  // ARQUIVAR MASTER
  // =====================================================

  async function arquivarNotificacao(
    item
  ) {
    if (!isMaster) {
      return;
    }

    const confirmou =
      window.confirm(
        `Deseja arquivar a notificação "${item.titulo}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from(
          "notificacoes"
        )
        .update({
          ativo:
            false,
        })
        .eq(
          "id",
          item.id
        );

      if (error) {
        throw error;
      }

      setMensagem(
        "Notificação arquivada."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível arquivar."
      );
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Carregando notificações...
          </p>

        </div>
      </div>
    );
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}

        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Central de avisos
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Notificações
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Consulte comunicados, alertas e
              informações importantes relacionadas
              à operação do sistema.
            </p>

            <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
              🏢 Acesso: {isMaster
                ? "Todos os pátios"
                : nomePatio(
                    perfil?.patio_id
                  )}
            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            {totalNaoLidas > 0 && (
              <button
                type="button"
                onClick={
                  marcarTodasComoLidas
                }
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                ✓ Marcar todas como lidas
              </button>
            )}

            {isMaster && (
              <button
                type="button"
                onClick={
                  abrirFormulario
                }
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
              >
                + Nova notificação
              </button>
            )}

          </div>

        </div>

        {/* MENSAGENS */}

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

        {/* RESUMO */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          <button
            type="button"
            onClick={() =>
              setFiltroLeitura(
                "TODAS"
              )
            }
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
          >

            <p className="text-sm font-bold text-slate-500">
              Todas
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {total}
            </p>

          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroLeitura(
                "NAO_LIDAS"
              )
            }
            className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left shadow-sm transition hover:shadow-md"
          >

            <p className="text-sm font-bold text-blue-700">
              Não lidas
            </p>

            <p className="mt-2 text-3xl font-black text-blue-700">
              {totalNaoLidas}
            </p>

          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipo(
                "URGENTE"
              );

              setFiltroLeitura(
                "TODAS"
              );
            }}
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left shadow-sm transition hover:shadow-md"
          >

            <p className="text-sm font-bold text-red-700">
              Urgentes
            </p>

            <p className="mt-2 text-3xl font-black text-red-700">
              {totalUrgentes}
            </p>

          </button>

        </div>

        {/* FILTROS */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div
            className={`grid gap-4 ${
              isMaster
                ? "md:grid-cols-2 xl:grid-cols-4"
                : "md:grid-cols-3"
            }`}
          >

            <input
              value={
                pesquisa
              }
              onChange={(event) =>
                setPesquisa(
                  event.target.value
                )
              }
              placeholder="Pesquisar notificação..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={
                filtroLeitura
              }
              onChange={(event) =>
                setFiltroLeitura(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >

              <option value="TODAS">
                Todas
              </option>

              <option value="NAO_LIDAS">
                Não lidas
              </option>

              <option value="LIDAS">
                Lidas
              </option>

            </select>

            <select
              value={
                filtroTipo
              }
              onChange={(event) =>
                setFiltroTipo(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >

              <option value="TODOS">
                Todos os tipos
              </option>

              <option value="INFO">
                Informações
              </option>

              <option value="ALERTA">
                Alertas
              </option>

              <option value="SUCESSO">
                Sucesso
              </option>

              <option value="URGENTE">
                Urgentes
              </option>

            </select>

            {isMaster && (
              <select
                value={
                  patioFiltro
                }
                onChange={(event) =>
                  setPatioFiltro(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
              >

                <option value="TODOS">
                  Todos os pátios
                </option>

                {patios.map(
                  (patio) => (
                    <option
                      key={
                        patio.id
                      }
                      value={
                        patio.id
                      }
                    >
                      {patio.nome}
                    </option>
                  )
                )}

              </select>
            )}

          </div>

        </div>

        {/* LISTAGEM */}

        {notificacoesFiltradas.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="text-5xl">
              🔔
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              Nenhuma notificação
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Não existem notificações para os filtros selecionados.
            </p>

          </div>
        ) : (
          <div className="space-y-4">

            {notificacoesFiltradas.map(
              (item) => {
                const config =
                  TIPOS[
                    item.tipo
                  ] ||
                  TIPOS.INFO;

                const lida =
                  estaLida(
                    item.id
                  );

                return (
                  <div
                    key={
                      item.id
                    }
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                      lida
                        ? "border-slate-200 opacity-80"
                        : config.card
                    }`}
                  >

                    <div className="flex flex-col gap-4 sm:flex-row">

                      {/* ÍCONE */}

                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black ${config.circulo}`}
                      >
                        {
                          config.icone
                        }
                      </div>

                      {/* TEXTO */}

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h2 className="text-lg font-black text-slate-900">
                            {
                              item.titulo
                            }
                          </h2>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${config.badge}`}
                          >
                            {
                              config.nome
                            }
                          </span>

                          {!lida && (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white">
                              NOVA
                            </span>
                          )}

                        </div>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                          {
                            item.mensagem
                          }
                        </p>

                        {/* DESTINO */}

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-400">

                          <span>
                            {formatarData(
                              item.created_at
                            )}
                          </span>

                          {item.escopo ===
                            "GLOBAL" && (
                            <span>
                              🌐 Todos os pátios
                            </span>
                          )}

                          {item.escopo ===
                            "PATIO" && (
                            <span>
                              🏢{" "}
                              {nomePatio(
                                item.patio_id
                              )}
                            </span>
                          )}

                          {item.escopo ===
                            "USUARIO" && (
                            <span>
                              👤{" "}
                              {isMaster
                                ? nomeUsuario(
                                    item.destinatario_id
                                  )
                                : "Notificação individual"}
                            </span>
                          )}

                          {item.criado_por_nome && (
                            <span>
                              Enviado por:{" "}
                              {
                                item.criado_por_nome
                              }
                            </span>
                          )}

                          {item.expira_em && (
                            <span>
                              Expira:{" "}
                              {formatarData(
                                item.expira_em
                              )}
                            </span>
                          )}

                        </div>

                      </div>

                      {/* AÇÕES */}

                      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">

                        {!lida ? (
                          <button
                            type="button"
                            onClick={() =>
                              marcarComoLida(
                                item.id
                              )
                            }
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            ✓ Marcar como lida
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              marcarComoNaoLida(
                                item.id
                              )
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            Marcar não lida
                          </button>
                        )}

                        {isMaster && (
                          <button
                            type="button"
                            onClick={() =>
                              arquivarNotificacao(
                                item
                              )
                            }
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            Arquivar
                          </button>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* =================================================
          MODAL NOVA NOTIFICAÇÃO
      ================================================== */}

      {mostrarFormulario &&
        isMaster && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">

            <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* CABEÇALHO */}

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

                <div>

                  <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                    Administração
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Nova notificação
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={
                    fecharFormulario
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500"
                >
                  ✕
                </button>

              </div>

              <form
                onSubmit={
                  criarNotificacao
                }
                className="p-6"
              >

                {erro && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {erro}
                  </div>
                )}

                {/* TÍTULO */}

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Título *
                  </label>

                  <input
                    name="titulo"
                    value={
                      form.titulo
                    }
                    onChange={
                      alterarCampo
                    }
                    placeholder="Ex.: Manutenção programada"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />

                </div>

                {/* MENSAGEM */}

                <div className="mt-5">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Mensagem *
                  </label>

                  <textarea
                    name="mensagem"
                    value={
                      form.mensagem
                    }
                    onChange={
                      alterarCampo
                    }
                    rows={6}
                    placeholder="Digite a mensagem que será enviada..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />

                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">

                  {/* TIPO */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Tipo
                    </label>

                    <select
                      name="tipo"
                      value={
                        form.tipo
                      }
                      onChange={
                        alterarCampo
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >

                      <option value="INFO">
                        Informação
                      </option>

                      <option value="ALERTA">
                        Alerta
                      </option>

                      <option value="SUCESSO">
                        Sucesso
                      </option>

                      <option value="URGENTE">
                        Urgente
                      </option>

                    </select>

                  </div>

                  {/* ESCOPO */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Enviar para *
                    </label>

                    <select
                      name="escopo"
                      value={
                        form.escopo
                      }
                      onChange={
                        alterarCampo
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >

                      <option value="GLOBAL">
                        Todos os pátios
                      </option>

                      <option value="PATIO">
                        Um pátio específico
                      </option>

                      <option value="USUARIO">
                        Um usuário específico
                      </option>

                    </select>

                  </div>

                  {/* PÁTIO */}

                  {form.escopo ===
                    "PATIO" && (
                    <div className="md:col-span-2">

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Pátio *
                      </label>

                      <select
                        name="patioId"
                        value={
                          form.patioId
                        }
                        onChange={
                          alterarCampo
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                      >

                        <option value="">
                          Selecione
                        </option>

                        {patios
                          .filter(
                            (patio) =>
                              patio.ativo
                          )
                          .map(
                            (patio) => (
                              <option
                                key={
                                  patio.id
                                }
                                value={
                                  patio.id
                                }
                              >
                                {patio.nome}
                                {patio.cidade
                                  ? ` - ${patio.cidade}`
                                  : ""}
                              </option>
                            )
                          )}

                      </select>

                    </div>
                  )}

                  {/* USUÁRIO */}

                  {form.escopo ===
                    "USUARIO" && (
                    <div className="md:col-span-2">

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Usuário *
                      </label>

                      <select
                        name="usuarioId"
                        value={
                          form.usuarioId
                        }
                        onChange={
                          alterarCampo
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                      >

                        <option value="">
                          Selecione
                        </option>

                        {usuarios.map(
                          (usuario) => (
                            <option
                              key={
                                usuario.id
                              }
                              value={
                                usuario.id
                              }
                            >
                              {usuario.nome ||
                                usuario.email}
                              {" - "}
                              {usuario.email}

                              {usuario.patio_id
                                ? ` - ${nomePatio(
                                    usuario.patio_id
                                  )}`
                                : ""}
                            </option>
                          )
                        )}

                      </select>

                    </div>
                  )}

                  {/* EXPIRAÇÃO */}

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Data de expiração
                    </label>

                    <input
                      type="date"
                      name="expiraEm"
                      value={
                        form.expiraEm
                      }
                      onChange={
                        alterarCampo
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Opcional. Se não informar, a notificação permanecerá ativa até ser arquivada.
                    </p>

                  </div>

                </div>

                {/* BOTÕES */}

                <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      fecharFormulario
                    }
                    disabled={
                      salvando
                    }
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      salvando
                    }
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {salvando
                      ? "Enviando..."
                      : "🔔 Enviar notificação"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </div>
  );
}