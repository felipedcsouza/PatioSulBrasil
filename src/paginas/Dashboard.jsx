import { useEffect, useMemo, useState } from "react";
import { supabase } from "../API/supabaseClient";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CORES_STATUS = [
  "#FFC400",
  "#211E1F",
  "#6B6668",
  "#9A9295",
  "#C9A900",
  "#D8D2D4",
];

function Dashboard() {
  const [veiculos, setVeiculos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);

  // Controle de acesso por pátio
  const [acessoPatio, setAcessoPatio] = useState("");

  const [periodo, setPeriodo] = useState(30);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // =========================================================
  // CARREGAR DASHBOARD
  // =========================================================

  useEffect(() => {
    carregarDashboard();
  }, [periodo]);

  async function carregarDashboard() {
    try {
      setCarregando(true);
      setErro("");

      const inicio = new Date();

      inicio.setDate(
        inicio.getDate() - Number(periodo)
      );

      // =====================================================
      // IDENTIFICAR USUÁRIO E PÁTIO
      // =====================================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const usuarioLogado = authData?.user;

      if (!usuarioLogado) {
        throw new Error("Nenhum usuário autenticado.");
      }

      const {
        data: meuPerfil,
        error: erroPerfil,
      } = await supabase
        .from("profiles")
        .select("id, cargo, status, patio_id")
        .eq("id", usuarioLogado.id)
        .single();

      if (erroPerfil) {
        throw erroPerfil;
      }

      const ehMaster =
        meuPerfil?.cargo === "MASTER" &&
        meuPerfil?.status === "APROVADO";

      if (!ehMaster && !meuPerfil?.patio_id) {
        throw new Error(
          "Seu usuário ainda não está vinculado a um pátio. Peça ao administrador para definir sua unidade."
        );
      }

      if (ehMaster) {
        setAcessoPatio("Todos os pátios");
      } else {
        const {
          data: patioData,
          error: patioError,
        } = await supabase
          .from("patios")
          .select("id, nome, cidade, estado")
          .eq("id", meuPerfil.patio_id)
          .maybeSingle();

        if (patioError) {
          console.error(
            "Erro ao carregar nome do pátio:",
            patioError
          );
        }

        setAcessoPatio(
          patioData?.nome ||
            `Pátio #${meuPerfil.patio_id}`
        );
      }

      // =====================================================
      // BUSCAR VEÍCULOS
      // =====================================================

      let consultaVeiculos = supabase
        .from("veiculos")
        .select("*")
        .is("excluido_em", null);

      if (!ehMaster) {
        consultaVeiculos = consultaVeiculos.eq(
          "patio_id",
          meuPerfil.patio_id
        );
      }

      const {
        data: dadosVeiculos,
        error: erroVeiculos,
      } = await consultaVeiculos;

      if (erroVeiculos) {
        throw erroVeiculos;
      }

      // =====================================================
      // BUSCAR MOVIMENTAÇÕES
      // =====================================================

      const idsVeiculosPermitidos = (
        dadosVeiculos || []
      ).map((veiculo) => veiculo.id);

      let dadosMovimentacoes = [];

      if (ehMaster || idsVeiculosPermitidos.length > 0) {
        let consultaMovimentacoes = supabase
          .from("movimentacoes")
          .select(`
            id,
            veiculo_id,
            tipo,
            descricao,
            created_at
          `)
          .gte(
            "created_at",
            inicio.toISOString()
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

        if (!ehMaster) {
          consultaMovimentacoes =
            consultaMovimentacoes.in(
              "veiculo_id",
              idsVeiculosPermitidos
            );
        }

        const {
          data: movimentacoesData,
          error: erroMovimentacoes,
        } = await consultaMovimentacoes;

        if (erroMovimentacoes) {
          throw erroMovimentacoes;
        }

        dadosMovimentacoes = movimentacoesData || [];
      }

      setVeiculos(
        dadosVeiculos || []
      );

      setMovimentacoes(
        dadosMovimentacoes || []
      );

    } catch (error) {

      console.error(
        "Erro ao carregar dashboard:",
        error
      );

      setErro(
        error.message ||
          "Não foi possível carregar o Dashboard."
      );

    } finally {

      setCarregando(false);

    }
  }

  // =========================================================
  // RESUMO
  // =========================================================

  const resumo = useMemo(() => {

    const resultado = {
      entrada: 0,
      saida: 0,
      leilao: 0,
      retirada: 0,
    };

    movimentacoes.forEach(
      (movimentacao) => {

        if (
          movimentacao.tipo === "ENTRADA"
        ) {
          resultado.entrada++;
        }

        if (
          movimentacao.tipo === "SAIDA"
        ) {
          resultado.saida++;
        }

        if (
          movimentacao.tipo === "LEILAO"
        ) {
          resultado.leilao++;
        }

        if (
          movimentacao.tipo === "RETIRADA"
        ) {
          resultado.retirada++;
        }

      }
    );

    return resultado;

  }, [movimentacoes]);

  // =========================================================
  // VEÍCULOS EM PÁTIO
  // =========================================================

  const totalEmPatio = useMemo(() => {

    return veiculos.filter(
      (veiculo) =>
        veiculo.status === "EM_PATIO"
    ).length;

  }, [veiculos]);

  // =========================================================
  // TOTAL CADASTRADOS
  // =========================================================

  const totalVeiculos =
    veiculos.length;

  // =========================================================
  // GRÁFICO POR DIA / MÊS
  // =========================================================

  const dadosGrafico = useMemo(() => {

    const grupos = {};

    movimentacoes.forEach(
      (movimentacao) => {

        const data = new Date(
          movimentacao.created_at
        );

        let chave = "";
        let nome = "";

        // Até 90 dias
        if (Number(periodo) <= 90) {

          chave =
            `${data.getFullYear()}-` +
            `${String(
              data.getMonth() + 1
            ).padStart(2, "0")}-` +
            `${String(
              data.getDate()
            ).padStart(2, "0")}`;

          nome =
            `${String(
              data.getDate()
            ).padStart(2, "0")}/` +
            `${String(
              data.getMonth() + 1
            ).padStart(2, "0")}`;

        } else {

          // 12 meses

          chave =
            `${data.getFullYear()}-` +
            `${String(
              data.getMonth() + 1
            ).padStart(2, "0")}`;

          nome =
            new Intl.DateTimeFormat(
              "pt-BR",
              {
                month: "short",
              }
            ).format(data);

        }

        if (!grupos[chave]) {

          grupos[chave] = {
            chave,
            nome,
            entrada: 0,
            saida: 0,
            leilao: 0,
            retirada: 0,
          };

        }

        if (
          movimentacao.tipo === "ENTRADA"
        ) {
          grupos[chave].entrada++;
        }

        if (
          movimentacao.tipo === "SAIDA"
        ) {
          grupos[chave].saida++;
        }

        if (
          movimentacao.tipo === "LEILAO"
        ) {
          grupos[chave].leilao++;
        }

        if (
          movimentacao.tipo === "RETIRADA"
        ) {
          grupos[chave].retirada++;
        }

      }
    );

    return Object.values(grupos)
      .sort(
        (a, b) =>
          a.chave.localeCompare(
            b.chave
          )
      );

  }, [movimentacoes, periodo]);

  // =========================================================
  // STATUS DOS VEÍCULOS
  // =========================================================

  const dadosStatus = useMemo(() => {

    const contador = {};

    veiculos.forEach(
      (veiculo) => {

        const status =
          veiculo.status ||
          "SEM_STATUS";

        contador[status] =
          (contador[status] || 0) + 1;

      }
    );

    return Object.entries(
      contador
    ).map(
      ([status, quantidade]) => ({
        name:
          formatarStatus(status),
        value:
          quantidade,
      })
    );

  }, [veiculos]);

  // =========================================================
  // ÚLTIMAS MOVIMENTAÇÕES
  // =========================================================

  const ultimasMovimentacoes =
    useMemo(() => {

      return [
        ...movimentacoes,
      ]
        .sort(
          (a, b) =>
            new Date(
              b.created_at
            ) -
            new Date(
              a.created_at
            )
        )
        .slice(0, 10);

    }, [movimentacoes]);

  // =========================================================
  // BUSCAR VEÍCULO
  // =========================================================

  function buscarVeiculo(id) {

    return veiculos.find(
      (veiculo) =>
        veiculo.id === id
    );

  }

  // =========================================================
  // FORMATAR STATUS
  // =========================================================

  function formatarStatus(status) {

    const nomes = {

      EM_PATIO:
        "Em pátio",

      EM_ANALISE:
        "Em análise",

      LIBERADO:
        "Liberado",

      LEILAO:
        "Leilão",

      JUDICIAL:
        "Retirada judicial",

      OUTRO_DESTINO:
        "Outro destino",

    };

    return nomes[status] || status;

  }

  // =========================================================
  // FORMATAR TIPO
  // =========================================================

  function formatarTipo(tipo) {

    const nomes = {

      ENTRADA:
        "Entrada",

      SAIDA:
        "Saída",

      LEILAO:
        "Ida para leilão",

      RETIRADA:
        "Retirada",

    };

    return nomes[tipo] || tipo;

  }

  // =========================================================
  // FORMATAR DATA
  // =========================================================

  function formatarData(data) {

    if (!data) {
      return "-";
    }

    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    ).format(
      new Date(data)
    );

  }

  // =========================================================
  // INDICADORES OPERACIONAIS E FINANCEIROS
  // =========================================================

  const UM_DIA_MS = 24 * 60 * 60 * 1000;

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function quantidadeDiariasAteAgora(veiculo) {
    if (!veiculo?.data_entrada) {
      return 0;
    }

    const inicio = new Date(veiculo.data_entrada);
    const fim = veiculo.data_saida_patio
      ? new Date(veiculo.data_saida_patio)
      : veiculo.liberacao_data_retirada
      ? new Date(veiculo.liberacao_data_retirada)
      : new Date();

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      return 0;
    }

    const diferenca = fim.getTime() - inicio.getTime();

    if (diferenca < 0) {
      return 0;
    }

    return Math.max(1, Math.ceil(diferenca / UM_DIA_MS));
  }

  function ehMesmoDia(data, referencia = new Date()) {
    if (!data) {
      return false;
    }

    const valor = new Date(data);

    if (Number.isNaN(valor.getTime())) {
      return false;
    }

    return (
      valor.getFullYear() === referencia.getFullYear() &&
      valor.getMonth() === referencia.getMonth() &&
      valor.getDate() === referencia.getDate()
    );
  }

  const indicadoresHoje = useMemo(() => {
    const hoje = new Date();

    const entradasHoje = movimentacoes.filter(
      (item) => item.tipo === "ENTRADA" && ehMesmoDia(item.created_at, hoje)
    ).length;

    const saidasHoje = movimentacoes.filter(
      (item) => item.tipo === "SAIDA" && ehMesmoDia(item.created_at, hoje)
    ).length;

    const liberadosAguardando = veiculos.filter(
      (veiculo) => veiculo.status === "LIBERADO"
    ).length;

    const emAnalise = veiculos.filter(
      (veiculo) => veiculo.status === "EM_ANALISE"
    ).length;

    return {
      entradasHoje,
      saidasHoje,
      liberadosAguardando,
      emAnalise,
    };
  }, [movimentacoes, veiculos]);

  const resumoDiarias = useMemo(() => {
    const statusCobraveis = new Set([
      "EM_PATIO",
      "EM_ANALISE",
      "LIBERADO",
    ]);

    const veiculosCobraveis = veiculos.filter((veiculo) =>
      statusCobraveis.has(veiculo.status)
    );

    let totalEmAberto = 0;
    let somaTarifas = 0;
    let quantidadeComTarifa = 0;

    veiculosCobraveis.forEach((veiculo) => {
      const valorDiaria = Number(veiculo.valor_diaria_aplicada || 0);

      if (valorDiaria > 0) {
        const diarias = quantidadeDiariasAteAgora(veiculo);
        totalEmAberto += diarias * valorDiaria;
        somaTarifas += valorDiaria;
        quantidadeComTarifa += 1;
      }
    });

    const totalFinalizado = veiculos.reduce(
      (total, veiculo) => total + Number(veiculo.total_diarias || 0),
      0
    );

    const semTarifa = veiculosCobraveis.filter(
      (veiculo) => Number(veiculo.valor_diaria_aplicada || 0) <= 0
    ).length;

    const mediaDiaria =
      quantidadeComTarifa > 0
        ? somaTarifas / quantidadeComTarifa
        : 0;

    return {
      totalEmAberto,
      totalFinalizado,
      semTarifa,
      mediaDiaria,
      quantidadeCobraveis: veiculosCobraveis.length,
    };
  }, [veiculos]);

  const alertasOperacionais = useMemo(() => {
    const agora = Date.now();

    const maisDe30Dias = veiculos.filter((veiculo) => {
      if (!veiculo.data_entrada) {
        return false;
      }

      if (!["EM_PATIO", "EM_ANALISE", "LIBERADO"].includes(veiculo.status)) {
        return false;
      }

      const entrada = new Date(veiculo.data_entrada).getTime();

      if (Number.isNaN(entrada)) {
        return false;
      }

      return agora - entrada >= 30 * UM_DIA_MS;
    }).length;

    return {
      maisDe30Dias,
      liberadosAguardando: indicadoresHoje.liberadosAguardando,
      semTarifa: resumoDiarias.semTarifa,
    };
  }, [veiculos, indicadoresHoje.liberadosAguardando, resumoDiarias.semTarifa]);

  const maioresPermanencias = useMemo(() => {
    return veiculos
      .filter(
        (veiculo) =>
          veiculo.data_entrada &&
          ["EM_PATIO", "EM_ANALISE", "LIBERADO"].includes(veiculo.status)
      )
      .map((veiculo) => {
        const diarias = quantidadeDiariasAteAgora(veiculo);
        const valorDiaria = Number(veiculo.valor_diaria_aplicada || 0);

        return {
          ...veiculo,
          diariasCalculadas: diarias,
          totalEstimado: diarias * valorDiaria,
        };
      })
      .sort((a, b) => b.diariasCalculadas - a.diariasCalculadas)
      .slice(0, 10);
  }, [veiculos]);

  // =========================================================
  // CARREGANDO
  // =========================================================

  if (carregando) {

    return (
      <div className="min-h-screen bg-[#F5F5F4] p-6">

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <p className="text-lg font-semibold text-slate-600">
            Carregando Dashboard...
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Buscando informações dos veículos.
          </p>

        </div>

      </div>
    );

  }

  // =========================================================
  // ERRO
  // =========================================================

  if (erro) {

    return (
      <div className="min-h-screen bg-[#F5F5F4] p-6">

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">

          <h2 className="text-xl font-bold text-red-700">
            Erro ao carregar Dashboard
          </h2>

          <p className="mt-2 text-red-600">
            {erro}
          </p>

          <button
            type="button"
            onClick={
              carregarDashboard
            }
            className="mt-5 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Tentar novamente
          </button>

        </div>

      </div>
    );

  }

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <div className="min-h-screen bg-[#F5F5F4] p-6">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-slate-500">
            Visão geral da movimentação dos veículos.
          </p>

          {acessoPatio && (
            <div className="mt-3 inline-flex items-center rounded-full border border-[#FFC400]/50 bg-[#FFF8D6] px-3 py-1.5 text-xs font-bold text-[#211E1F]">
              🏢 Acesso: {acessoPatio}
            </div>
          )}

        </div>

        {/* FILTRO */}

        <div className="flex items-center gap-3">

          <span className="text-sm font-medium text-slate-500">
            Período
          </span>

          <select
            value={periodo}
            onChange={(event) =>
              setPeriodo(
                Number(
                  event.target.value
                )
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 outline-none transition focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20"
          >

            <option value={7}>
              Últimos 7 dias
            </option>

            <option value={30}>
              Últimos 30 dias
            </option>

            <option value={90}>
              Últimos 90 dias
            </option>

            <option value={365}>
              Últimos 12 meses
            </option>

          </select>

        </div>

      </div>

      {/* =====================================================
          CARDS PRINCIPAIS
      ====================================================== */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

        {/* ENTRADAS */}

        <div className="rounded-2xl border border-[#E7E2E3] border-t-4 border-t-[#FFC400] bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Entradas
              </p>

              <p className="mt-2 text-4xl font-black text-[#211E1F]">
                {resumo.entrada}
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4B8] text-2xl text-[#211E1F]">
              ↓
            </div>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Veículos recebidos
          </p>

        </div>

        {/* SAÍDAS */}

        <div className="rounded-2xl border border-[#E7E2E3] border-t-4 border-t-[#FFC400] bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Saídas
              </p>

              <p className="mt-2 text-4xl font-black text-[#211E1F]">
                {resumo.saida}
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4B8] text-2xl text-[#211E1F]">
              ↑
            </div>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Veículos que saíram
          </p>

        </div>

        {/* LEILÃO */}

        <div className="rounded-2xl border border-[#E7E2E3] border-t-4 border-t-[#FFC400] bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Leilão
              </p>

              <p className="mt-2 text-4xl font-black text-[#211E1F]">
                {resumo.leilao}
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4B8] text-2xl text-[#211E1F]">
              ⚖
            </div>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Enviados para leilão
          </p>

        </div>

        {/* RETIRADA */}

        <div className="rounded-2xl border border-[#E7E2E3] border-t-4 border-t-[#FFC400] bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Retiradas
              </p>

              <p className="mt-2 text-4xl font-black text-[#211E1F]">
                {resumo.retirada}
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4B8] text-2xl text-[#211E1F]">
              ↗
            </div>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Retiradas registradas
          </p>

        </div>

        {/* EM PÁTIO */}

        <div className="rounded-2xl border border-[#E7E2E3] bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Em pátio
              </p>

              <p className="mt-2 text-4xl font-black text-[#211E1F]">
                {totalEmPatio}
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#211E1F] text-2xl text-[#FFC400]">
              🚗
            </div>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Atualmente no pátio
          </p>

        </div>

        {/* TOTAL */}

        <div className="rounded-2xl border border-[#E7E2E3] bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Total
              </p>

              <p className="mt-2 text-4xl font-black text-[#211E1F]">
                {totalVeiculos}
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#211E1F] text-2xl text-[#FFC400]">
              #
            </div>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Veículos ativos
          </p>

        </div>

      </div>

      {/* =====================================================
          VISÃO RÁPIDA DE HOJE
      ====================================================== */}

      <div className="mt-8 rounded-2xl bg-[#211E1F] p-6 text-white shadow-sm">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFC400]">
              Operação de hoje
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Resumo rápido do pátio
            </h2>
          </div>

          <p className="text-sm text-slate-300">
            Indicadores atualizados com os dados já registrados no sistema.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Entradas hoje
            </p>
            <p className="mt-2 text-3xl font-black text-[#FFC400]">
              {indicadoresHoje.entradasHoje}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Saídas hoje
            </p>
            <p className="mt-2 text-3xl font-black text-[#FFC400]">
              {indicadoresHoje.saidasHoje}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Liberados aguardando
            </p>
            <p className="mt-2 text-3xl font-black text-[#FFC400]">
              {indicadoresHoje.liberadosAguardando}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Em análise
            </p>
            <p className="mt-2 text-3xl font-black text-[#FFC400]">
              {indicadoresHoje.emAnalise}
            </p>
          </div>
        </div>

      </div>

      {/* =====================================================
          RESUMO DAS DIÁRIAS
      ====================================================== */}

      <div className="mt-8">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B58B00]">
            Financeiro operacional
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Resumo das diárias
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Valores calculados a partir da diária aplicada em cada veículo.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#FFC400]/50 bg-[#FFF8D6] p-5 shadow-sm">
            <p className="text-sm font-bold text-[#211E1F]">
              Diárias acumuladas em aberto
            </p>
            <p className="mt-2 text-3xl font-black text-[#211E1F]">
              {formatarMoeda(resumoDiarias.totalEmAberto)}
            </p>
            <p className="mt-2 text-xs text-[#6F5A00]">
              {resumoDiarias.quantidadeCobraveis} veículo(s) em situação de cobrança
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7E2E3] bg-[#211E1F] p-5 shadow-sm">
            <p className="text-sm font-bold text-[#FFC400]">
              Diárias finalizadas
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {formatarMoeda(resumoDiarias.totalFinalizado)}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Soma do total de diárias já fechado nas saídas
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7E2E3] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700">
              Valor médio da diária
            </p>
            <p className="mt-2 text-3xl font-black text-[#211E1F]">
              {formatarMoeda(resumoDiarias.mediaDiaria)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Considerando veículos com tarifa cadastrada
            </p>
          </div>

          <div className={`rounded-2xl border p-5 shadow-sm ${
            resumoDiarias.semTarifa > 0
              ? "border-red-200 bg-red-50"
              : "border-slate-200 bg-white"
          }`}>
            <p className={`text-sm font-bold ${
              resumoDiarias.semTarifa > 0
                ? "text-red-700"
                : "text-slate-700"
            }`}>
              Veículos sem tarifa
            </p>
            <p className={`mt-2 text-3xl font-black ${
              resumoDiarias.semTarifa > 0
                ? "text-red-700"
                : "text-slate-900"
            }`}>
              {resumoDiarias.semTarifa}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Cadastros que precisam de revisão da diária
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          GRÁFICO PRINCIPAL
      ====================================================== */}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6">

          <h2 className="text-xl font-bold text-slate-900">
            Movimentação de veículos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Entradas, saídas, ida para leilão e retiradas no período selecionado.
          </p>

        </div>

        {dadosGrafico.length === 0 ? (

          <div className="flex h-80 items-center justify-center">

            <div className="text-center">

              <p className="font-semibold text-slate-500">
                Nenhuma movimentação encontrada
              </p>

              <p className="mt-1 text-sm text-slate-400">
                As movimentações aparecerão aqui automaticamente.
              </p>

            </div>

          </div>

        ) : (

          <div className="h-96 w-full">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={dadosGrafico}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="nome"
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis
                  allowDecimals={false}
                />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="entrada"
                  name="Entradas"
                  fill="#FFC400"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="saida"
                  name="Saídas"
                  fill="#211E1F"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="leilao"
                  name="Leilão"
                  fill="#A88B00"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="retirada"
                  name="Retiradas"
                  fill="#777174"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        )}

      </div>

      {/* =====================================================
          SEGUNDA LINHA
      ====================================================== */}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">

        {/* ===================================================
            RESUMO DO PERÍODO
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-slate-900">
            Resumo do período
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Comparativo das movimentações.
          </p>

          <div className="mt-6 h-80">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                layout="vertical"
                data={[
                  {
                    nome:
                      "Entradas",
                    total:
                      resumo.entrada,
                  },
                  {
                    nome:
                      "Saídas",
                    total:
                      resumo.saida,
                  },
                  {
                    nome:
                      "Leilão",
                    total:
                      resumo.leilao,
                  },
                  {
                    nome:
                      "Retiradas",
                    total:
                      resumo.retirada,
                  },
                ]}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                />

                <YAxis
                  type="category"
                  dataKey="nome"
                  width={90}
                />

                <Tooltip />

                <Bar
                  dataKey="total"
                  name="Quantidade"
                  fill="#FFC400"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

        {/* ===================================================
            GRÁFICO STATUS
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-slate-900">
            Situação atual
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Distribuição dos veículos por situação.
          </p>

          <div className="mt-6 h-80">

            {dadosStatus.length === 0 ? (

              <div className="flex h-full items-center justify-center">

                <p className="text-slate-400">
                  Nenhum veículo encontrado.
                </p>

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={dadosStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={3}
                    label
                  >

                    {dadosStatus.map(
                      (
                        _,
                        index
                      ) => (

                        <Cell
                          key={
                            index
                          }
                          fill={
                            CORES_STATUS[
                              index %
                                CORES_STATUS.length
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>

      </div>

      {/* =====================================================
          ALERTAS E MAIOR PERMANÊNCIA
      ====================================================== */}

      <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Atenção
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              Alertas operacionais
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            <div className={`rounded-xl border p-4 ${
              alertasOperacionais.maisDe30Dias > 0
                ? "border-[#FFC400]/50 bg-[#FFF8D6]"
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800">Mais de 30 dias</p>
                  <p className="mt-1 text-xs text-slate-500">Veículos com longa permanência</p>
                </div>
                <span className="text-2xl font-black text-[#B58B00]">
                  {alertasOperacionais.maisDe30Dias}
                </span>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${
              alertasOperacionais.liberadosAguardando > 0
                ? "border-[#FFC400]/50 bg-[#FFF8D6]"
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800">Liberados aguardando</p>
                  <p className="mt-1 text-xs text-slate-500">Autorizados e ainda não retirados</p>
                </div>
                <span className="text-2xl font-black text-[#211E1F]">
                  {alertasOperacionais.liberadosAguardando}
                </span>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${
              alertasOperacionais.semTarifa > 0
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800">Sem valor de diária</p>
                  <p className="mt-1 text-xs text-slate-500">Revisar antes da saída do pátio</p>
                </div>
                <span className="text-2xl font-black text-red-700">
                  {alertasOperacionais.semTarifa}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-black text-slate-900">
              Veículos com maior permanência
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Priorize veículos que estão há mais tempo no pátio.
            </p>
          </div>

          {maioresPermanencias.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Nenhum veículo em permanência encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Placa</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Veículo</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Entrada</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Diárias</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Valor/dia</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {maioresPermanencias.map((veiculo) => (
                    <tr key={veiculo.id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-black uppercase text-slate-900">
                        {veiculo.placa || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") || "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatarData(veiculo.data_entrada)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {veiculo.diariasCalculadas}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                        {formatarMoeda(veiculo.valor_diaria_aplicada)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-black text-slate-900">
                        {formatarMoeda(veiculo.totalEstimado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          ÚLTIMAS MOVIMENTAÇÕES
      ====================================================== */}

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 p-6">

          <h2 className="text-xl font-bold text-slate-900">
            Últimas movimentações
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Histórico recente dos veículos.
          </p>

        </div>

        {ultimasMovimentacoes.length ===
        0 ? (

          <div className="p-10 text-center">

            <p className="font-medium text-slate-500">
              Nenhuma movimentação registrada.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-slate-50">

                <tr>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Placa
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Veículo
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Movimentação
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Descrição
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Data
                  </th>

                </tr>

              </thead>

              <tbody>

                {ultimasMovimentacoes.map(
                  (
                    movimentacao
                  ) => {

                    const veiculo =
                      buscarVeiculo(
                        movimentacao.veiculo_id
                      );

                    return (

                      <tr
                        key={
                          movimentacao.id
                        }
                        className="border-t border-slate-100 transition hover:bg-slate-50"
                      >

                        <td className="px-6 py-4 font-bold text-slate-800">

                          {veiculo?.placa ||
                            "-"}

                        </td>

                        <td className="px-6 py-4 text-slate-600">

                          {veiculo?.marca ||
                            ""}{" "}

                          {veiculo?.modelo ||
                            ""}

                        </td>

                        <td className="px-6 py-4">

                          <span className="rounded-full border border-[#FFC400]/50 bg-[#FFF8D6] px-3 py-1 text-sm font-semibold text-[#211E1F]">

                            {formatarTipo(
                              movimentacao.tipo
                            )}

                          </span>

                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">

                          {movimentacao.descricao ||
                            "-"}

                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">

                          {formatarData(
                            movimentacao.created_at
                          )}

                        </td>

                      </tr>

                    );

                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default Dashboard;