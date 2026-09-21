import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

const FORMAS_PAGAMENTO = [
  { value: "PIX", label: "PIX" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "CARTAO_CREDITO", label: "Cartão de crédito" },
  { value: "CARTAO_DEBITO", label: "Cartão de débito" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTRO", label: "Outro" },
];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataHora(data) {
  if (!data) return "-";
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "-";
  return valor.toLocaleString("pt-BR");
}

function converterValor(valor) {
  if (valor === null || valor === undefined) return null;

  let texto = String(valor)
    .trim()
    .replace("R$", "")
    .replace(/\s/g, "");

  if (!texto) return null;

  if (texto.includes(".") && texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

function calcularCobrancaAtual(veiculo) {
  const valorDiaria = Number(veiculo?.valor_diaria_aplicada || 0);

  if (
    veiculo?.status === "RETIRADO_LIBERADO" &&
    veiculo?.quantidade_diarias != null &&
    veiculo?.total_diarias != null
  ) {
    return {
      quantidadeDiarias: Number(veiculo.quantidade_diarias || 0),
      valorDiaria,
      total: Number(veiculo.total_diarias || 0),
      possuiEntrada: Boolean(veiculo?.data_entrada),
      possuiValor: Number.isFinite(valorDiaria) && valorDiaria > 0,
      congelada: true,
    };
  }

  const entrada = veiculo?.data_entrada
    ? new Date(veiculo.data_entrada)
    : null;

  const saida = veiculo?.data_saida_patio
    ? new Date(veiculo.data_saida_patio)
    : veiculo?.liberacao_data_retirada
      ? new Date(veiculo.liberacao_data_retirada)
      : new Date();

  if (
    !entrada ||
    Number.isNaN(entrada.getTime()) ||
    Number.isNaN(saida.getTime())
  ) {
    return {
      quantidadeDiarias: 0,
      valorDiaria,
      total: 0,
      possuiEntrada: false,
      possuiValor: Number.isFinite(valorDiaria) && valorDiaria > 0,
      congelada: false,
    };
  }

  const diferenca = Math.max(0, saida.getTime() - entrada.getTime());
  const quantidadeDiarias = Math.max(1, Math.ceil(diferenca / UM_DIA_EM_MS));

  return {
    quantidadeDiarias,
    valorDiaria,
    total: quantidadeDiarias * valorDiaria,
    possuiEntrada: true,
    possuiValor: Number.isFinite(valorDiaria) && valorDiaria > 0,
    congelada: Boolean(veiculo?.data_saida_patio || veiculo?.liberacao_data_retirada),
  };
}

function rotuloFormaPagamento(valor) {
  return FORMAS_PAGAMENTO.find((item) => item.value === valor)?.label || valor || "-";
}

export default function PagamentosDiarias() {
  const { perfil, user, isMaster } = useAuth();

  const [veiculos, setVeiculos] = useState([]);
  const [patios, setPatios] = useState([]);
  const [cobrancas, setCobrancas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [patioFiltro, setPatioFiltro] = useState("TODOS");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");

  const [veiculoIdSelecionado, setVeiculoIdSelecionado] = useState("");
  const [observacaoCobranca, setObservacaoCobranca] = useState("");

  const [cobrancaPagamento, setCobrancaPagamento] = useState(null);
  const [formPagamento, setFormPagamento] = useState({
    valor: "",
    formaPagamento: "PIX",
    referencia: "",
    observacoes: "",
  });

  useEffect(() => {
    if (!perfil) return;
    carregarDados();
  }, [perfil, isMaster]);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      let consultaVeiculos = supabase
        .from("veiculos")
        .select("*")
        .is("excluido_em", null)
        .order("data_entrada", { ascending: false });

      let consultaCobrancas = supabase
        .from("cobrancas_diarias")
        .select("*")
        .order("gerada_em", { ascending: false });

      let consultaPagamentos = supabase
        .from("pagamentos_diarias")
        .select("*")
        .eq("cancelado", false)
        .order("pago_em", { ascending: false });

      if (!isMaster) {
        if (!perfil?.patio_id) {
          throw new Error("Sua conta ainda não possui um pátio vinculado.");
        }

        consultaVeiculos = consultaVeiculos.eq("patio_id", perfil.patio_id);
        consultaCobrancas = consultaCobrancas.eq("patio_id", perfil.patio_id);
        consultaPagamentos = consultaPagamentos.eq("patio_id", perfil.patio_id);
      }

      const [
        veiculosResponse,
        patiosResponse,
        cobrancasResponse,
        pagamentosResponse,
      ] = await Promise.all([
        consultaVeiculos,
        supabase
          .from("patios")
          .select("id, nome, cidade, estado, ativo")
          .order("nome"),
        consultaCobrancas,
        consultaPagamentos,
      ]);

      if (veiculosResponse.error) throw veiculosResponse.error;
      if (cobrancasResponse.error) throw cobrancasResponse.error;
      if (pagamentosResponse.error) throw pagamentosResponse.error;

      if (patiosResponse.error) {
        console.error("Erro ao carregar pátios:", patiosResponse.error);
      }

      setVeiculos(veiculosResponse.data || []);
      setPatios(patiosResponse.data || []);
      setCobrancas(cobrancasResponse.data || []);
      setPagamentos(pagamentosResponse.data || []);
    } catch (error) {
      console.error("Erro ao carregar cobranças:", error);
      setErro(
        error?.message ||
          "Não foi possível carregar cobranças e pagamentos de diárias."
      );
    } finally {
      setLoading(false);
    }
  }

  function nomePatio(patioId) {
    return (
      patios.find((item) => String(item.id) === String(patioId))?.nome ||
      "Pátio não informado"
    );
  }

  function veiculoPorId(veiculoId) {
    return veiculos.find((item) => String(item.id) === String(veiculoId));
  }

  function pagamentosDoVeiculo(veiculoId) {
    return pagamentos.filter(
      (item) => String(item.veiculo_id) === String(veiculoId) && !item.cancelado
    );
  }

  function totalPagoVeiculo(veiculoId) {
    return pagamentosDoVeiculo(veiculoId).reduce(
      (total, item) => total + Number(item.valor || 0),
      0
    );
  }

  function statusFinanceiro(cobranca) {
    const total = Number(cobranca?.valor_total || 0);
    const pago = totalPagoVeiculo(cobranca?.veiculo_id);
    const saldo = Math.max(0, total - pago);

    if (cobranca?.status === "CANCELADO") return "CANCELADO";
    if (saldo <= 0.009 && total > 0) return "PAGO";
    if (pago > 0) return "PARCIAL";
    return "PENDENTE";
  }

  const veiculoSelecionado = useMemo(
    () => veiculoPorId(veiculoIdSelecionado),
    [veiculoIdSelecionado, veiculos]
  );

  const previaSelecionada = useMemo(
    () => (veiculoSelecionado ? calcularCobrancaAtual(veiculoSelecionado) : null),
    [veiculoSelecionado]
  );

  const cobrancasVisiveis = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return cobrancas.filter((cobranca) => {
      const veiculo = veiculoPorId(cobranca.veiculo_id);
      const status = statusFinanceiro(cobranca);

      if (
        isMaster &&
        patioFiltro !== "TODOS" &&
        String(cobranca.patio_id) !== String(patioFiltro)
      ) {
        return false;
      }

      if (statusFiltro !== "TODOS" && status !== statusFiltro) {
        return false;
      }

      if (!termo) return true;

      const texto = [
        veiculo?.placa,
        veiculo?.renavam,
        veiculo?.chassi,
        veiculo?.marca,
        veiculo?.modelo,
        veiculo?.proprietario,
        cobranca.observacoes,
        nomePatio(cobranca.patio_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [
    cobrancas,
    pagamentos,
    veiculos,
    patios,
    pesquisa,
    patioFiltro,
    statusFiltro,
    isMaster,
  ]);

  const resumo = useMemo(() => {
    let totalCobrancas = 0;
    let totalPago = 0;
    let pendente = 0;
    let quantidadeAbertas = 0;

    cobrancasVisiveis.forEach((cobranca) => {
      if (cobranca.status === "CANCELADO") return;

      const total = Number(cobranca.valor_total || 0);
      const pago = Math.min(totalPagoVeiculo(cobranca.veiculo_id), total);
      const saldo = Math.max(0, total - pago);

      totalCobrancas += total;
      totalPago += pago;
      pendente += saldo;

      if (saldo > 0.009) quantidadeAbertas += 1;
    });

    return {
      totalCobrancas,
      totalPago,
      pendente,
      quantidadeAbertas,
    };
  }, [cobrancasVisiveis, pagamentos]);

  const veiculosDisponiveis = useMemo(() => {
    return [...veiculos]
      .filter((veiculo) => {
        if (
          isMaster &&
          patioFiltro !== "TODOS" &&
          String(veiculo.patio_id) !== String(patioFiltro)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => String(a.placa || "").localeCompare(String(b.placa || "")));
  }, [veiculos, patioFiltro, isMaster]);

  async function gerarCobranca() {
    if (!veiculoSelecionado || !previaSelecionada) {
      setErro("Selecione um veículo.");
      return;
    }

    if (!previaSelecionada.possuiEntrada) {
      setErro("O veículo não possui data de entrada válida.");
      return;
    }

    if (!previaSelecionada.possuiValor) {
      setErro(
        "O veículo não possui valor de diária aplicado. Confira a tarifa e a categoria de cobrança."
      );
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const pago = totalPagoVeiculo(veiculoSelecionado.id);
      const total = previaSelecionada.total;
      const status =
        pago >= total - 0.009
          ? "PAGO"
          : pago > 0
            ? "PARCIAL"
            : "PENDENTE";

      const agora = new Date().toISOString();

      const dados = {
        veiculo_id: veiculoSelecionado.id,
        patio_id: veiculoSelecionado.patio_id,
        quantidade_diarias: previaSelecionada.quantidadeDiarias,
        valor_diaria: previaSelecionada.valorDiaria,
        valor_total: total,
        data_referencia: agora,
        status,
        observacoes: observacaoCobranca.trim() || null,
        gerada_por: user?.id || null,
        updated_at: agora,
      };

      const { error } = await supabase
        .from("cobrancas_diarias")
        .upsert(dados, { onConflict: "veiculo_id" });

      if (error) throw error;

      setMensagem(
        `Cobrança do veículo ${veiculoSelecionado.placa || "selecionado"} gerada/atualizada com sucesso.`
      );
      setObservacaoCobranca("");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao gerar cobrança:", error);
      setErro(error?.message || "Não foi possível gerar a cobrança.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirPagamento(cobranca) {
    const total = Number(cobranca.valor_total || 0);
    const pago = totalPagoVeiculo(cobranca.veiculo_id);
    const saldo = Math.max(0, total - pago);

    if (saldo <= 0.009) {
      setErro("Esta cobrança já está totalmente paga.");
      return;
    }

    setErro("");
    setMensagem("");
    setCobrancaPagamento(cobranca);
    setFormPagamento({
      valor: saldo.toFixed(2).replace(".", ","),
      formaPagamento: "PIX",
      referencia: "",
      observacoes: "",
    });
  }

  function fecharPagamento() {
    if (salvando) return;
    setCobrancaPagamento(null);
  }

  async function registrarPagamento(event) {
    event.preventDefault();

    if (!cobrancaPagamento) return;

    const valor = converterValor(formPagamento.valor);
    const total = Number(cobrancaPagamento.valor_total || 0);
    const pagoAtual = totalPagoVeiculo(cobrancaPagamento.veiculo_id);
    const saldo = Math.max(0, total - pagoAtual);

    if (!valor || valor <= 0) {
      setErro("Informe um valor de pagamento válido.");
      return;
    }

    if (valor > saldo + 0.009) {
      setErro(`O pagamento não pode ser maior que o saldo de ${formatarMoeda(saldo)}.`);
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const agora = new Date().toISOString();

      const { error: pagamentoError } = await supabase
        .from("pagamentos_diarias")
        .insert({
          veiculo_id: cobrancaPagamento.veiculo_id,
          patio_id: cobrancaPagamento.patio_id,
          valor,
          forma_pagamento: formPagamento.formaPagamento,
          referencia: formPagamento.referencia.trim() || null,
          observacoes: formPagamento.observacoes.trim() || null,
          registrado_por: user?.id || null,
          pago_em: agora,
          cancelado: false,
          created_at: agora,
          updated_at: agora,
        });

      if (pagamentoError) throw pagamentoError;

      const novoPago = pagoAtual + valor;
      const novoStatus =
        novoPago >= total - 0.009 ? "PAGO" : "PARCIAL";

      const { error: cobrancaError } = await supabase
        .from("cobrancas_diarias")
        .update({
          status: novoStatus,
          updated_at: agora,
        })
        .eq("id", cobrancaPagamento.id);

      if (cobrancaError) {
        console.error(
          "Pagamento registrado, mas houve erro ao atualizar status da cobrança:",
          cobrancaError
        );
      }

      setCobrancaPagamento(null);
      setMensagem(`Pagamento de ${formatarMoeda(valor)} registrado com sucesso.`);
      await carregarDados();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      setErro(error?.message || "Não foi possível registrar o pagamento.");
    } finally {
      setSalvando(false);
    }
  }

  function imprimirCobranca(cobranca) {
    const veiculo = veiculoPorId(cobranca.veiculo_id);
    const pago = totalPagoVeiculo(cobranca.veiculo_id);
    const total = Number(cobranca.valor_total || 0);
    const saldo = Math.max(0, total - pago);
    const codigo = `COB-${String(cobranca.id).padStart(6, "0")}`;

    const janela = window.open("", "_blank", "width=850,height=900");
    if (!janela) {
      setErro("O navegador bloqueou a janela de impressão.");
      return;
    }

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>${codigo}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #211E1F; margin: 40px; }
            .topo { border-bottom: 4px solid #FFC400; padding-bottom: 18px; margin-bottom: 24px; }
            .titulo { font-size: 28px; font-weight: 800; margin: 0; }
            .codigo { color: #666; margin-top: 6px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
            .card { border: 1px solid #ddd; border-radius: 10px; padding: 14px; }
            .rotulo { font-size: 11px; font-weight: 700; color: #777; text-transform: uppercase; }
            .valor { font-size: 18px; font-weight: 800; margin-top: 5px; }
            .total { background: #211E1F; color: white; border-radius: 12px; padding: 20px; margin-top: 24px; }
            .total strong { color: #FFC400; font-size: 28px; }
            .rodape { margin-top: 38px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="topo">
            <h1 class="titulo">Cobrança de Diárias — Pátio Sul Brasil</h1>
            <div class="codigo">${codigo}</div>
          </div>

          <div class="grid">
            <div class="card"><div class="rotulo">Placa</div><div class="valor">${veiculo?.placa || "SEM PLACA"}</div></div>
            <div class="card"><div class="rotulo">Pátio</div><div class="valor">${nomePatio(cobranca.patio_id)}</div></div>
            <div class="card"><div class="rotulo">Veículo</div><div class="valor">${veiculo?.marca || ""} ${veiculo?.modelo || ""}</div></div>
            <div class="card"><div class="rotulo">Proprietário</div><div class="valor">${veiculo?.proprietario || "-"}</div></div>
            <div class="card"><div class="rotulo">Quantidade de diárias</div><div class="valor">${cobranca.quantidade_diarias}</div></div>
            <div class="card"><div class="rotulo">Valor por diária</div><div class="valor">${formatarMoeda(cobranca.valor_diaria)}</div></div>
            <div class="card"><div class="rotulo">Gerada em</div><div class="valor">${formatarDataHora(cobranca.gerada_em)}</div></div>
            <div class="card"><div class="rotulo">Status</div><div class="valor">${statusFinanceiro(cobranca)}</div></div>
          </div>

          <div class="total">
            <div>Total da cobrança</div>
            <strong>${formatarMoeda(total)}</strong>
            <div style="margin-top:12px">Pago: ${formatarMoeda(pago)} &nbsp; | &nbsp; Saldo: ${formatarMoeda(saldo)}</div>
          </div>

          <div class="rodape">Documento gerado pelo sistema Pátio Sul Brasil em ${new Date().toLocaleString("pt-BR")}.</div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);

    janela.document.close();
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#FFC400]" />
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Carregando cobranças...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-[#B28A00]">
              Financeiro
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#211E1F]">
              Cobranças e Pagamentos de Diárias
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Gere a cobrança pela permanência do veículo, registre pagamentos parciais ou totais e acompanhe o saldo em aberto.
            </p>
            <p className="mt-2 text-sm font-black text-[#8A6B00]">
              🏢 Acesso: {isMaster ? "Todos os pátios" : nomePatio(perfil?.patio_id)}
            </p>
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

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#FFC400]/40 bg-[#211E1F] p-5 shadow-sm">
            <p className="text-sm font-bold text-white/60">Total gerado</p>
            <p className="mt-3 text-2xl font-black text-[#FFC400]">
              {formatarMoeda(resumo.totalCobrancas)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Recebido</p>
            <p className="mt-3 text-2xl font-black text-green-600">
              {formatarMoeda(resumo.totalPago)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Saldo em aberto</p>
            <p className="mt-3 text-2xl font-black text-amber-600">
              {formatarMoeda(resumo.pendente)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Cobranças em aberto</p>
            <p className="mt-3 text-2xl font-black text-[#211E1F]">
              {resumo.quantidadeAbertas}
            </p>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-[#FFC400]/40 bg-white shadow-sm">
          <div className="bg-[#211E1F] px-6 py-5">
            <p className="text-xs font-black uppercase tracking-wider text-[#FFC400]">
              Gerar cobrança
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Selecione um veículo
            </h2>
          </div>

          <div className="p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Veículo
                </label>
                <select
                  value={veiculoIdSelecionado}
                  onChange={(event) => setVeiculoIdSelecionado(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20"
                >
                  <option value="">Selecione o veículo</option>
                  {veiculosDisponiveis.map((veiculo) => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa || "SEM PLACA"} — {veiculo.marca || ""} {veiculo.modelo || ""} — {nomePatio(veiculo.patio_id)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observação da cobrança
                </label>
                <input
                  value={observacaoCobranca}
                  onChange={(event) => setObservacaoCobranca(event.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
                />
              </div>
            </div>

            {veiculoSelecionado && previaSelecionada && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Placa</p>
                    <p className="mt-1 font-black text-[#211E1F]">{veiculoSelecionado.placa || "SEM PLACA"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Entrada</p>
                    <p className="mt-1 font-bold text-slate-700">{formatarDataHora(veiculoSelecionado.data_entrada)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Diárias</p>
                    <p className="mt-1 text-xl font-black text-[#211E1F]">{previaSelecionada.quantidadeDiarias}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Valor/dia</p>
                    <p className="mt-1 font-black text-[#211E1F]">{formatarMoeda(previaSelecionada.valorDiaria)}</p>
                  </div>
                  <div className="rounded-xl bg-[#FFC400] p-3">
                    <p className="text-[10px] font-black uppercase text-[#211E1F]/60">Total</p>
                    <p className="mt-1 text-xl font-black text-[#211E1F]">{formatarMoeda(previaSelecionada.total)}</p>
                  </div>
                </div>

                {!previaSelecionada.possuiValor && (
                  <p className="mt-4 text-sm font-bold text-red-600">
                    Este veículo ainda não possui valor de diária aplicado.
                  </p>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={gerarCobranca}
                    disabled={salvando}
                    className="rounded-xl bg-[#211E1F] px-5 py-3 text-sm font-black text-[#FFC400] transition hover:bg-[#2f2b2d] disabled:opacity-50"
                  >
                    {salvando ? "Gerando..." : "Gerar / Atualizar cobrança"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Pesquisar placa, proprietário, RENAVAM..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
            />

            {isMaster && (
              <select
                value={patioFiltro}
                onChange={(event) => setPatioFiltro(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              >
                <option value="TODOS">Todos os pátios</option>
                {patios.map((patio) => (
                  <option key={patio.id} value={patio.id}>{patio.nome}</option>
                ))}
              </select>
            )}

            <select
              value={statusFiltro}
              onChange={(event) => setStatusFiltro(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            >
              <option value="TODOS">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGO">Pago</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
        </div>

        {cobrancasVisiveis.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
            <div className="text-4xl">🧾</div>
            <h3 className="mt-3 font-black text-[#211E1F]">Nenhuma cobrança encontrada</h3>
            <p className="mt-2 text-sm text-slate-500">Selecione um veículo acima para gerar a primeira cobrança.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cobrancasVisiveis.map((cobranca) => {
              const veiculo = veiculoPorId(cobranca.veiculo_id);
              const total = Number(cobranca.valor_total || 0);
              const pago = totalPagoVeiculo(cobranca.veiculo_id);
              const saldo = Math.max(0, total - pago);
              const status = statusFinanceiro(cobranca);
              const historico = pagamentosDoVeiculo(cobranca.veiculo_id);

              const classeStatus =
                status === "PAGO"
                  ? "bg-green-100 text-green-700"
                  : status === "PARCIAL"
                    ? "bg-blue-100 text-blue-700"
                    : status === "CANCELADO"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-amber-100 text-amber-700";

              return (
                <div key={cobranca.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black uppercase text-[#211E1F]">
                          {veiculo?.placa || "SEM PLACA"}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${classeStatus}`}>
                          {status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {veiculo?.marca || ""} {veiculo?.modelo || ""} • {nomePatio(cobranca.patio_id)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        COB-{String(cobranca.id).padStart(6, "0")} • Gerada em {formatarDataHora(cobranca.gerada_em)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => imprimirCobranca(cobranca)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        🧾 Imprimir cobrança
                      </button>

                      {status !== "PAGO" && status !== "CANCELADO" && (
                        <button
                          type="button"
                          onClick={() => abrirPagamento(cobranca)}
                          className="rounded-xl bg-[#FFC400] px-4 py-2.5 text-xs font-black text-[#211E1F] hover:bg-[#FFD43B]"
                        >
                          Registrar pagamento
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase text-slate-400">Diárias</p>
                      <p className="mt-1 text-xl font-black text-[#211E1F]">{cobranca.quantidade_diarias}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase text-slate-400">Valor/dia</p>
                      <p className="mt-1 font-black text-[#211E1F]">{formatarMoeda(cobranca.valor_diaria)}</p>
                    </div>
                    <div className="rounded-xl bg-[#211E1F] p-4">
                      <p className="text-[10px] font-black uppercase text-white/50">Total</p>
                      <p className="mt-1 text-lg font-black text-[#FFC400]">{formatarMoeda(total)}</p>
                    </div>
                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-[10px] font-black uppercase text-green-600">Pago</p>
                      <p className="mt-1 text-lg font-black text-green-700">{formatarMoeda(pago)}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-4">
                      <p className="text-[10px] font-black uppercase text-amber-600">Saldo</p>
                      <p className="mt-1 text-lg font-black text-amber-700">{formatarMoeda(saldo)}</p>
                    </div>
                  </div>

                  {historico.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
                        Histórico de pagamentos
                      </p>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {historico.map((pagamento) => (
                          <div key={pagamento.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-black text-[#211E1F]">{formatarMoeda(pagamento.valor)}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {rotuloFormaPagamento(pagamento.forma_pagamento)} • {formatarDataHora(pagamento.pago_em)}
                                </p>
                                {pagamento.referencia && (
                                  <p className="mt-1 text-xs text-slate-500">Ref.: {pagamento.referencia}</p>
                                )}
                              </div>
                              <span className="rounded-full bg-green-100 px-2 py-1 text-[9px] font-black text-green-700">PAGO</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cobrancaPagamento && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-[#211E1F] px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-[#FFC400]">Pagamento</p>
              <h2 className="mt-1 text-xl font-black text-white">
                Registrar recebimento
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {veiculoPorId(cobrancaPagamento.veiculo_id)?.placa || "SEM PLACA"} • Saldo {formatarMoeda(Math.max(0, Number(cobrancaPagamento.valor_total || 0) - totalPagoVeiculo(cobrancaPagamento.veiculo_id)))}
              </p>
            </div>

            <form onSubmit={registrarPagamento} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Valor *</label>
                  <input
                    value={formPagamento.valor}
                    onChange={(event) => setFormPagamento((anterior) => ({ ...anterior, valor: event.target.value }))}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Forma de pagamento *</label>
                  <select
                    value={formPagamento.formaPagamento}
                    onChange={(event) => setFormPagamento((anterior) => ({ ...anterior, formaPagamento: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    {FORMAS_PAGAMENTO.map((forma) => (
                      <option key={forma.value} value={forma.value}>{forma.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Referência</label>
                  <input
                    value={formPagamento.referencia}
                    onChange={(event) => setFormPagamento((anterior) => ({ ...anterior, referencia: event.target.value }))}
                    placeholder="ID PIX, NSU, recibo, protocolo..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Observações</label>
                  <textarea
                    value={formPagamento.observacoes}
                    onChange={(event) => setFormPagamento((anterior) => ({ ...anterior, observacoes: event.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharPagamento}
                  disabled={salvando}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-[#FFC400] px-5 py-3 text-sm font-black text-[#211E1F] hover:bg-[#FFD43B] disabled:opacity-50"
                >
                  {salvando ? "Registrando..." : "Confirmar pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
