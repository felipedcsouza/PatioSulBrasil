import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";

// =======================================================
// STATUS DO LEILÃO
// =======================================================

const STATUS_LEILAO = {
  AGUARDANDO_LEILAO: {
    nome: "Aguardando leilão",
    classe:
      "bg-amber-100 text-amber-700 border-amber-200",
  },

  LIBERADO_LEILAO: {
    nome: "Liberado para leilão",
    classe:
      "bg-blue-100 text-blue-700 border-blue-200",
  },

  ARREMATADO: {
    nome: "Arrematado",
    classe:
      "bg-purple-100 text-purple-700 border-purple-200",
  },

  RETIRADO_LEILAO: {
    nome: "Retirado",
    classe:
      "bg-green-100 text-green-700 border-green-200",
  },
};

// =======================================================
// COMPONENTE
// =======================================================

export default function AuctionRelease() {
  const [veiculos, setVeiculos] = useState([]);
  const [patios, setPatios] = useState([]);

  // Controle de acesso por pátio
  const [perfilAtual, setPerfilAtual] = useState(null);

  const ehMaster =
    perfilAtual?.cargo === "MASTER" &&
    perfilAtual?.status === "APROVADO";

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [pesquisa, setPesquisa] = useState("");

  const [filtro, setFiltro] = useState(
    "AGUARDANDO_LEILAO"
  );

  const [
    veiculoSelecionado,
    setVeiculoSelecionado,
  ] = useState(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] =
    useState("");

  const [form, setForm] = useState({
    lote: "",
    dataLeilao: "",
    valor: "",

    arrematanteNome: "",
    arrematanteDocumento: "",

    responsavelRetirada: "",
    documentoRetirada: "",

    observacoes: "",
  });

  // =====================================================
  // CARREGAR
  // =====================================================

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      // =================================================
      // USUÁRIO LOGADO E PÁTIO VINCULADO
      // =================================================

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

      const {
        data: perfilData,
        error: perfilError,
      } = await supabase
        .from("profiles")
        .select(
          "id, cargo, status, patio_id"
        )
        .eq("id", usuarioLogado.id)
        .single();

      if (perfilError) {
        throw perfilError;
      }

      setPerfilAtual(perfilData);

      const usuarioEhMaster =
        perfilData?.cargo === "MASTER" &&
        perfilData?.status === "APROVADO";

      const patioUsuarioId =
        perfilData?.patio_id ?? null;

      if (
        !usuarioEhMaster &&
        !patioUsuarioId
      ) {
        setVeiculos([]);
        setPatios([]);
        setErro(
          "Seu usuário ainda não possui um pátio vinculado. Solicite ao administrador que defina seu pátio de acesso."
        );
        return;
      }

      // =================================================
      // VEÍCULOS - MASTER VÊ TODOS; DEMAIS SÓ SEU PÁTIO
      // =================================================

      let veiculosQuery = supabase
        .from("veiculos")
        .select("*")
        .is("excluido_em", null)
        .or(
          [
            "destino_atual.eq.LEILAO",
            "status.eq.AGUARDANDO_LEILAO",
            "status.eq.LIBERADO_LEILAO",
            "status.eq.ARREMATADO",
            "status.eq.RETIRADO_LEILAO",
          ].join(",")
        );

      if (!usuarioEhMaster) {
        veiculosQuery =
          veiculosQuery.eq(
            "patio_id",
            patioUsuarioId
          );
      }

      veiculosQuery =
        veiculosQuery.order(
          "data_entrada",
          {
            ascending: false,
          }
        );

      let patiosQuery = supabase
        .from("patios")
        .select(
          "id, nome, cidade, estado"
        );

      if (!usuarioEhMaster) {
        patiosQuery =
          patiosQuery.eq(
            "id",
            patioUsuarioId
          );
      }

      patiosQuery =
        patiosQuery.order("nome");

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
        veiculosQuery,
        patiosQuery,
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

      setVeiculos(veiculosData || []);
      setPatios(patiosData || []);
    } catch (error) {
      console.error(
        "Erro ao carregar leilões:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os veículos destinados ao leilão."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PÁTIO
  // =====================================================

  function nomePatio(patioId) {
    const patio = patios.find(
      (item) =>
        Number(item.id) ===
        Number(patioId)
    );

    if (!patio) {
      return "Pátio não informado";
    }

    return patio.nome;
  }

  function podeAcessarVeiculo(veiculo) {
    if (ehMaster) {
      return true;
    }

    return (
      Number(veiculo?.patio_id) ===
      Number(perfilAtual?.patio_id)
    );
  }

  function nomePatioAcesso() {
    if (ehMaster) {
      return "Todos os pátios";
    }

    return nomePatio(
      perfilAtual?.patio_id
    );
  }

  // =====================================================
  // STATUS
  // =====================================================

  function dadosStatus(status) {
    return (
      STATUS_LEILAO[status] || {
        nome: status || "Não informado",
        classe:
          "bg-slate-100 text-slate-600 border-slate-200",
      }
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
      // Segurança adicional no frontend:
      // usuário comum só visualiza veículos do próprio pátio.
      if (!podeAcessarVeiculo(veiculo)) {
        return false;
      }

      if (
        filtro !== "TODOS" &&
        veiculo.status !== filtro
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
        veiculo.lote_leilao,
        veiculo.leilao_arrematante_nome,
        veiculo.leilao_responsavel_retirada,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [
    veiculos,
    pesquisa,
    filtro,
    perfilAtual,
    ehMaster,
  ]);

  // =====================================================
  // CONTADORES
  // =====================================================

  const totalAguardando =
    veiculos.filter(
      (item) =>
        item.status ===
        "AGUARDANDO_LEILAO"
    ).length;

  const totalLiberados =
    veiculos.filter(
      (item) =>
        item.status ===
        "LIBERADO_LEILAO"
    ).length;

  const totalArrematados =
    veiculos.filter(
      (item) =>
        item.status ===
        "ARREMATADO"
    ).length;

  const totalRetirados =
    veiculos.filter(
      (item) =>
        item.status ===
        "RETIRADO_LEILAO"
    ).length;

  // =====================================================
  // ABRIR VEÍCULO
  // =====================================================

  function abrirVeiculo(veiculo) {
    if (!podeAcessarVeiculo(veiculo)) {
      setErro(
        "Você não possui acesso a veículos de outro pátio."
      );
      return;
    }

    setVeiculoSelecionado(veiculo);

    setForm({
      lote:
        veiculo.lote_leilao || "",

      dataLeilao:
        veiculo.data_leilao || "",

      valor:
        veiculo.leilao_valor != null
          ? String(
              veiculo.leilao_valor
            )
          : "",

      arrematanteNome:
        veiculo.leilao_arrematante_nome ||
        "",

      arrematanteDocumento:
        veiculo.leilao_arrematante_documento ||
        "",

      responsavelRetirada:
        veiculo.leilao_responsavel_retirada ||
        "",

      documentoRetirada:
        veiculo.leilao_documento_retirada ||
        "",

      observacoes:
        veiculo.leilao_observacoes ||
        "",
    });

    setErro("");
    setMensagem("");
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setVeiculoSelecionado(null);
  }

  function alterarCampo(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  // =====================================================
  // CONVERTER VALOR
  // =====================================================

  function converterValor(valor) {
    if (!valor) {
      return null;
    }

    const normalizado = String(valor)
      .replace(/\./g, "")
      .replace(",", ".");

    const numero =
      Number(normalizado);

    if (
      Number.isNaN(numero)
    ) {
      return null;
    }

    return numero;
  }

  // =====================================================
  // SALVAR DADOS
  // =====================================================

  async function salvarInformacoes() {
    if (!veiculoSelecionado) {
      return;
    }

    if (!podeAcessarVeiculo(
      veiculoSelecionado
    )) {
      setErro(
        "Você não possui acesso para alterar veículos de outro pátio."
      );
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const dados = {
        lote_leilao:
          form.lote.trim() || null,

        data_leilao:
          form.dataLeilao || null,

        leilao_valor:
          converterValor(
            form.valor
          ),

        leilao_arrematante_nome:
          form.arrematanteNome.trim() ||
          null,

        leilao_arrematante_documento:
          form.arrematanteDocumento.trim() ||
          null,

        leilao_responsavel_retirada:
          form.responsavelRetirada.trim() ||
          null,

        leilao_documento_retirada:
          form.documentoRetirada.trim() ||
          null,

        leilao_observacoes:
          form.observacoes.trim() ||
          null,

        destino_atual:
          "LEILAO",
      };

      let updateQuery = supabase
        .from("veiculos")
        .update(dados)
        .eq(
          "id",
          veiculoSelecionado.id
        );

      if (!ehMaster) {
        updateQuery =
          updateQuery.eq(
            "patio_id",
            perfilAtual?.patio_id
          );
      }

      const { error } =
        await updateQuery;

      if (error) {
        throw error;
      }

      setMensagem(
        "Informações do leilão salvas com sucesso."
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
        "Erro ao salvar leilão:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível salvar as informações do leilão."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =====================================================
  // ATUALIZAR STATUS
  // =====================================================

  async function atualizarStatus(
    novoStatus
  ) {
    if (!veiculoSelecionado) {
      return;
    }

    if (!podeAcessarVeiculo(
      veiculoSelecionado
    )) {
      setErro(
        "Você não possui acesso para alterar veículos de outro pátio."
      );
      return;
    }

    setErro("");
    setMensagem("");

    // ---------------------------------------------------
    // LIBERAR PARA LEILÃO
    // ---------------------------------------------------

    if (
      novoStatus ===
        "LIBERADO_LEILAO" &&
      !form.lote.trim()
    ) {
      setErro(
        "Informe o lote do leilão."
      );

      return;
    }

    // ---------------------------------------------------
    // ARREMATADO
    // ---------------------------------------------------

    if (
      novoStatus ===
      "ARREMATADO"
    ) {
      if (
        !form.arrematanteNome.trim()
      ) {
        setErro(
          "Informe o nome do arrematante."
        );

        return;
      }

      if (
        !form.arrematanteDocumento.trim()
      ) {
        setErro(
          "Informe o documento do arrematante."
        );

        return;
      }
    }

    // ---------------------------------------------------
    // RETIRADA FINAL
    // ---------------------------------------------------

    if (
      novoStatus ===
      "RETIRADO_LEILAO"
    ) {
      if (
        !form.responsavelRetirada.trim()
      ) {
        setErro(
          "Informe quem está retirando o veículo."
        );

        return;
      }

      if (
        !form.documentoRetirada.trim()
      ) {
        setErro(
          "Informe o documento de quem está retirando o veículo."
        );

        return;
      }
    }

    const configuracao =
      dadosStatus(novoStatus);

    const confirmou =
      window.confirm(
        `Deseja alterar o veículo ${veiculoSelecionado.placa} para "${configuracao.nome}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);

      const agora =
        new Date().toISOString();

      const dados = {
        lote_leilao:
          form.lote.trim() || null,

        data_leilao:
          form.dataLeilao || null,

        leilao_valor:
          converterValor(
            form.valor
          ),

        leilao_arrematante_nome:
          form.arrematanteNome.trim() ||
          null,

        leilao_arrematante_documento:
          form.arrematanteDocumento.trim() ||
          null,

        leilao_responsavel_retirada:
          form.responsavelRetirada.trim() ||
          null,

        leilao_documento_retirada:
          form.documentoRetirada.trim() ||
          null,

        leilao_observacoes:
          form.observacoes.trim() ||
          null,

        destino_atual:
          "LEILAO",

        status:
          novoStatus,
      };

      if (
        novoStatus ===
        "RETIRADO_LEILAO"
      ) {
        dados.leilao_data_retirada =
          agora;
      }

      let updateQuery = supabase
        .from("veiculos")
        .update(dados)
        .eq(
          "id",
          veiculoSelecionado.id
        );

      if (!ehMaster) {
        updateQuery =
          updateQuery.eq(
            "patio_id",
            perfilAtual?.patio_id
          );
      }

      const {
        error: updateError,
      } = await updateQuery;

      if (updateError) {
        throw updateError;
      }

      // =================================================
      // MOVIMENTAÇÃO
      // =================================================

      let descricao = "";

      if (
        novoStatus ===
        "LIBERADO_LEILAO"
      ) {
        descricao =
          `Veículo liberado para leilão. ` +
          `Placa: ${veiculoSelecionado.placa}. ` +
          `Lote: ${
            form.lote.trim() || "-"
          }.`;
      }

      if (
        novoStatus ===
        "ARREMATADO"
      ) {
        descricao =
          `Veículo arrematado em leilão. ` +
          `Placa: ${veiculoSelecionado.placa}. ` +
          `Arrematante: ${form.arrematanteNome.trim()}.`;
      }

      if (
        novoStatus ===
        "RETIRADO_LEILAO"
      ) {
        descricao =
          `Saída definitiva do veículo por leilão. ` +
          `Placa: ${veiculoSelecionado.placa}. ` +
          `Responsável pela retirada: ${form.responsavelRetirada.trim()}. ` +
          `Documento: ${form.documentoRetirada.trim()}.`;
      }

      if (descricao) {
        const tipo =
          novoStatus ===
          "RETIRADO_LEILAO"
            ? "SAIDA"
            : "LEILAO";

        const {
          error: movimentacaoError,
        } = await supabase
          .from("movimentacoes")
          .insert({
            veiculo_id:
              veiculoSelecionado.id,

            tipo,

            descricao,
          });

        if (
          movimentacaoError
        ) {
          console.error(
            "Erro ao registrar movimentação:",
            movimentacaoError
          );
        }
      }

      setMensagem(
        `Veículo alterado para "${configuracao.nome}" com sucesso.`
      );

      setVeiculoSelecionado(
        null
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao atualizar leilão:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível atualizar o veículo."
      );
    } finally {
      setSalvando(false);
    }
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

  function formatarValor(valor) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "-";
    }

    return Number(
      valor
    ).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
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
            Carregando leilões...
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

        {/* ===============================================
            CABEÇALHO
        ================================================ */}

        <div className="mb-7">

          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Operação
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Saída para Leilão
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Controle todo o processo dos veículos
            destinados ao leilão, desde a liberação
            até a retirada definitiva do pátio.
          </p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
            <span>🏢</span>
            <span>
              Acesso: {nomePatioAcesso()}
            </span>
          </div>

        </div>

        {/* ===============================================
            MENSAGENS
        ================================================ */}

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

        {/* ===============================================
            RESUMO
        ================================================ */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <button
            type="button"
            onClick={() =>
              setFiltro(
                "AGUARDANDO_LEILAO"
              )
            }
            className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm font-bold text-amber-700">
              Aguardando
            </p>

            <p className="mt-2 text-3xl font-black text-amber-700">
              {totalAguardando}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltro(
                "LIBERADO_LEILAO"
              )
            }
            className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm font-bold text-blue-700">
              Liberados
            </p>

            <p className="mt-2 text-3xl font-black text-blue-700">
              {totalLiberados}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltro(
                "ARREMATADO"
              )
            }
            className="rounded-2xl border border-purple-200 bg-purple-50 p-5 text-left shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm font-bold text-purple-700">
              Arrematados
            </p>

            <p className="mt-2 text-3xl font-black text-purple-700">
              {totalArrematados}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltro(
                "RETIRADO_LEILAO"
              )
            }
            className="rounded-2xl border border-green-200 bg-green-50 p-5 text-left shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm font-bold text-green-700">
              Retirados
            </p>

            <p className="mt-2 text-3xl font-black text-green-700">
              {totalRetirados}
            </p>
          </button>

        </div>

        {/* ===============================================
            PESQUISA E FILTRO
        ================================================ */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid gap-4 lg:grid-cols-[1fr_230px]">

            <div className="relative">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                type="text"
                value={pesquisa}
                onChange={(event) =>
                  setPesquisa(
                    event.target.value
                  )
                }
                placeholder="Pesquisar placa, lote, proprietário ou arrematante..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <select
              value={filtro}
              onChange={(event) =>
                setFiltro(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none"
            >
              <option value="AGUARDANDO_LEILAO">
                Aguardando leilão
              </option>

              <option value="LIBERADO_LEILAO">
                Liberados
              </option>

              <option value="ARREMATADO">
                Arrematados
              </option>

              <option value="RETIRADO_LEILAO">
                Retirados
              </option>

              <option value="TODOS">
                Todos
              </option>

            </select>

          </div>

        </div>

        {/* ===============================================
            VEÍCULOS
        ================================================ */}

        {veiculosFiltrados.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="text-5xl">
              ⚖
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              Nenhum veículo encontrado
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Não existem veículos nessa etapa
              do leilão.
            </p>

          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">

            {veiculosFiltrados.map(
              (veiculo) => {
                const status =
                  dadosStatus(
                    veiculo.status
                  );

                return (
                  <div
                    key={veiculo.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h2 className="text-xl font-black uppercase text-slate-900">
                            {veiculo.placa ||
                              "SEM PLACA"}
                          </h2>

                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${status.classe}`}
                          >
                            {status.nome}
                          </span>

                        </div>

                        <p className="mt-1 font-semibold text-slate-700">
                          {veiculo.marca || ""}
                          {" "}
                          {veiculo.modelo || ""}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {nomePatio(
                            veiculo.patio_id
                          )}
                        </p>

                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                        ⚖
                      </div>

                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-bold uppercase text-slate-400">
                          Lote
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {veiculo.lote_leilao ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-bold uppercase text-slate-400">
                          Data do leilão
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {veiculo.data_leilao
                            ? new Date(
                                `${veiculo.data_leilao}T12:00:00`
                              ).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-bold uppercase text-slate-400">
                          Arrematante
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {veiculo.leilao_arrematante_nome ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-bold uppercase text-slate-400">
                          Valor
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {formatarValor(
                            veiculo.leilao_valor
                          )}
                        </p>

                      </div>

                    </div>

                    {veiculo.status ===
                      "RETIRADO_LEILAO" &&
                      veiculo.leilao_data_retirada && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                          <p className="text-xs font-black uppercase text-green-600">
                            Saída realizada
                          </p>

                          <p className="mt-1 font-semibold text-green-800">
                            {formatarData(
                              veiculo.leilao_data_retirada
                            )}
                          </p>

                          {veiculo.leilao_responsavel_retirada && (
                            <p className="mt-1 text-sm text-green-700">
                              Retirado por:{" "}
                              {
                                veiculo.leilao_responsavel_retirada
                              }
                            </p>
                          )}

                        </div>
                      )}

                    <button
                      type="button"
                      onClick={() =>
                        abrirVeiculo(
                          veiculo
                        )
                      }
                      className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                    >
                      {veiculo.status ===
                      "RETIRADO_LEILAO"
                        ? "Ver informações"
                        : "Gerenciar leilão"}
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
                  Saída para leilão
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {
                    veiculoSelecionado.placa
                  }
                  {" - "}
                  {
                    veiculoSelecionado.modelo
                  }
                </h2>

              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>

            </div>

            <div className="p-6">

              {/* STATUS */}

              <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-xs font-bold uppercase text-slate-400">
                    Status atual
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
                      dadosStatus(
                        veiculoSelecionado.status
                      ).classe
                    }`}
                  >
                    {
                      dadosStatus(
                        veiculoSelecionado.status
                      ).nome
                    }
                  </span>

                </div>

                <div className="text-sm text-slate-600">
                  <strong>
                    Pátio:
                  </strong>{" "}
                  {nomePatio(
                    veiculoSelecionado.patio_id
                  )}
                </div>

              </div>

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
                  DADOS DO LEILÃO
              ========================================== */}

              <h3 className="mb-4 text-lg font-black text-slate-900">
                Dados do leilão
              </h3>

              <div className="grid gap-5 md:grid-cols-3">

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lote *
                  </label>

                  <input
                    type="text"
                    name="lote"
                    value={form.lote}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_LEILAO"
                    }
                    placeholder="Ex.: Lote 125"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Data do leilão
                  </label>

                  <input
                    type="date"
                    name="dataLeilao"
                    value={
                      form.dataLeilao
                    }
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_LEILAO"
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Valor arrematado
                  </label>

                  <input
                    type="text"
                    name="valor"
                    value={form.valor}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_LEILAO"
                    }
                    placeholder="Ex.: 25.000,00"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />

                </div>

              </div>

              {/* =========================================
                  ARREMATANTE
              ========================================== */}

              <div className="mt-7 border-t border-slate-200 pt-6">

                <h3 className="mb-4 text-lg font-black text-slate-900">
                  Arrematante
                </h3>

                <div className="grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Nome do arrematante
                    </label>

                    <input
                      type="text"
                      name="arrematanteNome"
                      value={
                        form.arrematanteNome
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_LEILAO"
                      }
                      placeholder="Nome completo"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      CPF / CNPJ do arrematante
                    </label>

                    <input
                      type="text"
                      name="arrematanteDocumento"
                      value={
                        form.arrematanteDocumento
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_LEILAO"
                      }
                      placeholder="CPF ou CNPJ"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                </div>

              </div>

              {/* =========================================
                  RETIRADA
              ========================================== */}

              <div className="mt-7 border-t border-slate-200 pt-6">

                <h3 className="mb-1 text-lg font-black text-slate-900">
                  Responsável pela retirada
                </h3>

                <p className="mb-4 text-sm text-slate-500">
                  Preencha esses dados antes da saída
                  física do veículo do pátio.
                </p>

                <div className="grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Nome do responsável
                    </label>

                    <input
                      type="text"
                      name="responsavelRetirada"
                      value={
                        form.responsavelRetirada
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_LEILAO"
                      }
                      placeholder="Quem está retirando o veículo"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Documento
                    </label>

                    <input
                      type="text"
                      name="documentoRetirada"
                      value={
                        form.documentoRetirada
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_LEILAO"
                      }
                      placeholder="CPF, RG ou documento"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                </div>

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
                  disabled={
                    veiculoSelecionado.status ===
                    "RETIRADO_LEILAO"
                  }
                  rows={4}
                  placeholder="Documentação, condições do veículo, observações da retirada..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                />

              </div>

              {/* =========================================
                  SAÍDA CONCLUÍDA
              ========================================== */}

              {veiculoSelecionado.status ===
                "RETIRADO_LEILAO" && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">

                  <p className="font-black text-green-800">
                    ✓ Saída para leilão concluída
                  </p>

                  <p className="mt-2 text-sm text-green-700">
                    Data da saída:{" "}
                    {formatarData(
                      veiculoSelecionado.leilao_data_retirada
                    )}
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Responsável:{" "}
                    {veiculoSelecionado.leilao_responsavel_retirada ||
                      "-"}
                  </p>

                </div>
              )}

              {/* =========================================
                  BOTÕES
              ========================================== */}

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">

                <button
                  type="button"
                  onClick={
                    fecharModal
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>

                {veiculoSelecionado.status !==
                  "RETIRADO_LEILAO" && (
                  <button
                    type="button"
                    onClick={
                      salvarInformacoes
                    }
                    disabled={
                      salvando
                    }
                    className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    Salvar informações
                  </button>
                )}

                {veiculoSelecionado.status ===
                  "AGUARDANDO_LEILAO" && (
                  <button
                    type="button"
                    onClick={() =>
                      atualizarStatus(
                        "LIBERADO_LEILAO"
                      )
                    }
                    disabled={
                      salvando
                    }
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    ✓ Liberar para leilão
                  </button>
                )}

                {veiculoSelecionado.status ===
                  "LIBERADO_LEILAO" && (
                  <button
                    type="button"
                    onClick={() =>
                      atualizarStatus(
                        "ARREMATADO"
                      )
                    }
                    disabled={
                      salvando
                    }
                    className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    ⚖ Marcar como arrematado
                  </button>
                )}

                {veiculoSelecionado.status ===
                  "ARREMATADO" && (
                  <button
                    type="button"
                    onClick={() =>
                      atualizarStatus(
                        "RETIRADO_LEILAO"
                      )
                    }
                    disabled={
                      salvando
                    }
                    className="rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Registrar saída do pátio
                  </button>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}