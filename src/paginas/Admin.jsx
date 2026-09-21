import { useEffect, useMemo, useState } from "react";
import PageHeader from "../componentes/PageHeader";
import { supabase } from "../API/supabaseClient";


const CARGOS = [
  {
    value: "SEM_CARGO",
    label: "Sem cargo",
  },
  {
    value: "MASTER",
    label: "Master",
  },
  {
    value: "ADMIN",
    label: "Administrador",
  },
  {
    value: "OPERADOR",
    label: "Operador",
  },
  {
    value: "FINANCEIRO",
    label: "Financeiro",
  },
  {
    value: "CONSULTA",
    label: "Consulta",
  },
];

const PERMISSOES = [
  {
    id: "dashboard",
    nome: "Dashboard",
    descricao: "Visualizar o painel principal.",
  },
  {
    id: "vehicles",
    nome: "Veículos",
    descricao: "Visualizar os veículos cadastrados.",
  },
  {
    id: "cadastrar_veiculo",
    nome: "Cadastrar veículos",
    descricao: "Cadastrar novos veículos.",
  },
  {
    id: "excluir_veiculo",
    nome: "Excluir veículos",
    descricao: "Enviar veículos para a lixeira.",
  },
  {
    id: "releases",
    nome: "Veículos liberados",
    descricao: "Acessar liberações de veículos.",
  },
  {
    id: "auction",
    nome: "Leilão",
    descricao: "Acessar veículos enviados para leilão.",
  },
  {
    id: "judicial",
    nome: "Retirada judicial",
    descricao: "Acessar retiradas por ordem judicial.",
  },
  {
    id: "other_destinations",
    nome: "Outros destinos",
    descricao: "Acessar movimentações para outros destinos.",
  },
  {
    id: "analysis",
    nome: "Análise",
    descricao: "Acessar o módulo de análise.",
  },
  {
    id: "financial",
    nome: "Financeiro",
    descricao: "Acessar informações financeiras.",
  },
  {
    id: "reports",
    nome: "Relatórios",
    descricao: "Visualizar relatórios do sistema.",
  },
  {
    id: "notifications",
    nome: "Notificações",
    descricao: "Acessar notificações.",
  },
  {
    id: "consulta_cnpj",
    nome: "Consulta CNPJ",
    descricao: "Consultar dados cadastrais de empresas por CNPJ.",
  },
  {
    id: "contratos",
    nome: "Contratos e Tarifas",
    descricao: "Acessar contratos dos pátios, documentos e tarifas de cobrança.",
  },
  {
    id: "manuals",
    nome: "Manuais",
    descricao: "Acessar manuais internos.",
  },
  {
    id: "admin",
    nome: "Administração",
    descricao: "Administrar usuários e permissões.",
  },
];

const PERMISSOES_PADRAO = {
  MASTER: PERMISSOES.map(
    (permissao) => permissao.id
  ),

  ADMIN: [
    "dashboard",
    "vehicles",
    "cadastrar_veiculo",
    "excluir_veiculo",
    "releases",
    "auction",
    "judicial",
    "other_destinations",
    "analysis",
    "reports",
    "notifications",
    "manuals",
    "admin",
  ],

  OPERADOR: [
    "dashboard",
    "vehicles",
    "cadastrar_veiculo",
    "releases",
    "auction",
    "judicial",
    "other_destinations",
    "analysis",
    "notifications",
    "manuals",
  ],

  FINANCEIRO: [
    "dashboard",
    "financial",
    "reports",
  ],

  CONSULTA: [
    "dashboard",
    "vehicles",
    "reports",
    "manuals",
  ],

  SEM_CARGO: [],
};

