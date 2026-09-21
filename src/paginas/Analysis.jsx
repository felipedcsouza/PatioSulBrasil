import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

// =======================================================
// TIPOS DE ANÁLISE
// =======================================================

const TIPOS_ANALISE = [
  "DOCUMENTAL",
  "CADASTRAL",
  "VEICULAR",
  "VISTORIA",
  "JURÍDICA",
  "ADMINISTRATIVA",
  "OUTRA",
];

// =======================================================
// DESTINOS APÓS A ANÁLISE
// =======================================================

const DESTINOS = [
  {
    valor: "PATIO",
    nome: "Voltar para o pátio",
  },

  {
    valor: "LIBERADO",
    nome: "Veículo liberado",
  },

  {
    valor: "LEILAO",
    nome: "Enviar para leilão",
  },

  {
    valor: "JUDICIAL",
    nome: "Retirada judicial",
  },

  {
    valor: "OUTRO_DESTINO",
    nome: "Outro destino",
  },
];

// =======================================================
// COMPONENTE
// =======================================================

export default function Analysis() {
  const {
    perfil,
    isMaster,
  } = useAuth();

  const [veiculos, setVeiculos] = useState([]);
  const [patios, setPatios] = useState([]);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("EM_ANALISE");

  const [patioFiltro, setPatioFiltro] = useState("TODOS");

  const [
    veiculoSelecionado,
    setVeiculoSelecionado,
  ] = useState(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [form, setForm] = useState({
    tipoAnalise: "",
    motivo: "",
    responsavel: "",
    resultado: "",
    destinoFinal: "PATIO",
    observacoes: "",
  });

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  useEffect(() => {
    if (!perfil) {
      return;
    }

    carregarDados();
  }, [perfil, isMaster]);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      // =================================================
      // USUÁRIO COMUM PRECISA ESTAR VINCULADO A UM PÁTIO
      // =================================================

      if (
        !isMaster &&
        !perfil?.patio_id
      ) {
        setVeiculos([]);
        setPatios([]);
        setErro(
          "Seu usuário ainda não está vinculado a um pátio. Peça ao administrador para definir sua unidade."
        );
        return;
      }

      let consultaVeiculos = supabase
        .from("veiculos")
        .select("*")
        .is("excluido_em", null)
        .or(
          [
            "destino_atual.eq.ANALISE",
            "status.eq.EM_ANALISE",
            "status.eq.ANALISE_CONCLUIDA",
          ].join(",")
        )
        .order("data_entrada", {
          ascending: false,
        });

      // =================================================
      // USUÁRIO COMUM: SOMENTE PÁTIO DELE
      // =================================================

      if (
        !isMaster &&
        perfil?.patio_id
      ) {
        consultaVeiculos =
          consultaVeiculos.eq(
            "patio_id",
            perfil.patio_id
          );
      }

      let consultaPatios = supabase
        .from("patios")
        .select(
          "id, nome, cidade, estado, ativo"
        )
        .order("nome");

      // Usuário comum só precisa receber os dados do próprio pátio.
      if (
        !isMaster &&
        perfil?.patio_id
      ) {
        consultaPatios =
          consultaPatios.eq(
            "id",
            perfil.patio_id
          );
      }

      const [
        {
          data: veiculosData,
          error: veiculosError,
        },

        {
          data: patiosData,
          error: patiosError,
        },
      ] = await Promise.all([
        consultaVeiculos,
        consultaPatios,
      ]);

      if (veiculosError) {
        throw veiculosError;
      }

      if (patiosError) {
        console.error(
          "Erro ao carregar pátios:",
          patiosError
        );
      }

      setVeiculos(
        veiculosData || []
      );

      setPatios(
        patiosData || []
      );
    } catch (error) {
      console.error(
        "Erro ao carregar análise:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os veículos em análise."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // NOME DO PÁTIO
  // =====================================================

  function nomePatio(patioId) {
    const patio = patios.find(
      (item) =>
        String(item.id) === String(patioId)
    );

    if (!patio) {
      return "Pátio não informado";
    }

    return patio.nome;
  }

  // =====================================================
  // VALIDAR ACESSO AO VEÍCULO PELO PÁTIO
  // =====================================================

  function usuarioPodeAcessarVeiculo(veiculo) {
    if (isMaster) {
      return true;
    }

    if (!perfil?.patio_id) {
      setErro(
        "Seu usuário ainda não está vinculado a um pátio."
      );
      return false;
    }

    if (
      String(veiculo?.patio_id) !==
      String(perfil.patio_id)
    ) {
      setErro(
        "Você não tem permissão para acessar um veículo de outro pátio."
      );
      return false;
    }

    return true;
  }

  // =====================================================
  // FORMATAR DATA
  // =====================================================

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

  // =====================================================
  // FILTRAGEM
  // =====================================================

  const veiculosFiltrados = useMemo(() => {
    const termo = pesquisa
      .trim()
      .toLowerCase();

    return veiculos.filter((veiculo) => {
      const concluida =
        veiculo.status ===
        "ANALISE_CONCLUIDA";

      if (
        filtro === "EM_ANALISE" &&
        concluida
      ) {
        return false;
      }

      if (
        filtro === "CONCLUIDAS" &&
        !concluida
      ) {
        return false;
      }

      if (
        isMaster &&
        patioFiltro !== "TODOS" &&
        String(
          veiculo.patio_id
        ) !== String(
          patioFiltro
        )
      ) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const texto = [
        veiculo.placa,
        veiculo.marca,
        veiculo.modelo,
        veiculo.renavam,
        veiculo.chassi,
        veiculo.proprietario,
        veiculo.analise_tipo,
        veiculo.analise_motivo,
        veiculo.analise_responsavel,
        veiculo.analise_resultado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(
        termo
      );
    });
  }, [
    veiculos,
    pesquisa,
    filtro,
    patioFiltro,
    isMaster,
  ]);

  // =====================================================
  // CONTADORES
  // =====================================================

  const totalEmAnalise =
    veiculos.filter(
      (veiculo) =>
        veiculo.status !==
        "ANALISE_CONCLUIDA"
    ).length;

  const totalConcluidas =
    veiculos.filter(
      (veiculo) =>
        veiculo.status ===
        "ANALISE_CONCLUIDA"
    ).length;

  // =====================================================
  // ABRIR VEÍCULO
  // =====================================================

  function abrirVeiculo(
    veiculo
  ) {
    setVeiculoSelecionado(
      veiculo
    );

    setForm({
      tipoAnalise:
        veiculo.analise_tipo ||
        "",

      motivo:
        veiculo.analise_motivo ||
        "",

      responsavel:
        veiculo.analise_responsavel ||
        "",

      resultado:
        veiculo.analise_resultado ||
        "",

      destinoFinal:
        "PATIO",

      observacoes:
        veiculo.analise_observacoes ||
        "",
    });

    setErro("");
    setMensagem("");
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setVeiculoSelecionado(
      null
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
      (anterior) => ({
        ...anterior,
        [name]: value,
      })
    );
  }

  // =====================================================
  // SALVAR ANÁLISE
  // =====================================================

  async function salvarAnalise() {
    if (
      !veiculoSelecionado
    ) {
      return;
    }

    setErro("");
    setMensagem("");

    if (
      !usuarioPodeAcessarVeiculo(
        veiculoSelecionado
      )
    ) {
      return;
    }

    if (!form.tipoAnalise) {
      setErro(
        "Selecione o tipo da análise."
      );

      return;
    }

    if (
      !form.motivo.trim()
    ) {
      setErro(
        "Informe o motivo da análise."
      );

      return;
    }

    if (
      !form.responsavel.trim()
    ) {
      setErro(
        "Informe o responsável pela análise."
      );

      return;
    }

    try {
      setSalvando(true);

      const agora =
        new Date().toISOString();

      const dados = {
        analise_tipo:
          form.tipoAnalise,

        analise_motivo:
          form.motivo.trim(),

        analise_responsavel:
          form.responsavel.trim(),

        analise_resultado:
          form.resultado.trim() ||
          null,

        analise_observacoes:
          form.observacoes.trim() ||
          null,

        analise_data_inicio:
          veiculoSelecionado.analise_data_inicio ||
          agora,

        destino_atual:
          "ANALISE",

        status:
          "EM_ANALISE",
      };

      let consultaAtualizacao = supabase
        .from("veiculos")
        .update(dados)
        .eq(
          "id",
          veiculoSelecionado.id
        );

      // Usuário comum só pode alterar veículo do próprio pátio.
      if (!isMaster) {
        consultaAtualizacao =
          consultaAtualizacao.eq(
            "patio_id",
            perfil.patio_id
          );
      }

      const {
        error: updateError,
      } = await consultaAtualizacao;

      if (updateError) {
        throw updateError;
      }

      setMensagem(
        "Análise salva com sucesso."
      );

      await carregarDados();

      setVeiculoSelecionado(
        (anterior) => ({
          ...anterior,
          ...dados,
        })
      );
    } catch (error) {
      console.error(
        "Erro ao salvar análise:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível salvar a análise."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =====================================================
  // MAPEAR DESTINO FINAL
  // =====================================================

  function dadosDestinoFinal(
    destino
  ) {
    switch (destino) {
      case "PATIO":
        return {
          destino_atual:
            "PATIO",

          status:
            "EM_PATIO",
        };

      case "LIBERADO":
        return {
          destino_atual:
            "LIBERADO",

          status:
            "LIBERADO",
        };

      case "LEILAO":
        return {
          destino_atual:
            "LEILAO",

          status:
            "AGUARDANDO_LEILAO",
        };

      case "JUDICIAL":
        return {
          destino_atual:
            "JUDICIAL",

          status:
            "AGUARDANDO_RETIRADA_JUDICIAL",
        };

      case "OUTRO_DESTINO":
        return {
          destino_atual:
            "OUTRO_DESTINO",

          status:
            "OUTRO_DESTINO",
        };

      default:
        return {
          destino_atual:
            "PATIO",

          status:
            "EM_PATIO",
        };
    }
  }

  // =====================================================
  // CONCLUIR ANÁLISE
  // =====================================================

  async function concluirAnalise() {
    if (
      !veiculoSelecionado
    ) {
      return;
    }

    setErro("");
    setMensagem("");

    if (
      !usuarioPodeAcessarVeiculo(
        veiculoSelecionado
      )
    ) {
      return;
    }

    if (!form.tipoAnalise) {
      setErro(
        "Selecione o tipo da análise."
      );

      return;
    }

    if (
      !form.motivo.trim()
    ) {
      setErro(
        "Informe o motivo da análise."
      );

      return;
    }

    if (
      !form.responsavel.trim()
    ) {
      setErro(
        "Informe o responsável pela análise."
      );

      return;
    }

    if (
      !form.resultado.trim()
    ) {
      setErro(
        "Informe o resultado da análise."
      );

      return;
    }

    if (
      !form.destinoFinal
    ) {
      setErro(
        "Selecione o destino do veículo após a análise."
      );

      return;
    }

    const destinoSelecionado =
      DESTINOS.find(
        (item) =>
          item.valor ===
          form.destinoFinal
      );

    const confirmou =
      window.confirm(
        `Deseja concluir a análise do veículo ${veiculoSelecionado.placa} e encaminhá-lo para "${destinoSelecionado?.nome}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);

      const agora =
        new Date().toISOString();

      const destino =
        dadosDestinoFinal(
          form.destinoFinal
        );

      const dados = {
        analise_tipo:
          form.tipoAnalise,

        analise_motivo:
          form.motivo.trim(),

        analise_responsavel:
          form.responsavel.trim(),

        analise_resultado:
          form.resultado.trim(),

        analise_observacoes:
          form.observacoes.trim() ||
          null,

        analise_data_inicio:
          veiculoSelecionado.analise_data_inicio ||
          agora,

        analise_data_conclusao:
          agora,

        destino_atual:
          destino.destino_atual,

        status:
          destino.status,
      };

      // ===============================================
      // ATUALIZAR VEÍCULO
      // ===============================================

      let consultaAtualizacao = supabase
        .from("veiculos")
        .update(dados)
        .eq(
          "id",
          veiculoSelecionado.id
        );

      // Usuário comum só pode alterar veículo do próprio pátio.
      if (!isMaster) {
        consultaAtualizacao =
          consultaAtualizacao.eq(
            "patio_id",
            perfil.patio_id
          );
      }

      const {
        error: updateError,
      } = await consultaAtualizacao;

      if (updateError) {
        throw updateError;
      }

      // ===============================================
      // REGISTRAR MOVIMENTAÇÃO
      // ===============================================

      const descricao = [
        "Análise de veículo concluída.",

        `Placa: ${
          veiculoSelecionado.placa ||
          "-"
        }.`,

        `Tipo: ${
          form.tipoAnalise
        }.`,

        `Responsável: ${
          form.responsavel.trim()
        }.`,

        `Resultado: ${
          form.resultado.trim()
        }.`,

        `Destino após análise: ${
          destinoSelecionado?.nome ||
          form.destinoFinal
        }.`,
      ].join(" ");

      const {
        error:
          movimentacaoError,
      } = await supabase
        .from(
          "movimentacoes"
        )
        .insert({
          veiculo_id:
            veiculoSelecionado.id,

          tipo:
            "ANALISE",

          descricao,
        });

      if (
        movimentacaoError
      ) {
        console.error(
          "Análise concluída, mas houve erro ao registrar movimentação:",
          movimentacaoError
        );
      }

      setMensagem(
        `Análise do veículo ${veiculoSelecionado.placa} concluída com sucesso.`
      );

      setVeiculoSelecionado(
        null
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao concluir análise:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível concluir a análise."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =====================================================
  // CARREGANDO
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Carregando análises...
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

        {/* =============================================
            CABEÇALHO
        ============================================== */}

        <div className="mb-7">

          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Operação
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Análise de Veículos
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Controle os veículos que precisam
            passar por análise antes da definição
            do próximo destino.
          </p>

          <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            🏢 Acesso: {isMaster
              ? "Todos os pátios"
              : nomePatio(perfil?.patio_id)}
          </div>

        </div>

        {/* =============================================
            MENSAGENS
        ============================================== */}

        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            {mensagem}
          </div>
        )}

        {/* =============================================
            RESUMO
        ============================================== */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-semibold text-slate-500">
              Total
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {veiculos.length}
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setFiltro(
                "EM_ANALISE"
              )
            }
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              filtro ===
              "EM_ANALISE"
                ? "border-blue-300 bg-blue-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >

            <p className="text-sm font-bold text-amber-700">
              Em análise
            </p>

            <p className="mt-2 text-3xl font-black text-amber-700">
              {totalEmAnalise}
            </p>

          </button>

          <button
            type="button"
            onClick={() =>
              setFiltro(
                "CONCLUIDAS"
              )
            }
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              filtro ===
              "CONCLUIDAS"
                ? "border-blue-300 bg-blue-50"
                : "border-green-200 bg-green-50"
            }`}
          >

            <p className="text-sm font-bold text-green-700">
              Concluídas
            </p>

            <p className="mt-2 text-3xl font-black text-green-700">
              {totalConcluidas}
            </p>

          </button>

        </div>

        {/* =============================================
            PESQUISA
        ============================================== */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div
            className={`grid gap-4 ${
              isMaster
                ? "lg:grid-cols-[1fr_220px_220px]"
                : "lg:grid-cols-[1fr_220px]"
            }`}
          >

            <div className="relative">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                type="text"
                value={
                  pesquisa
                }
                onChange={(event) =>
                  setPesquisa(
                    event.target.value
                  )
                }
                placeholder="Pesquisar placa, veículo, proprietário, responsável..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <select
              value={
                filtro
              }
              onChange={(event) =>
                setFiltro(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none"
            >

              <option value="EM_ANALISE">
                Em análise
              </option>

              <option value="CONCLUIDAS">
                Concluídas
              </option>

              <option value="TODOS">
                Todos
              </option>

            </select>

            {/* MASTER ESCOLHE PÁTIO */}

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
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none"
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

        {/* =============================================
            LISTAGEM
        ============================================== */}

        {veiculosFiltrados.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="text-5xl">
              🔎
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              Nenhum veículo encontrado
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Não existem veículos nessa situação.
            </p>

          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">

            {veiculosFiltrados.map(
              (veiculo) => {
                const concluida =
                  veiculo.status ===
                  "ANALISE_CONCLUIDA";

                return (
                  <div
                    key={
                      veiculo.id
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >

                    {/* CABEÇALHO */}

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h2 className="text-xl font-black uppercase text-slate-900">
                            {veiculo.placa ||
                              "SEM PLACA"}
                          </h2>

                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                              concluida
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {concluida
                              ? "CONCLUÍDA"
                              : "EM ANÁLISE"}
                          </span>

                        </div>

                        <p className="mt-1 font-semibold text-slate-700">
                          {veiculo.marca ||
                            ""}
                          {" "}
                          {veiculo.modelo ||
                            ""}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {nomePatio(
                            veiculo.patio_id
                          )}
                        </p>

                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                        🔎
                      </div>

                    </div>

                    {/* INFORMAÇÕES */}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Proprietário
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.proprietario ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Tipo da análise
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.analise_tipo ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Responsável
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.analise_responsavel ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Início
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatarData(
                            veiculo.analise_data_inicio
                          )}
                        </p>

                      </div>

                    </div>

                    {concluida &&
                      veiculo.analise_resultado && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                          <p className="text-xs font-black uppercase text-green-600">
                            Resultado
                          </p>

                          <p className="mt-1 text-sm font-semibold text-green-800">
                            {
                              veiculo.analise_resultado
                            }
                          </p>

                        </div>
                      )}

                    <button
                      type="button"
                      onClick={() =>
                        abrirVeiculo(
                          veiculo
                        )
                      }
                      className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black transition ${
                        concluida
                          ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {concluida
                        ? "Ver análise"
                        : "Realizar análise"}
                    </button>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* ===============================================
          MODAL
      ================================================ */}

      {veiculoSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* CABEÇALHO */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Análise de veículo
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {
                    veiculoSelecionado.placa
                  }
                  {" - "}
                  {
                    veiculoSelecionado.marca
                  }
                  {" "}
                  {
                    veiculoSelecionado.modelo
                  }
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  fecharModal
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>

            </div>

            <div className="p-6">

              {/* DADOS DO VEÍCULO */}

              <div className="mb-6 rounded-2xl bg-slate-50 p-4">

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <div>

                    <p className="text-xs font-black uppercase text-slate-400">
                      Placa
                    </p>

                    <p className="mt-1 font-black uppercase text-slate-800">
                      {
                        veiculoSelecionado.placa
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs font-black uppercase text-slate-400">
                      RENAVAM
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {
                        veiculoSelecionado.renavam ||
                        "-"
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs font-black uppercase text-slate-400">
                      Proprietário
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {
                        veiculoSelecionado.proprietario ||
                        "-"
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs font-black uppercase text-slate-400">
                      Pátio
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {nomePatio(
                        veiculoSelecionado.patio_id
                      )}
                    </p>

                  </div>

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

              {/* =========================================
                  DADOS DA ANÁLISE
              ========================================== */}

              <div>

                <h3 className="text-lg font-black text-slate-900">
                  Dados da análise
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Informe o motivo e o responsável
                  pelo procedimento.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Tipo da análise *
                    </label>

                    <select
                      name="tipoAnalise"
                      value={
                        form.tipoAnalise
                      }
                      onChange={
                        alterarCampo
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                    >

                      <option value="">
                        Selecione
                      </option>

                      {TIPOS_ANALISE.map(
                        (tipo) => (
                          <option
                            key={
                              tipo
                            }
                            value={
                              tipo
                            }
                          >
                            {tipo}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Responsável pela análise *
                    </label>

                    <input
                      type="text"
                      name="responsavel"
                      value={
                        form.responsavel
                      }
                      onChange={
                        alterarCampo
                      }
                      placeholder="Nome do responsável"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                  </div>

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Motivo da análise *
                    </label>

                    <textarea
                      name="motivo"
                      value={
                        form.motivo
                      }
                      onChange={
                        alterarCampo
                      }
                      rows={3}
                      placeholder="Explique por que o veículo foi enviado para análise..."
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                  </div>

                </div>

              </div>

              {/* =========================================
                  RESULTADO
              ========================================== */}

              <div className="mt-8 border-t border-slate-200 pt-6">

                <h3 className="text-lg font-black text-slate-900">
                  Resultado da análise
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Preencha quando houver uma conclusão.
                </p>

                <div className="mt-5">

                  <textarea
                    name="resultado"
                    value={
                      form.resultado
                    }
                    onChange={
                      alterarCampo
                    }
                    rows={4}
                    placeholder="Informe o resultado final da análise..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />

                </div>

              </div>

              {/* =========================================
                  DESTINO APÓS ANÁLISE
              ========================================== */}

              <div className="mt-8 border-t border-slate-200 pt-6">

                <h3 className="text-lg font-black text-slate-900">
                  Destino após a análise
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Escolha para onde o veículo deverá
                  seguir após a conclusão.
                </p>

                <select
                  name="destinoFinal"
                  value={
                    form.destinoFinal
                  }
                  onChange={
                    alterarCampo
                  }
                  className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                >

                  {DESTINOS.map(
                    (destino) => (
                      <option
                        key={
                          destino.valor
                        }
                        value={
                          destino.valor
                        }
                      >
                        {destino.nome}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* =========================================
                  OBSERVAÇÕES
              ========================================== */}

              <div className="mt-7">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observações
                </label>

                <textarea
                  name="observacoes"
                  value={
                    form.observacoes
                  }
                  onChange={
                    alterarCampo
                  }
                  rows={4}
                  placeholder="Informações adicionais, documentos conferidos, pendências..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              {/* =========================================
                  DATAS
              ========================================== */}

              {veiculoSelecionado.analise_data_inicio && (
                <div className="mt-7 grid gap-4 sm:grid-cols-2">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-black uppercase text-slate-400">
                      Início da análise
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatarData(
                        veiculoSelecionado.analise_data_inicio
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-black uppercase text-slate-400">
                      Conclusão
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatarData(
                        veiculoSelecionado.analise_data_conclusao
                      )}
                    </p>

                  </div>

                </div>
              )}

              {/* =========================================
                  BOTÕES
              ========================================== */}

              <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    fecharModal
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={
                    salvarAnalise
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar análise"}
                </button>

                <button
                  type="button"
                  onClick={
                    concluirAnalise
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {salvando
                    ? "Processando..."
                    : "✓ Concluir análise"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}