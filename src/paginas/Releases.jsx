import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";

// =======================================================
// TIPOS DE LIBERAÇÃO
// =======================================================

const TIPOS_LIBERACAO = [
  "PROPRIETÁRIO",
  "SEGURADORA",
  "AUTORIZAÇÃO ADMINISTRATIVA",
  "ÓRGÃO PÚBLICO",
  "TERCEIRO AUTORIZADO",
  "OUTRO",
];

const FORMAS_PAGAMENTO = [
  { value: "PIX", label: "PIX" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "CARTAO_CREDITO", label: "Cartão de crédito" },
  { value: "CARTAO_DEBITO", label: "Cartão de débito" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTRO", label: "Outro" },
];

// =======================================================
// COBRANÇA DE DIÁRIAS
// Regra: cada período de até 24 horas iniciado conta 1 diária.
// Ex.: 1h = 1 diária, 24h = 1 diária, 25h = 2 diárias.
// =======================================================

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarFormaPagamento(forma) {
  return (
    FORMAS_PAGAMENTO.find((item) => item.value === forma)?.label ||
    forma ||
    "-"
  );
}

function normalizarValorDigitado(valor) {
  if (typeof valor === "number") {
    return valor;
  }

  const texto = String(valor || "").trim();

  if (!texto) {
    return 0;
  }

  if (texto.includes(",")) {
    return Number(texto.replace(/\./g, "").replace(",", "."));
  }

  return Number(texto);
}

function calcularCobrancaDiarias(veiculo, dataSaidaReferencia = null) {
  const valorDiaria = Number(veiculo?.valor_diaria_aplicada || 0);

  // Para veículos já retirados, prioriza os valores congelados no banco.
  if (
    veiculo?.status === "RETIRADO_LIBERADO" &&
    veiculo?.quantidade_diarias != null &&
    veiculo?.total_diarias != null
  ) {
    return {
      quantidadeDiarias: Number(veiculo.quantidade_diarias || 0),
      valorDiaria,
      totalDiarias: Number(veiculo.total_diarias || 0),
      possuiEntrada: Boolean(veiculo?.data_entrada),
      possuiValor: Number.isFinite(valorDiaria) && valorDiaria > 0,
    };
  }

  const entrada = veiculo?.data_entrada
    ? new Date(veiculo.data_entrada)
    : null;

  const dataSaida =
    dataSaidaReferencia ||
    veiculo?.data_saida_patio ||
    veiculo?.liberacao_data_retirada ||
    new Date();

  const saida = new Date(dataSaida);

  if (
    !entrada ||
    Number.isNaN(entrada.getTime()) ||
    Number.isNaN(saida.getTime())
  ) {
    return {
      quantidadeDiarias: 0,
      valorDiaria,
      totalDiarias: 0,
      possuiEntrada: false,
      possuiValor: Number.isFinite(valorDiaria) && valorDiaria > 0,
    };
  }

  const diferencaMs = Math.max(0, saida.getTime() - entrada.getTime());
  const quantidadeDiarias = Math.max(1, Math.ceil(diferencaMs / UM_DIA_EM_MS));
  const totalDiarias = quantidadeDiarias * valorDiaria;

  return {
    quantidadeDiarias,
    valorDiaria,
    totalDiarias,
    possuiEntrada: true,
    possuiValor: Number.isFinite(valorDiaria) && valorDiaria > 0,
  };
}

// =======================================================
// COMPONENTE
// =======================================================

export default function Releases() {
  const [veiculos, setVeiculos] = useState([]);
  const [patios, setPatios] = useState([]);

  // CONTROLE DE ACESSO POR PÁTIO
  const [perfilAtual, setPerfilAtual] = useState(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("AGUARDANDO");

  const [
    veiculoSelecionado,
    setVeiculoSelecionado,
  ] = useState(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] =
    useState("");

  const ehMaster =
    perfilAtual?.cargo === "MASTER" &&
    perfilAtual?.status === "APROVADO";

  const [form, setForm] = useState({
    tipoLiberacao: "",
    autorizadoPor: "",
    documentoLiberacao: "",
    responsavelRetirada: "",
    documentoRetirada: "",
    observacoes: "",
  });

  // PAGAMENTOS DAS DIÁRIAS
  const [pagamentos, setPagamentos] = useState([]);
  const [pagamentosDisponiveis, setPagamentosDisponiveis] = useState(true);
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [formPagamento, setFormPagamento] = useState({
    valor: "",
    formaPagamento: "PIX",
    referencia: "",
    observacoes: "",
  });

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      // ===================================================
      // IDENTIFICAR USUÁRIO E PÁTIO
      // ===================================================

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
        data: meuPerfil,
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

      if (meuPerfil?.status !== "APROVADO") {
        throw new Error(
          "Seu usuário não está aprovado para acessar esta página."
        );
      }

      if (
        meuPerfil?.cargo !== "MASTER" &&
        !meuPerfil?.patio_id
      ) {
        throw new Error(
          "Seu usuário ainda não está vinculado a um pátio. Peça ao administrador para definir sua unidade."
        );
      }

      setPerfilAtual(meuPerfil);

      let consultaVeiculos = supabase
        .from("veiculos")
        .select("*")
        .is("excluido_em", null)
        .or(
          [
            "destino_atual.eq.LIBERADO",
            "status.eq.LIBERADO",
            "status.eq.RETIRADO_LIBERADO",
          ].join(",")
        );

      if (meuPerfil.cargo !== "MASTER") {
        consultaVeiculos =
          consultaVeiculos.eq(
            "patio_id",
            meuPerfil.patio_id
          );
      }

      consultaVeiculos =
        consultaVeiculos.order(
          "data_entrada",
          { ascending: false }
        );

      let consultaPatios = supabase
        .from("patios")
        .select(
          "id, nome, cidade, estado"
        );

      if (meuPerfil.cargo !== "MASTER") {
        consultaPatios = consultaPatios.eq(
          "id",
          meuPerfil.patio_id
        );
      }

      consultaPatios =
        consultaPatios.order("nome");

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

      const listaVeiculos = veiculosData || [];

      let pagamentosData = [];
      const idsVeiculos = listaVeiculos.map((veiculo) => veiculo.id);

      if (idsVeiculos.length > 0) {
        const {
          data: pagamentosResponse,
          error: pagamentosError,
        } = await supabase
          .from("pagamentos_diarias")
          .select(`
            id,
            veiculo_id,
            patio_id,
            valor,
            forma_pagamento,
            referencia,
            observacoes,
            registrado_por,
            pago_em,
            cancelado,
            created_at
          `)
          .in("veiculo_id", idsVeiculos)
          .eq("cancelado", false)
          .order("pago_em", { ascending: false });

        if (pagamentosError) {
          console.error(
            "Erro ao carregar pagamentos de diárias:",
            pagamentosError
          );
          setPagamentosDisponiveis(false);
        } else {
          pagamentosData = pagamentosResponse || [];
          setPagamentosDisponiveis(true);
        }
      } else {
        setPagamentosDisponiveis(true);
      }

      setVeiculos(listaVeiculos);
      setPatios(patiosData || []);
      setPagamentos(pagamentosData);
    } catch (error) {
      console.error(
        "Erro ao carregar veículos liberados:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os veículos liberados."
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

  function usuarioPodeAcessarVeiculo(veiculo) {
    if (!perfilAtual) {
      return false;
    }

    if (perfilAtual.cargo === "MASTER") {
      return true;
    }

    return (
      Number(veiculo?.patio_id) ===
      Number(perfilAtual.patio_id)
    );
  }

  // =====================================================
  // PAGAMENTOS
  // =====================================================

  function pagamentosDoVeiculo(veiculoId) {
    return pagamentos.filter(
      (pagamento) =>
        String(pagamento.veiculo_id) === String(veiculoId) &&
        !pagamento.cancelado
    );
  }

  function resumoPagamentoVeiculo(veiculo) {
    const cobranca = calcularCobrancaDiarias(veiculo);
    const pagamentosVeiculo = pagamentosDoVeiculo(veiculo?.id);

    const totalPago = pagamentosVeiculo.reduce(
      (total, pagamento) => total + Number(pagamento.valor || 0),
      0
    );

    const totalCobrado = Number(cobranca.totalDiarias || 0);
    const saldo = Math.max(0, totalCobrado - totalPago);

    let statusPagamento = "PENDENTE";

    if (totalCobrado > 0 && saldo <= 0.009) {
      statusPagamento = "PAGO";
    } else if (totalPago > 0) {
      statusPagamento = "PARCIAL";
    }

    return {
      cobranca,
      pagamentos: pagamentosVeiculo,
      totalCobrado,
      totalPago,
      saldo,
      statusPagamento,
    };
  }

  function abrirModalPagamento(veiculo) {
    if (!usuarioPodeAcessarVeiculo(veiculo)) {
      setErro("Você não tem acesso aos pagamentos deste veículo.");
      return;
    }

    if (!pagamentosDisponiveis) {
      setErro(
        "A estrutura de pagamentos ainda não está disponível no banco de dados."
      );
      return;
    }

    if (veiculo.status !== "RETIRADO_LIBERADO") {
      setErro(
        "Finalize a saída do veículo antes de registrar o pagamento das diárias."
      );
      return;
    }

    const resumoPagamento = resumoPagamentoVeiculo(veiculo);

    if (resumoPagamento.totalCobrado <= 0) {
      setErro("Este veículo não possui um valor de diárias para pagamento.");
      return;
    }

    if (resumoPagamento.saldo <= 0.009) {
      setMensagem("As diárias deste veículo já estão totalmente pagas.");
      return;
    }

    setVeiculoSelecionado(veiculo);
    setFormPagamento({
      valor: resumoPagamento.saldo.toFixed(2),
      formaPagamento: "PIX",
      referencia: "",
      observacoes: "",
    });
    setErro("");
    setModalPagamentoAberto(true);
  }

  function alterarCampoPagamento(event) {
    const { name, value } = event.target;

    setFormPagamento((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  async function registrarPagamento() {
    if (!veiculoSelecionado) {
      return;
    }

    if (!usuarioPodeAcessarVeiculo(veiculoSelecionado)) {
      setErro("Você não tem permissão para registrar este pagamento.");
      return;
    }

    const resumoPagamento = resumoPagamentoVeiculo(veiculoSelecionado);
    const valor = normalizarValorDigitado(formPagamento.valor);

    if (!Number.isFinite(valor) || valor <= 0) {
      setErro("Informe um valor de pagamento válido.");
      return;
    }

    if (valor - resumoPagamento.saldo > 0.009) {
      setErro(
        `O pagamento não pode ser maior que o saldo de ${formatarMoeda(
          resumoPagamento.saldo
        )}.`
      );
      return;
    }

    if (!formPagamento.formaPagamento) {
      setErro("Selecione a forma de pagamento.");
      return;
    }

    try {
      setSalvandoPagamento(true);
      setErro("");
      setMensagem("");

      const agora = new Date().toISOString();

      const { data, error } = await supabase
        .from("pagamentos_diarias")
        .insert({
          veiculo_id: veiculoSelecionado.id,
          patio_id: veiculoSelecionado.patio_id,
          valor,
          forma_pagamento: formPagamento.formaPagamento,
          referencia: formPagamento.referencia.trim() || null,
          observacoes: formPagamento.observacoes.trim() || null,
          registrado_por: perfilAtual?.id || null,
          pago_em: agora,
          cancelado: false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPagamentos((anteriores) => [data, ...anteriores]);
      setModalPagamentoAberto(false);
      setFormPagamento({
        valor: "",
        formaPagamento: "PIX",
        referencia: "",
        observacoes: "",
      });

      setMensagem(
        `Pagamento de ${formatarMoeda(valor)} registrado com sucesso.`
      );
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      setErro(
        error?.message ||
          "Não foi possível registrar o pagamento das diárias."
      );
    } finally {
      setSalvandoPagamento(false);
    }
  }

  // =====================================================
  // FILTRO
  // =====================================================

  const veiculosFiltrados = useMemo(() => {
    const termo = pesquisa
      .trim()
      .toLowerCase();

    return veiculos.filter((veiculo) => {
      const retirado =
        veiculo.status ===
        "RETIRADO_LIBERADO";

      if (
        filtro === "AGUARDANDO" &&
        retirado
      ) {
        return false;
      }

      if (
        filtro === "RETIRADOS" &&
        !retirado
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
        veiculo.liberacao_tipo,
        veiculo.liberacao_autorizado_por,
        veiculo.liberacao_responsavel_retirada,
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
  ]);

  // =====================================================
  // CONTADORES
  // =====================================================

  const totalAguardando =
    veiculos.filter(
      (veiculo) =>
        veiculo.status !==
        "RETIRADO_LIBERADO"
    ).length;

  const totalRetirados =
    veiculos.filter(
      (veiculo) =>
        veiculo.status ===
        "RETIRADO_LIBERADO"
    ).length;

  // =====================================================
  // ABRIR VEÍCULO
  // =====================================================

  function abrirVeiculo(veiculo) {
    if (!usuarioPodeAcessarVeiculo(veiculo)) {
      setErro(
        "Você não tem acesso aos veículos deste pátio."
      );
      return;
    }

    setVeiculoSelecionado(veiculo);

    setForm({
      tipoLiberacao:
        veiculo.liberacao_tipo || "",

      autorizadoPor:
        veiculo.liberacao_autorizado_por ||
        "",

      documentoLiberacao:
        veiculo.liberacao_documento || "",

      responsavelRetirada:
        veiculo.liberacao_responsavel_retirada ||
        "",

      documentoRetirada:
        veiculo.liberacao_documento_retirada ||
        "",

      observacoes:
        veiculo.liberacao_observacoes ||
        "",
    });

    setErro("");
    setMensagem("");
  }

  function fecharModal() {
    if (salvando || salvandoPagamento) {
      return;
    }

    setModalPagamentoAberto(false);
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
  // SALVAR DADOS DA LIBERAÇÃO
  // =====================================================

  async function salvarInformacoes() {
    if (!veiculoSelecionado) {
      return;
    }

    if (
      !usuarioPodeAcessarVeiculo(
        veiculoSelecionado
      )
    ) {
      setErro(
        "Você não tem permissão para alterar um veículo de outro pátio."
      );
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const dados = {
        liberacao_tipo:
          form.tipoLiberacao || null,

        liberacao_autorizado_por:
          form.autorizadoPor.trim() ||
          null,

        liberacao_documento:
          form.documentoLiberacao.trim() ||
          null,

        liberacao_responsavel_retirada:
          form.responsavelRetirada.trim() ||
          null,

        liberacao_documento_retirada:
          form.documentoRetirada.trim() ||
          null,

        liberacao_observacoes:
          form.observacoes.trim() ||
          null,

        destino_atual: "LIBERADO",

        status: "LIBERADO",

        liberacao_data:
          veiculoSelecionado.liberacao_data ||
          new Date().toISOString(),
      };

      let consultaAtualizacao = supabase
        .from("veiculos")
        .update(dados)
        .eq(
          "id",
          veiculoSelecionado.id
        );

      if (!ehMaster) {
        consultaAtualizacao =
          consultaAtualizacao.eq(
            "patio_id",
            perfilAtual.patio_id
          );
      }

      const { error } =
        await consultaAtualizacao;

      if (error) {
        throw error;
      }

      setMensagem(
        "Informações da liberação salvas com sucesso."
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
        "Erro ao salvar liberação:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível salvar as informações."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =====================================================
  // FINALIZAR RETIRADA
  // =====================================================

  async function finalizarRetirada() {
    if (!veiculoSelecionado) {
      return;
    }

    if (
      !usuarioPodeAcessarVeiculo(
        veiculoSelecionado
      )
    ) {
      setErro(
        "Você não tem permissão para registrar a saída de um veículo de outro pátio."
      );
      return;
    }

    setErro("");
    setMensagem("");

    if (!form.tipoLiberacao) {
      setErro(
        "Selecione o tipo da liberação."
      );
      return;
    }

    if (
      !form.autorizadoPor.trim()
    ) {
      setErro(
        "Informe quem autorizou a liberação."
      );
      return;
    }

    if (
      !form.responsavelRetirada.trim()
    ) {
      setErro(
        "Informe o nome de quem está retirando o veículo."
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

    const agoraPrevia = new Date().toISOString();
    const cobranca = calcularCobrancaDiarias(
      veiculoSelecionado,
      agoraPrevia
    );

    if (!cobranca.possuiEntrada) {
      setErro(
        "Este veículo não possui uma data de entrada válida. Não é possível calcular as diárias."
      );
      return;
    }

    if (!cobranca.possuiValor) {
      setErro(
        "Este veículo não possui um valor de diária aplicado. Confira a categoria e a tarifa cadastrada para o pátio."
      );
      return;
    }

    const confirmou =
      window.confirm(
        `Confirma a saída do veículo ${veiculoSelecionado.placa} do pátio?\n\n` +
          `Diárias: ${cobranca.quantidadeDiarias}\n` +
          `Valor da diária: ${formatarMoeda(cobranca.valorDiaria)}\n` +
          `Total: ${formatarMoeda(cobranca.totalDiarias)}`
      );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);

      const agora = agoraPrevia;

      const cobrancaFinal = calcularCobrancaDiarias(
        veiculoSelecionado,
        agora
      );

      const dados = {
        liberacao_tipo:
          form.tipoLiberacao,

        liberacao_autorizado_por:
          form.autorizadoPor.trim(),

        liberacao_documento:
          form.documentoLiberacao.trim() ||
          null,

        liberacao_responsavel_retirada:
          form.responsavelRetirada.trim(),

        liberacao_documento_retirada:
          form.documentoRetirada.trim(),

        liberacao_observacoes:
          form.observacoes.trim() ||
          null,

        liberacao_data:
          veiculoSelecionado.liberacao_data ||
          agora,

        liberacao_data_retirada:
          agora,

        // Cobrança congelada no momento da saída
        data_saida_patio:
          agora,

        quantidade_diarias:
          cobrancaFinal.quantidadeDiarias,

        valor_diaria_aplicada:
          cobrancaFinal.valorDiaria,

        total_diarias:
          cobrancaFinal.totalDiarias,

        destino_atual:
          "LIBERADO",

        status:
          "RETIRADO_LIBERADO",
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

      if (!ehMaster) {
        consultaAtualizacao =
          consultaAtualizacao.eq(
            "patio_id",
            perfilAtual.patio_id
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
        "Saída de veículo liberado concluída.",
        `Placa: ${
          veiculoSelecionado.placa ||
          "-"
        }.`,
        `Tipo: ${
          form.tipoLiberacao
        }.`,
        `Autorizado por: ${
          form.autorizadoPor.trim()
        }.`,
        `Retirado por: ${
          form.responsavelRetirada.trim()
        }.`,
        `Documento: ${
          form.documentoRetirada.trim()
        }.`,
        `Diárias: ${cobrancaFinal.quantidadeDiarias}.`,
        `Valor da diária: ${formatarMoeda(cobrancaFinal.valorDiaria)}.`,
        `Total das diárias: ${formatarMoeda(cobrancaFinal.totalDiarias)}.`,
      ].join(" ");

      const {
        error: movimentacaoError,
      } = await supabase
        .from("movimentacoes")
        .insert({
          veiculo_id:
            veiculoSelecionado.id,

          tipo:
            "SAIDA",

          descricao,
        });

      if (movimentacaoError) {
        console.error(
          "Veículo retirado, mas houve erro ao registrar movimentação:",
          movimentacaoError
        );
      }

      setMensagem(
        `Saída do veículo ${veiculoSelecionado.placa} concluída com sucesso.`
      );

      setVeiculoSelecionado(
        null
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao finalizar retirada:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível finalizar a saída do veículo."
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

  const cobrancaSelecionada = veiculoSelecionado
    ? calcularCobrancaDiarias(veiculoSelecionado)
    : null;

  // =====================================================
  // CARREGANDO
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Carregando veículos liberados...
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
            Veículos Liberados
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Controle os veículos que já possuem
            autorização para saída e registre
            corretamente a retirada física do pátio.
          </p>

          <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            🏢 Acesso: {ehMaster
              ? "Todos os pátios"
              : nomePatio(
                  perfilAtual?.patio_id
                )}
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
              setFiltro("AGUARDANDO")
            }
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              filtro === "AGUARDANDO"
                ? "border-blue-300 bg-blue-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >

            <p className="text-sm font-semibold text-amber-700">
              Aguardando retirada
            </p>

            <p className="mt-2 text-3xl font-black text-amber-700">
              {totalAguardando}
            </p>

          </button>

          <button
            type="button"
            onClick={() =>
              setFiltro("RETIRADOS")
            }
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              filtro === "RETIRADOS"
                ? "border-blue-300 bg-blue-50"
                : "border-green-200 bg-green-50"
            }`}
          >

            <p className="text-sm font-semibold text-green-700">
              Retirados
            </p>

            <p className="mt-2 text-3xl font-black text-green-700">
              {totalRetirados}
            </p>

          </button>

        </div>

        {/* =============================================
            PESQUISA
        ============================================== */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">

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
                placeholder="Pesquisar placa, veículo, proprietário ou responsável..."
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
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
            >

              <option value="AGUARDANDO">
                Aguardando retirada
              </option>

              <option value="RETIRADOS">
                Retirados
              </option>

              <option value="TODOS">
                Todos
              </option>

            </select>

          </div>

        </div>

        {/* =============================================
            LISTAGEM
        ============================================== */}

        {veiculosFiltrados.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="text-5xl">
              ✓
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
                const retirado =
                  veiculo.status ===
                  "RETIRADO_LIBERADO";

                return (
                  <div
                    key={veiculo.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >

                    {/* CABEÇALHO CARD */}

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h2 className="text-xl font-black uppercase text-slate-900">
                            {veiculo.placa ||
                              "SEM PLACA"}
                          </h2>

                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                              retirado
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {retirado
                              ? "RETIRADO"
                              : "LIBERADO"}
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

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
                        ✓
                      </div>

                    </div>

                    {/* DADOS */}

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
                          RENAVAM
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.renavam ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Tipo da liberação
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.liberacao_tipo ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Entrada
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatarData(
                            veiculo.data_entrada
                          )}
                        </p>

                      </div>

                    </div>

                    {/* COBRANÇA DE DIÁRIAS */}

                    {(() => {
                      const cobranca = calcularCobrancaDiarias(veiculo);

                      return (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                              Diárias do pátio
                            </p>

                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
                              {veiculo.categoria_cobranca || "Sem categoria"}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase text-amber-600">
                                Diárias
                              </p>
                              <p className="mt-1 font-black text-amber-900">
                                {cobranca.quantidadeDiarias}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase text-amber-600">
                                Valor/dia
                              </p>
                              <p className="mt-1 font-black text-amber-900">
                                {formatarMoeda(cobranca.valorDiaria)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase text-amber-600">
                                Total
                              </p>
                              <p className="mt-1 font-black text-amber-900">
                                {formatarMoeda(cobranca.totalDiarias)}
                              </p>
                            </div>
                          </div>

                          {!cobranca.possuiValor && (
                            <p className="mt-3 text-xs font-semibold text-red-600">
                              Valor da diária ainda não definido para este veículo.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* PAGAMENTO DAS DIÁRIAS */}

                    {retirado && (() => {
                      const pagamento = resumoPagamentoVeiculo(veiculo);

                      return (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Pagamento das diárias
                            </p>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                pagamento.statusPagamento === "PAGO"
                                  ? "bg-green-100 text-green-700"
                                  : pagamento.statusPagamento === "PARCIAL"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {pagamento.statusPagamento}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400">
                                Total
                              </p>
                              <p className="mt-1 text-sm font-black text-slate-800">
                                {formatarMoeda(pagamento.totalCobrado)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400">
                                Pago
                              </p>
                              <p className="mt-1 text-sm font-black text-green-700">
                                {formatarMoeda(pagamento.totalPago)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400">
                                Saldo
                              </p>
                              <p className="mt-1 text-sm font-black text-[#211E1F]">
                                {formatarMoeda(pagamento.saldo)}
                              </p>
                            </div>
                          </div>

                          {pagamento.saldo > 0.009 && pagamentosDisponiveis && (
                            <button
                              type="button"
                              onClick={() => abrirModalPagamento(veiculo)}
                              className="mt-4 w-full rounded-xl bg-[#FFC400] px-4 py-2.5 text-sm font-black text-[#211E1F] transition hover:bg-[#FFD43B]"
                            >
                              Registrar pagamento
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* RETIRADA REALIZADA */}

                    {retirado &&
                      veiculo.liberacao_data_retirada && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                          <p className="text-xs font-black uppercase text-green-600">
                            Saída realizada
                          </p>

                          <p className="mt-1 font-semibold text-green-800">
                            {formatarData(
                              veiculo.liberacao_data_retirada
                            )}
                          </p>

                          {veiculo.liberacao_responsavel_retirada && (
                            <p className="mt-1 text-sm text-green-700">
                              Retirado por:{" "}
                              {
                                veiculo.liberacao_responsavel_retirada
                              }
                            </p>
                          )}

                        </div>
                      )}

                    {/* BOTÃO */}

                    <button
                      type="button"
                      onClick={() =>
                        abrirVeiculo(
                          veiculo
                        )
                      }
                      className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black transition ${
                        retirado
                          ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {retirado
                        ? "Ver informações da saída"
                        : "Registrar saída"}
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

                <p className="text-xs font-black uppercase tracking-wide text-green-600">
                  Veículo liberado
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
                onClick={fecharModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>

            </div>

            <div className="p-6">

              {/* VEÍCULO */}

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
                  COBRANÇA DE DIÁRIAS
              ========================================== */}

              {cobrancaSelecionada && (
                <div className="mb-7 overflow-hidden rounded-2xl border border-amber-300 bg-[#211E1F] shadow-sm">
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-[#FFC400]">
                          Cobrança de diárias
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">
                          Valor da permanência no pátio
                        </h3>
                      </div>

                      <span className="w-fit rounded-full bg-[#FFC400] px-3 py-1.5 text-xs font-black text-[#211E1F]">
                        {veiculoSelecionado.categoria_cobranca || "SEM CATEGORIA"}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                        Entrada
                      </p>
                      <p className="mt-1 text-sm font-bold text-white">
                        {formatarData(veiculoSelecionado.data_entrada)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                        Diárias
                      </p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {cobrancaSelecionada.quantidadeDiarias}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                        Valor da diária
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {formatarMoeda(cobrancaSelecionada.valorDiaria)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#FFC400] p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#211E1F]/70">
                        Total
                      </p>
                      <p className="mt-1 text-xl font-black text-[#211E1F]">
                        {formatarMoeda(cobrancaSelecionada.totalDiarias)}
                      </p>
                    </div>
                  </div>

                  {veiculoSelecionado.status !== "RETIRADO_LIBERADO" && (
                    <div className="border-t border-white/10 px-5 py-3 text-xs font-semibold text-white/60">
                      Valor estimado até este momento. O total definitivo é congelado ao registrar a saída.
                    </div>
                  )}

                  {!cobrancaSelecionada.possuiValor && (
                    <div className="border-t border-red-400/30 bg-red-500/10 px-5 py-3 text-xs font-bold text-red-200">
                      Este veículo ainda não possui valor de diária aplicado. Verifique a tarifa do pátio e a categoria de cobrança.
                    </div>
                  )}
                </div>
              )}

              {/* =========================================
                  PAGAMENTO DAS DIÁRIAS
              ========================================== */}

              {veiculoSelecionado.status === "RETIRADO_LIBERADO" && (() => {
                const pagamento = resumoPagamentoVeiculo(veiculoSelecionado);

                return (
                  <div className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-[#A89610]">
                            Pagamentos
                          </p>
                          <h3 className="mt-1 text-lg font-black text-slate-900">
                            Pagamento das diárias
                          </h3>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${
                            pagamento.statusPagamento === "PAGO"
                              ? "bg-green-100 text-green-700"
                              : pagamento.statusPagamento === "PARCIAL"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pagamento.statusPagamento}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 p-5 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Total das diárias
                        </p>
                        <p className="mt-1 text-xl font-black text-slate-900">
                          {formatarMoeda(pagamento.totalCobrado)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-green-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wide text-green-600">
                          Total pago
                        </p>
                        <p className="mt-1 text-xl font-black text-green-800">
                          {formatarMoeda(pagamento.totalPago)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#FFC400] p-4">
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#211E1F]/70">
                          Saldo
                        </p>
                        <p className="mt-1 text-xl font-black text-[#211E1F]">
                          {formatarMoeda(pagamento.saldo)}
                        </p>
                      </div>
                    </div>

                    {!pagamentosDisponiveis && (
                      <div className="mx-5 mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                        A tabela de pagamentos ainda não está disponível. Execute o SQL de configuração antes de registrar pagamentos.
                      </div>
                    )}

                    {pagamento.saldo > 0.009 && pagamentosDisponiveis && (
                      <div className="px-5 pb-5">
                        <button
                          type="button"
                          onClick={() => abrirModalPagamento(veiculoSelecionado)}
                          className="w-full rounded-xl bg-[#211E1F] px-5 py-3 text-sm font-black text-[#FFC400] transition hover:bg-[#2b2829] sm:w-auto"
                        >
                          + Registrar pagamento
                        </button>
                      </div>
                    )}

                    <div className="border-t border-slate-200 px-5 py-4">
                      <h4 className="text-sm font-black text-slate-900">
                        Histórico de pagamentos
                      </h4>

                      {pagamento.pagamentos.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Nenhum pagamento registrado para este veículo.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {pagamento.pagamentos.map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-black text-slate-800">
                                  {formatarMoeda(item.valor)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatarFormaPagamento(item.forma_pagamento)} • {formatarData(item.pago_em)}
                                </p>
                                {item.referencia && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Referência: {item.referencia}
                                  </p>
                                )}
                                {item.observacoes && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.observacoes}
                                  </p>
                                )}
                              </div>

                              <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-[10px] font-black uppercase text-green-700">
                                Registrado
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* =========================================
                  DADOS DA LIBERAÇÃO
              ========================================== */}

              <div>

                <h3 className="text-lg font-black text-slate-900">
                  Dados da liberação
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Registre quem autorizou a saída
                  do veículo.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Tipo da liberação *
                    </label>

                    <select
                      name="tipoLiberacao"
                      value={
                        form.tipoLiberacao
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_LIBERADO"
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    >

                      <option value="">
                        Selecione
                      </option>

                      {TIPOS_LIBERACAO.map(
                        (tipo) => (
                          <option
                            key={tipo}
                            value={tipo}
                          >
                            {tipo}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Autorizado por *
                    </label>

                    <input
                      type="text"
                      name="autorizadoPor"
                      value={
                        form.autorizadoPor
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_LIBERADO"
                      }
                      placeholder="Nome, órgão, seguradora..."
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Documento / autorização
                    </label>

                    <input
                      type="text"
                      name="documentoLiberacao"
                      value={
                        form.documentoLiberacao
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_LIBERADO"
                      }
                      placeholder="Número do documento, protocolo, autorização..."
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                </div>

              </div>

              {/* =========================================
                  RESPONSÁVEL PELA RETIRADA
              ========================================== */}

              <div className="mt-8 border-t border-slate-200 pt-6">

                <h3 className="text-lg font-black text-slate-900">
                  Responsável pela retirada
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Informe quem está fisicamente
                  retirando o veículo do pátio.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Nome completo *
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
                        "RETIRADO_LIBERADO"
                      }
                      placeholder="Nome de quem está retirando"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Documento *
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
                        "RETIRADO_LIBERADO"
                      }
                      placeholder="CPF, RG, CNH ou documento"
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
                    "RETIRADO_LIBERADO"
                  }
                  rows={4}
                  placeholder="Documentação apresentada, condições da entrega ou outras informações..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                />

              </div>

              {/* =========================================
                  RETIRADA FINALIZADA
              ========================================== */}

              {veiculoSelecionado.status ===
                "RETIRADO_LIBERADO" && (
                <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5">

                  <p className="font-black text-green-800">
                    ✓ Saída do veículo concluída
                  </p>

                  <p className="mt-2 text-sm text-green-700">
                    Data da retirada:{" "}
                    {formatarData(
                      veiculoSelecionado.liberacao_data_retirada
                    )}
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Responsável:{" "}
                    {
                      veiculoSelecionado.liberacao_responsavel_retirada ||
                      "-"
                    }
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Documento:{" "}
                    {
                      veiculoSelecionado.liberacao_documento_retirada ||
                      "-"
                    }
                  </p>

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

                {veiculoSelecionado.status !==
                  "RETIRADO_LIBERADO" && (
                  <>
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
                      {salvando
                        ? "Salvando..."
                        : "Salvar informações"}
                    </button>

                    <button
                      type="button"
                      onClick={
                        finalizarRetirada
                      }
                      disabled={
                        salvando
                      }
                      className="rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {salvando
                        ? "Processando..."
                        : "✓ Registrar saída do pátio"}
                    </button>
                  </>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ===============================================
          MODAL DE PAGAMENTO
      ================================================ */}

      {modalPagamentoAberto && veiculoSelecionado && (() => {
        const pagamento = resumoPagamentoVeiculo(veiculoSelecionado);

        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#211E1F] px-6 py-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#FFC400]">
                    Pagamento de diárias
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    {veiculoSelecionado.placa || "Veículo"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => !salvandoPagamento && setModalPagamentoAberto(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-bold text-white hover:bg-white/20"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {formatarMoeda(pagamento.totalCobrado)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-[10px] font-black uppercase text-green-600">
                      Pago
                    </p>
                    <p className="mt-1 font-black text-green-800">
                      {formatarMoeda(pagamento.totalPago)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FFC400] p-4">
                    <p className="text-[10px] font-black uppercase text-[#211E1F]/70">
                      Saldo
                    </p>
                    <p className="mt-1 font-black text-[#211E1F]">
                      {formatarMoeda(pagamento.saldo)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Valor do pagamento *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="valor"
                      value={formPagamento.valor}
                      onChange={alterarCampoPagamento}
                      placeholder="0,00"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Forma de pagamento *
                    </label>
                    <select
                      name="formaPagamento"
                      value={formPagamento.formaPagamento}
                      onChange={alterarCampoPagamento}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
                    >
                      {FORMAS_PAGAMENTO.map((forma) => (
                        <option key={forma.value} value={forma.value}>
                          {forma.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Referência / comprovante
                    </label>
                    <input
                      type="text"
                      name="referencia"
                      value={formPagamento.referencia}
                      onChange={alterarCampoPagamento}
                      placeholder="Ex.: ID do PIX, número do recibo, NSU..."
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Observações
                    </label>
                    <textarea
                      name="observacoes"
                      value={formPagamento.observacoes}
                      onChange={alterarCampoPagamento}
                      rows={3}
                      placeholder="Informações adicionais sobre o pagamento..."
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#FFC400]"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModalPagamentoAberto(false)}
                    disabled={salvandoPagamento}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={registrarPagamento}
                    disabled={salvandoPagamento}
                    className="rounded-xl bg-[#FFC400] px-5 py-3 text-sm font-black text-[#211E1F] transition hover:bg-[#FFD43B] disabled:opacity-50"
                  >
                    {salvandoPagamento
                      ? "Registrando..."
                      : "Confirmar pagamento"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}