export default function Admin() {
  const [perfilAtual, setPerfilAtual] =
    useState(null);

  const [usuarios, setUsuarios] =
    useState([]);

  // Pátios disponíveis para vincular aos usuários
  const [patios, setPatios] =
    useState([]);

  const [configuracoes, setConfiguracoes] =
    useState({});

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [salvandoId, setSalvandoId] =
    useState(null);

  const [usuarioAtualId, setUsuarioAtualId] =
    useState(null);

  const [filtro, setFiltro] =
    useState("PENDENTE");

  const [busca, setBusca] =
    useState("");

  const ehMaster =
    perfilAtual?.cargo === "MASTER" &&
    perfilAtual?.status === "APROVADO";

  // =========================================================
  // CARREGAR
  // =========================================================

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    try {
      setCarregando(true);
      setErro("");

      // Usuário atualmente logado
      const {
  data: authData,
  error: authError,
} = await supabase.auth.getUser();

if (authError) {
  throw authError;
}

const usuarioLogado = authData?.user;

if (!usuarioLogado) {
  throw new Error(
    "Nenhum usuário autenticado."
  );
}

setUsuarioAtualId(
  usuarioLogado.id
);

// Buscar o cargo do usuário logado
const {
  data: meuPerfil,
  error: erroPerfil,
} = await supabase
  .from("profiles")
  .select(`
    id,
    nome,
    email,
    cargo,
    status,
    patio_id
  `)
  .eq("id", usuarioLogado.id)
  .single();

if (erroPerfil) {
  throw erroPerfil;
}

setPerfilAtual(meuPerfil);

      // Buscar pátios ativos sem alterar a lógica já existente da Administração
      const {
        data: patiosData,
        error: patiosError,
      } = await supabase
        .from("patios")
        .select("id, nome, cidade, estado, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (patiosError) {
        throw patiosError;
      }

      setPatios(patiosData || []);

      // Buscar perfis
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          email,
          status,
          cargo,
          permissoes,
          patio_id,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      const lista =
        data || [];

      setUsuarios(lista);

      const configs = {};

      lista.forEach(
        (usuario) => {
          configs[usuario.id] = {
            cargo:
              usuario.cargo ||
              "SEM_CARGO",

            permissoes:
              Array.isArray(
                usuario.permissoes
              )
                ? usuario.permissoes
                : [],

            patio_id:
              usuario.patio_id || null,
          };
        }
      );

      setConfiguracoes(configs);

    } catch (error) {

      console.error(
        "Erro ao carregar usuários:",
        error
      );

      setErro(
        error.message ||
          "Não foi possível carregar os usuários."
      );

    } finally {

      setCarregando(false);

    }
  }

  // =========================================================
  // CONTADORES
  // =========================================================

  const contadores =
    useMemo(() => {

      return {
        total:
          usuarios.length,

        pendentes:
          usuarios.filter(
            (usuario) =>
              usuario.status ===
              "PENDENTE"
          ).length,

        aprovados:
          usuarios.filter(
            (usuario) =>
              usuario.status ===
              "APROVADO"
          ).length,

        bloqueados:
          usuarios.filter(
            (usuario) =>
              usuario.status ===
              "BLOQUEADO"
          ).length,
      };

    }, [usuarios]);

  // =========================================================
  // FILTRAR USUÁRIOS
  // =========================================================

  const usuariosFiltrados =
    useMemo(() => {

      const texto =
        busca
          .trim()
          .toLowerCase();

      return usuarios.filter(
        (usuario) => {

          const correspondeFiltro =
            filtro === "TODOS" ||
            usuario.status ===
              filtro;

          const correspondeBusca =
            !texto ||
            usuario.nome
              ?.toLowerCase()
              .includes(texto) ||
            usuario.email
              ?.toLowerCase()
              .includes(texto);

          return (
            correspondeFiltro &&
            correspondeBusca
          );
        }
      );

    }, [
      usuarios,
      filtro,
      busca,
    ]);

  // =========================================================
  // CONFIGURAÇÃO LOCAL
  // =========================================================

  function alterarCargo(
    usuarioId,
    novoCargo
  ) {
    setConfiguracoes(
      (anterior) => ({
        ...anterior,

        [usuarioId]: {
          ...anterior[
            usuarioId
          ],

          cargo:
            novoCargo,

          // MASTER possui acesso global e não fica preso a um único pátio
          patio_id:
            novoCargo === "MASTER"
              ? null
              : anterior[usuarioId]?.patio_id || null,

          // Aplicar permissões padrão do cargo
          permissoes:
            PERMISSOES_PADRAO[
              novoCargo
            ] || [],
        },
      })
    );
  }

  function alterarPermissao(
    usuarioId,
    permissao
  ) {
    setConfiguracoes(
      (anterior) => {

        const atual =
          anterior[
            usuarioId
          ] || {
            cargo:
              "SEM_CARGO",
            permissoes: [],
            patio_id: null,
          };

        const existe =
          atual.permissoes.includes(
            permissao
          );

        const novasPermissoes =
          existe
            ? atual.permissoes.filter(
                (item) =>
                  item !==
                  permissao
              )
            : [
                ...atual.permissoes,
                permissao,
              ];

        return {
          ...anterior,

          [usuarioId]: {
            ...atual,
            permissoes:
              novasPermissoes,
          },
        };
      }
    );
  }

  // =========================================================
  // ALTERAR PÁTIO DO USUÁRIO
  // =========================================================

  function alterarPatio(
    usuarioId,
    novoPatioId
  ) {
    setConfiguracoes(
      (anterior) => ({
        ...anterior,

        [usuarioId]: {
          ...anterior[usuarioId],
          patio_id:
            novoPatioId
              ? Number(novoPatioId)
              : null,
        },
      })
    );
  }

  // =========================================================
  // APROVAR USUÁRIO
  // =========================================================

  async function aprovarUsuario(
    usuario
  ) {
    const config =
      configuracoes[
        usuario.id
      ];

    if (
      !config ||
      config.cargo ===
        "SEM_CARGO"
    ) {
      alert(
        "Selecione um cargo antes de aprovar o usuário."
      );

      return;
    }

    if (
      config.cargo !== "MASTER" &&
      !config.patio_id
    ) {
      alert(
        "Selecione o pátio do usuário antes de aprovar o cadastro."
      );

      return;
    }

    const confirmar =
      window.confirm(
        `Deseja aprovar o acesso de ${usuario.nome || usuario.email}?\n\n` +
          `Cargo: ${formatarCargo(config.cargo)}\n` +
          `Pátio: ${formatarPatio(config.cargo === "MASTER" ? null : config.patio_id)}`
      );

    if (!confirmar) {
      return;
    }

    try {
      setSalvandoId(
        usuario.id
      );

      setMensagem("");
      setErro("");

      const { error } =
        await supabase
          .from("profiles")
          .update({
            status:
              "APROVADO",

            cargo:
              config.cargo,

            permissoes:
              config.permissoes,

            patio_id:
              config.cargo === "MASTER"
                ? null
                : config.patio_id || null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            usuario.id
          );

      if (error) {
        throw error;
      }

      atualizarUsuarioLocal(
        usuario.id,
        {
          status:
            "APROVADO",

          cargo:
            config.cargo,

          permissoes:
            config.permissoes,

          patio_id:
            config.cargo === "MASTER"
              ? null
              : config.patio_id || null,
        }
      );

      setMensagem(
        `${usuario.nome || usuario.email} foi aprovado com sucesso.`
      );

    } catch (error) {

      console.error(
        "Erro ao aprovar usuário:",
        error
      );

      setErro(
        error.message ||
          "Não foi possível aprovar o usuário."
      );

    } finally {

      setSalvandoId(
        null
      );

    }
  }

  // =========================================================
  // SALVAR ALTERAÇÕES
  // =========================================================

  async function salvarUsuario(
    usuario
  ) {
    const config =
      configuracoes[
        usuario.id
      ];

    if (!config) {
      return;
    }

    try {
      setSalvandoId(
        usuario.id
      );

      setErro("");
      setMensagem("");

      const { error } =
        await supabase
          .from("profiles")
          .update({
            cargo:
              config.cargo,

            permissoes:
              config.permissoes,

            patio_id:
              config.cargo === "MASTER"
                ? null
                : config.patio_id || null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            usuario.id
          );

      if (error) {
        throw error;
      }

      atualizarUsuarioLocal(
        usuario.id,
        {
          cargo:
            config.cargo,

          permissoes:
            config.permissoes,

          patio_id:
            config.cargo === "MASTER"
              ? null
              : config.patio_id || null,
        }
      );

      setMensagem(
        `Permissões de ${usuario.nome || usuario.email} atualizadas.`
      );

    } catch (error) {

      console.error(
        "Erro ao salvar usuário:",
        error
      );

      setErro(
        error.message ||
          "Não foi possível salvar as alterações."
      );

    } finally {

      setSalvandoId(
        null
      );

    }
  }

  // =========================================================
  // BLOQUEAR
  // =========================================================

  async function bloquearUsuario(
    usuario
  ) {
    if (
      usuario.id ===
      usuarioAtualId
    ) {
      alert(
        "Você não pode bloquear sua própria conta."
      );

      return;
    }

    if (
      usuario.cargo ===
      "MASTER"
    ) {
      alert(
        "Uma conta MASTER não pode ser bloqueada por esta tela."
      );

      return;
    }

    const confirmar =
      window.confirm(
        `Deseja bloquear ${usuario.nome || usuario.email}?\n\n` +
          "O usuário não poderá acessar o sistema."
      );

    if (!confirmar) {
      return;
    }

    try {
      setSalvandoId(
        usuario.id
      );

      const { error } =
        await supabase
          .from("profiles")
          .update({
            status:
              "BLOQUEADO",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            usuario.id
          );

      if (error) {
        throw error;
      }

      atualizarUsuarioLocal(
        usuario.id,
        {
          status:
            "BLOQUEADO",
        }
      );

      setMensagem(
        `${usuario.nome || usuario.email} foi bloqueado.`
      );

    } catch (error) {

      setErro(
        error.message ||
          "Não foi possível bloquear o usuário."
      );

    } finally {

      setSalvandoId(
        null
      );

    }
  }

  // =========================================================
  // REATIVAR
  // =========================================================

  async function reativarUsuario(
    usuario
  ) {
    const confirmar =
      window.confirm(
        `Deseja reativar o acesso de ${usuario.nome || usuario.email}?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setSalvandoId(
        usuario.id
      );

      const { error } =
        await supabase
          .from("profiles")
          .update({
            status:
              "APROVADO",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            usuario.id
          );

      if (error) {
        throw error;
      }

      atualizarUsuarioLocal(
        usuario.id,
        {
          status:
            "APROVADO",
        }
      );

      setMensagem(
        `${usuario.nome || usuario.email} foi reativado.`
      );

    } catch (error) {

      setErro(
        error.message ||
          "Não foi possível reativar o usuário."
      );

    } finally {

      setSalvandoId(
        null
      );

    }
  }

  // =========================================================
  // APAGAR CONTA - SOMENTE MASTER
  // =========================================================

  async function apagarConta(usuario) {
    if (!ehMaster) {
      alert(
        "Somente um usuário MASTER pode apagar contas."
      );
      return;
    }

    if (usuario.id === usuarioAtualId) {
      alert(
        "Você não pode apagar sua própria conta MASTER."
      );
      return;
    }

    const primeiraConfirmacao =
      window.confirm(
        `ATENÇÃO!\n\nDeseja apagar a conta de ${
          usuario.nome || usuario.email
        }?\n\nEsta ação removerá permanentemente o usuário do sistema.`
      );

    if (!primeiraConfirmacao) {
      return;
    }

    const segundaConfirmacao =
      window.confirm(
        `CONFIRMAÇÃO FINAL\n\nConta: ${
          usuario.email
        }\n\nDepois de apagada, essa conta não poderá ser recuperada.\n\nDeseja continuar?`
      );

    if (!segundaConfirmacao) {
      return;
    }

    try {
      setSalvandoId(usuario.id);
      setErro("");
      setMensagem("");

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "delete-user",
        {
          body: {
            user_id: usuario.id,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setUsuarios((anteriores) =>
        anteriores.filter(
          (item) => item.id !== usuario.id
        )
      );

      setConfiguracoes((anterior) => {
        const copia = { ...anterior };
        delete copia[usuario.id];
        return copia;
      });

      setMensagem(
        `A conta de ${
          usuario.nome || usuario.email
        } foi apagada definitivamente.`
      );
    } catch (error) {
      console.error(
        "Erro ao apagar conta:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível apagar a conta."
      );
    } finally {
      setSalvandoId(null);
    }
  }

  // =========================================================
  // ATUALIZAR ESTADO LOCAL
  // =========================================================

  function atualizarUsuarioLocal(
    usuarioId,
    dados
  ) {
    setUsuarios(
      (anteriores) =>
        anteriores.map(
          (usuario) =>
            usuario.id ===
            usuarioId
              ? {
                  ...usuario,
                  ...dados,
                }
              : usuario
        )
    );
  }

  // =========================================================
  // FORMATAÇÕES
  // =========================================================

  function formatarCargo(
    cargo
  ) {
    const item =
      CARGOS.find(
        (cargoItem) =>
          cargoItem.value ===
          cargo
      );

    return (
      item?.label ||
      cargo
    );
  }

  function formatarPatio(patioId) {
    if (!patioId) {
      return "Todos os pátios";
    }

    const patio = patios.find(
      (item) => Number(item.id) === Number(patioId)
    );

    if (!patio) {
      return "Pátio não encontrado";
    }

    const local = [patio.cidade, patio.estado]
      .filter(Boolean)
      .join(" - ");

    return local
      ? `${patio.nome} (${local})`
      : patio.nome;
  }

  function formatarData(
    data
  ) {
    if (!data) {
      return "-";
    }

    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle:
          "short",

        timeStyle:
          "short",
      }
    ).format(
      new Date(data)
    );
  }

  // =========================================================
  // CARREGANDO
  // =========================================================

  if (carregando) {
    return (
      <>
        <PageHeader
          title="Administração"
          description="Usuários, permissões e controle de acesso."
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <p className="font-semibold text-slate-600">
            Carregando usuários...
          </p>

        </div>
      </>
    );
  }

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <>

      <PageHeader
        title="Administração"
        description="Gerencie usuários, cargos, permissões e acessos ao sistema."
      />

      {/* =====================================================
          MENSAGENS
      ====================================================== */}

      {erro && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

          <strong>
            Erro:
          </strong>{" "}

          {erro}

        </div>
      )}

      {mensagem && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">

          {mensagem}

        </div>
      )}

      {/* =====================================================
          CARDS
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm font-semibold text-slate-400">
            TOTAL DE USUÁRIOS
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {contadores.total}
          </p>

        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="text-sm font-semibold text-amber-600">
            AGUARDANDO APROVAÇÃO
          </p>

          <p className="mt-2 text-3xl font-black text-amber-700">
            {contadores.pendentes}
          </p>

        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">

          <p className="text-sm font-semibold text-green-600">
            USUÁRIOS ATIVOS
          </p>

          <p className="mt-2 text-3xl font-black text-green-700">
            {contadores.aprovados}
          </p>

        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

          <p className="text-sm font-semibold text-red-600">
            BLOQUEADOS
          </p>

          <p className="mt-2 text-3xl font-black text-red-700">
            {contadores.bloqueados}
          </p>

        </div>

      </div>

      {/* =====================================================
          FILTROS
      ====================================================== */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setFiltro(
                  "PENDENTE"
                )
              }
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                filtro ===
                "PENDENTE"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Pendentes
              {" "}
              ({contadores.pendentes})
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltro(
                  "APROVADO"
                )
              }
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                filtro ===
                "APROVADO"
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Ativos
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltro(
                  "BLOQUEADO"
                )
              }
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                filtro ===
                "BLOQUEADO"
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Bloqueados
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltro(
                  "TODOS"
                )
              }
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                filtro ===
                "TODOS"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos
            </button>

          </div>

          <input
            type="search"
            value={busca}
            onChange={(event) =>
              setBusca(
                event.target.value
              )
            }
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 lg:max-w-sm"
          />

        </div>

      </div>

      {/* =====================================================
          USUÁRIOS
      ====================================================== */}

      <div className="mt-6 space-y-5">

        {usuariosFiltrados.length ===
        0 ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-bold text-slate-700">
              Nenhum usuário encontrado.
            </p>

          </div>

        ) : (

          usuariosFiltrados.map(
            (usuario) => {

              const config =
                configuracoes[
                  usuario.id
                ] || {
                  cargo:
                    "SEM_CARGO",

                  permissoes:
                    [],

                  patio_id:
                    null,
                };

              const ehProprioUsuario =
                usuario.id ===
                usuarioAtualId;

              const salvando =
                salvandoId ===
                usuario.id;

              return (

                <div
                  key={
                    usuario.id
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >

                  {/* =========================================
                      CABEÇALHO DO USUÁRIO
                  ========================================== */}

                  <div className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h2 className="text-xl font-black text-slate-900">

                          {usuario.cargo ===
                          "MASTER"
                            ? "👑 "
                            : ""}

                          {usuario.nome ||
                            "Usuário"}

                        </h2>

                        {ehProprioUsuario && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                            Você
                          </span>
                        )}

                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {usuario.email}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Cadastro:{" "}
                        {formatarData(
                          usuario.created_at
                        )}
                      </p>

                    </div>

                    {/* STATUS */}

                    {usuario.status ===
                      "PENDENTE" && (

                      <span className="w-fit rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
                        ● Aguardando aprovação
                      </span>

                    )}

                    {usuario.status ===
                      "APROVADO" && (

                      <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                        ● Ativo
                      </span>

                    )}

                    {usuario.status ===
                      "BLOQUEADO" && (

                      <span className="w-fit rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
                        ● Bloqueado
                      </span>

                    )}

                  </div>

                  {/* =========================================
                      CONFIGURAÇÃO
                  ========================================== */}

                  <div className="p-6">

                    {/* CARGO */}

                    <div className="max-w-md">

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Cargo
                      </label>

                      <select
                        value={
                          config.cargo
                        }
                        disabled={
                          salvando ||
                          ehProprioUsuario
                        }
                        onChange={(
                          event
                        ) =>
                          alterarCargo(
                            usuario.id,
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-60"
                      >

                        {CARGOS.map(
                          (cargo) => (

                            <option
                              key={
                                cargo.value
                              }
                              value={
                                cargo.value
                              }
                            >
                              {
                                cargo.label
                              }
                            </option>

                          )
                        )}

                      </select>

                      {ehProprioUsuario && (
                        <p className="mt-2 text-xs text-slate-400">
                          Sua própria conta não pode ser alterada nesta tela.
                        </p>
                      )}

                    </div>

                    {/* PÁTIO - ADICIONADO SEM REMOVER AS CONFIGURAÇÕES EXISTENTES */}

                    <div className="mt-5 max-w-md">

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Pátio do usuário
                      </label>

                      {config.cargo === "MASTER" ? (
                        <>
                          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-semibold text-amber-800">
                            Todos os pátios
                          </div>

                          <p className="mt-2 text-xs text-slate-400">
                            Usuários MASTER possuem acesso global e não precisam ficar vinculados a um único pátio.
                          </p>
                        </>
                      ) : (
                        <>
                          <select
                            value={config.patio_id || ""}
                            disabled={
                              salvando ||
                              ehProprioUsuario
                            }
                            onChange={(event) =>
                              alterarPatio(
                                usuario.id,
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-60"
                          >
                            <option value="">
                              Selecione um pátio
                            </option>

                            {patios.map((patio) => (
                              <option
                                key={patio.id}
                                value={patio.id}
                              >
                                {patio.nome}
                                {patio.cidade
                                  ? ` - ${patio.cidade}`
                                  : ""}
                                {patio.estado
                                  ? `/${patio.estado}`
                                  : ""}
                              </option>
                            ))}
                          </select>

                          <p className="mt-2 text-xs text-slate-400">
                            Este vínculo será usado para separar os dados de cada unidade.
                          </p>
                        </>
                      )}

                    </div>

                    {/* =======================================
                        PERMISSÕES
                    ======================================== */}

                    <div className="mt-7">

                      <div>

                        <h3 className="font-black text-slate-800">
                          Permissões
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Defina quais partes do sistema este usuário poderá acessar.
                        </p>

                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

                        {PERMISSOES.map(
                          (
                            permissao
                          ) => {

                            const marcado =
                              config.permissoes.includes(
                                permissao.id
                              );

                            return (

                              <label
                                key={
                                  permissao.id
                                }
                                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                                  marcado
                                    ? "border-blue-300 bg-blue-50"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                              >

                                <input
                                  type="checkbox"
                                  checked={
                                    marcado
                                  }
                                  disabled={
                                    salvando ||
                                    ehProprioUsuario
                                  }
                                  onChange={() =>
                                    alterarPermissao(
                                      usuario.id,
                                      permissao.id
                                    )
                                  }
                                  className="mt-1 h-4 w-4 accent-blue-600"
                                />

                                <div>

                                  <p className="font-bold text-slate-700">
                                    {
                                      permissao.nome
                                    }
                                  </p>

                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {
                                      permissao.descricao
                                    }
                                  </p>

                                </div>

                              </label>

                            );

                          }
                        )}

                      </div>

                    </div>

                    {/* =======================================
                        BOTÕES
                    ======================================== */}

                    <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                      {/* PENDENTE */}

                      {usuario.status ===
                        "PENDENTE" && (

                        <>
                          <button
                            type="button"
                            disabled={
                              salvando
                            }
                            onClick={() =>
                              bloquearUsuario(
                                usuario
                              )
                            }
                            className="rounded-xl border border-red-300 bg-white px-5 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Bloquear cadastro
                          </button>

                          <button
                            type="button"
                            disabled={
                              salvando
                            }
                            onClick={() =>
                              aprovarUsuario(
                                usuario
                              )
                            }
                            className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {salvando
                              ? "Aprovando..."
                              : "Aprovar usuário"}
                          </button>
                        </>

                      )}

                      {/* ATIVO */}

                      {usuario.status ===
                        "APROVADO" &&
                        !ehProprioUsuario && (

                          <>
                            <button
                              type="button"
                              disabled={
                                salvando
                              }
                              onClick={() =>
                                bloquearUsuario(
                                  usuario
                                )
                              }
                              className="rounded-xl border border-red-300 bg-white px-5 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Bloquear usuário
                            </button>

                            <button
                              type="button"
                              disabled={
                                salvando
                              }
                              onClick={() =>
                                salvarUsuario(
                                  usuario
                                )
                              }
                              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                              {salvando
                                ? "Salvando..."
                                : "Salvar alterações"}
                            </button>
                          </>

                        )}

                      {/* BLOQUEADO */}

                      {usuario.status ===
                        "BLOQUEADO" && (

                        <button
                          type="button"
                          disabled={
                            salvando
                          }
                          onClick={() =>
                            reativarUsuario(
                              usuario
                            )
                          }
                          className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {salvando
                            ? "Reativando..."
                            : "Reativar usuário"}
                        </button>

                      )}

                      {/* APAGAR CONTA - SOMENTE MASTER */}

                      {ehMaster &&
                        !ehProprioUsuario && (

                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() =>
                            apagarConta(usuario)
                          }
                          className="rounded-xl bg-red-700 px-6 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {salvando
                            ? "Processando..."
                            : "Apagar conta"}
                        </button>

                      )}

                    </div>

                  </div>

                </div>

              );

            }
          )

        )}

      </div>

    </>
  );
}