import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

const BUCKET_BOLETOS = "financeiro-boletos";

const CATEGORIAS_RECEITA = [
  "GUINCHO",
  "DIÁRIAS",
  "LIBERAÇÃO",
  "SERVIÇOS",
  "LEILÃO",
  "REEMBOLSO",
  "TAXAS",
  "OUTRAS RECEITAS",
];

const CATEGORIAS_DESPESA = [
  "COMBUSTÍVEL",
  "MANUTENÇÃO",
  "SALÁRIOS",
  "ALUGUEL",
  "ENERGIA",
  "ÁGUA",
  "INTERNET",
  "IMPOSTOS",
  "FORNECEDORES",
  "SERVIÇOS TERCEIRIZADOS",
  "EQUIPAMENTOS",
  "MATERIAL DE ESCRITÓRIO",
  "OUTRAS DESPESAS",
];

const FORMAS_PAGAMENTO = [
  "PIX",
  "DINHEIRO",
  "TRANSFERÊNCIA",
  "BOLETO",
  "CARTÃO DE CRÉDITO",
  "CARTÃO DE DÉBITO",
  "CHEQUE",
  "OUTRO",
];

const TIPOS_ARQUIVO = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const TAMANHO_MAXIMO = 10 * 1024 * 1024;

function obterHoje() {
  const agora = new Date();

  const ano = agora.getFullYear();

  const mes = String(
    agora.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    agora.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterMesAtual() {
  const agora = new Date();

  const ano = agora.getFullYear();

  const mes = String(
    agora.getMonth() + 1
  ).padStart(2, "0");

  return `${ano}-${mes}`;
}

function formatarMoeda(valor) {
  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatarData(data) {
  if (!data) {
    return "-";
  }

  return new Date(
    `${data}T12:00:00`
  ).toLocaleDateString("pt-BR");
}

function formatarDataHora(data) {
  if (!data) {
    return "-";
  }

  return new Date(
    data
  ).toLocaleString("pt-BR");
}

function converterValor(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
  ) {
    return null;
  }

  let texto = String(valor)
    .trim()
    .replace("R$", "")
    .replace(/\s/g, "");

  if (
    texto.includes(".") &&
    texto.includes(",")
  ) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (
    texto.includes(",")
  ) {
    texto = texto.replace(",", ".");
  }

  const numero = Number(texto);

  if (Number.isNaN(numero)) {
    return null;
  }

  return numero;
}

function limparNomeArquivo(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatarFormaPagamentoDiaria(forma) {
  const nomes = {
    PIX: "PIX",
    DINHEIRO: "Dinheiro",
    CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito",
    TRANSFERENCIA: "Transferência",
    BOLETO: "Boleto",
    OUTRO: "Outro",
  };

  return nomes[forma] || forma || "Não informado";
}

export default function Financial() {
  const {
    perfil,
    user,
    isMaster,
  } = useAuth();

  const [lancamentos, setLancamentos] =
    useState([]);

  const [patios, setPatios] =
    useState([]);

  // Pagamentos de diárias registrados na tela de veículos liberados
  const [pagamentosDiarias, setPagamentosDiarias] =
    useState([]);

  const [veiculosPagamentos, setVeiculosPagamentos] =
    useState([]);

  const [erroPagamentosDiarias, setErroPagamentosDiarias] =
    useState("");

  const [estornandoPagamentoDiaria, setEstornandoPagamentoDiaria] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [pesquisa, setPesquisa] =
    useState("");

  const [mesFiltro, setMesFiltro] =
    useState(obterMesAtual());

  const [patioFiltro, setPatioFiltro] =
    useState("TODOS");

  const [tipoFiltro, setTipoFiltro] =
    useState("TODOS");

  const [statusFiltro, setStatusFiltro] =
    useState("TODOS");

  const [valorMinimo, setValorMinimo] =
    useState("");

  const [valorMaximo, setValorMaximo] =
    useState("");

  const [
    somenteComBoleto,
    setSomenteComBoleto,
  ] = useState(false);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [editandoId, setEditandoId] =
    useState(null);

  const [
    arquivoBoleto,
    setArquivoBoleto,
  ] = useState(null);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [form, setForm] = useState({
    tipo: "RECEITA",
    categoria: "",
    descricao: "",
    valor: "",
    status: "PENDENTE",
    dataVencimento: obterHoje(),
    formaPagamento: "",
    documentoReferencia: "",
    observacoes: "",
    patioId: "",
  });

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

      setErroPagamentosDiarias("");

      let consulta = supabase
        .from("financeiro")
        .select("*")
        .order(
          "data_vencimento",
          {
            ascending: false,
          }
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      let consultaPagamentosDiarias = supabase
        .from("pagamentos_diarias")
        .select(
          "id, veiculo_id, patio_id, valor, forma_pagamento, referencia, observacoes, registrado_por, pago_em, cancelado, cancelado_em, motivo_cancelamento, created_at, updated_at"
        )
        .order(
          "pago_em",
          { ascending: false }
        );

      if (!isMaster) {
        if (!perfil?.patio_id) {
          setErro(
            "Sua conta ainda não possui um pátio vinculado."
          );

          setLancamentos([]);

          return;
        }

        consulta = consulta.eq(
          "patio_id",
          perfil.patio_id
        );

        consultaPagamentosDiarias =
          consultaPagamentosDiarias.eq(
            "patio_id",
            perfil.patio_id
          );
      }

      const [
        financeiroResponse,
        patiosResponse,
        pagamentosDiariasResponse,
      ] = await Promise.all([
        consulta,

        supabase
          .from("patios")
          .select(
            "id, nome, cidade, estado, ativo"
          )
          .order("nome"),

        consultaPagamentosDiarias,
      ]);

      if (financeiroResponse.error) {
        throw financeiroResponse.error;
      }

      if (patiosResponse.error) {
        console.error(
          "Erro ao carregar pátios:",
          patiosResponse.error
        );
      }

      let pagamentosCarregados = [];

      if (pagamentosDiariasResponse.error) {
        console.error(
          "Erro ao carregar pagamentos de diárias:",
          pagamentosDiariasResponse.error
        );

        setErroPagamentosDiarias(
          `Não foi possível carregar os pagamentos de diárias: ${pagamentosDiariasResponse.error?.message || "erro desconhecido do Supabase"}`
        );
      } else {
        pagamentosCarregados =
          pagamentosDiariasResponse.data || [];
      }

      setLancamentos(
        financeiroResponse.data || []
      );

      setPatios(
        patiosResponse.data || []
      );

      setPagamentosDiarias(
        pagamentosCarregados
      );

      const idsVeiculosPagamentos = [
        ...new Set(
          pagamentosCarregados
            .map((item) => item.veiculo_id)
            .filter(Boolean)
        ),
      ];

      if (idsVeiculosPagamentos.length > 0) {
        let consultaVeiculosPagamentos = supabase
          .from("veiculos")
          .select(
            "id, placa, marca, modelo, proprietario, patio_id, quantidade_diarias, valor_diaria_aplicada, total_diarias"
          )
          .in(
            "id",
            idsVeiculosPagamentos
          );

        if (!isMaster) {
          consultaVeiculosPagamentos =
            consultaVeiculosPagamentos.eq(
              "patio_id",
              perfil.patio_id
            );
        }

        const {
          data: veiculosPagamentosData,
          error: veiculosPagamentosError,
        } = await consultaVeiculosPagamentos;

        if (veiculosPagamentosError) {
          console.error(
            "Erro ao carregar veículos dos pagamentos:",
            veiculosPagamentosError
          );

          setVeiculosPagamentos([]);
        } else {
          setVeiculosPagamentos(
            veiculosPagamentosData || []
          );
        }
      } else {
        setVeiculosPagamentos([]);
      }
    } catch (error) {
      console.error(
        "Erro ao carregar financeiro:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar o financeiro."
      );
    } finally {
      setLoading(false);
    }
  }

  function nomePatio(patioId) {
    const patio = patios.find(
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
  // CONTROLE DE ACESSO POR PÁTIO
  // =====================================================

  function podeAcessarLancamento(item) {
    if (isMaster) {
      return true;
    }

    if (!perfil?.patio_id) {
      return false;
    }

    return (
      String(item?.patio_id) ===
      String(perfil.patio_id)
    );
  }

  function validarAcessoLancamento(item) {
    if (podeAcessarLancamento(item)) {
      return true;
    }

    setErro(
      "Você não tem acesso a lançamentos de outro pátio."
    );

    return false;
  }

  function aplicarFiltroPatio(consulta) {
    if (isMaster) {
      return consulta;
    }

    return consulta.eq(
      "patio_id",
      perfil?.patio_id
    );
  }

  const lancamentosPeriodo =
    useMemo(() => {
      return lancamentos.filter(
        (item) => {
          if (
            mesFiltro &&
            !String(
              item.data_vencimento
            ).startsWith(
              mesFiltro
            )
          ) {
            return false;
          }

          if (
            isMaster &&
            patioFiltro !==
              "TODOS" &&
            String(
              item.patio_id
            ) !==
              String(
                patioFiltro
              )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      lancamentos,
      mesFiltro,
      patioFiltro,
      isMaster,
    ]);

  const lancamentosFiltrados =
    useMemo(() => {
      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      const minimo =
        valorMinimo.trim()
          ? converterValor(
              valorMinimo
            )
          : null;

      const maximo =
        valorMaximo.trim()
          ? converterValor(
              valorMaximo
            )
          : null;

      return lancamentosPeriodo.filter(
        (item) => {
          if (
            tipoFiltro !==
              "TODOS" &&
            item.tipo !==
              tipoFiltro
          ) {
            return false;
          }

          if (
            statusFiltro !==
              "TODOS" &&
            item.status !==
              statusFiltro
          ) {
            return false;
          }

          const valor =
            Number(
              item.valor || 0
            );

          if (
            minimo !== null &&
            valor < minimo
          ) {
            return false;
          }

          if (
            maximo !== null &&
            valor > maximo
          ) {
            return false;
          }

          if (
            somenteComBoleto &&
            !item.boleto_path
          ) {
            return false;
          }

          if (!termo) {
            return true;
          }

          const texto = [
            item.descricao,
            item.categoria,
            item.tipo,
            item.status,
            item.forma_pagamento,
            item.documento_referencia,
            item.boleto_nome,
            item.criado_por_nome,
            nomePatio(
              item.patio_id
            ),
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
      lancamentosPeriodo,
      pesquisa,
      tipoFiltro,
      statusFiltro,
      valorMinimo,
      valorMaximo,
      somenteComBoleto,
      patios,
    ]);

  // =====================================================
  // PAGAMENTOS DE DIÁRIAS
  // =====================================================

  const pagamentosDiariasPeriodo =
    useMemo(() => {
      return pagamentosDiarias.filter(
        (item) => {
          const dataPagamento =
            item.pago_em ||
            item.created_at;

          if (
            mesFiltro &&
            !String(
              dataPagamento || ""
            ).startsWith(
              mesFiltro
            )
          ) {
            return false;
          }

          if (
            isMaster &&
            patioFiltro !== "TODOS" &&
            String(item.patio_id) !==
              String(patioFiltro)
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      pagamentosDiarias,
      mesFiltro,
      patioFiltro,
      isMaster,
    ]);

  const resumoPagamentosDiarias =
    useMemo(() => {
      const ativos =
        pagamentosDiariasPeriodo.filter(
          (item) => !item.cancelado
        );

      const totalRecebido =
        ativos.reduce(
          (total, item) =>
            total +
            Number(item.valor || 0),
          0
        );

      const veiculos = new Set(
        ativos
          .map((item) => item.veiculo_id)
          .filter(Boolean)
      );

      return {
        totalRecebido,
        quantidadePagamentos:
          ativos.length,
        quantidadeVeiculos:
          veiculos.size,
        ticketMedio:
          ativos.length > 0
            ? totalRecebido /
              ativos.length
            : 0,
        estornados:
          pagamentosDiariasPeriodo.filter(
            (item) => item.cancelado
          ).length,
      };
    }, [
      pagamentosDiariasPeriodo,
    ]);

  function veiculoDoPagamento(veiculoId) {
    return veiculosPagamentos.find(
      (item) =>
        String(item.id) ===
        String(veiculoId)
    );
  }

  async function estornarPagamentoDiaria(item) {
    if (!item || item.cancelado) {
      return;
    }

    if (
      !isMaster &&
      String(item.patio_id) !==
        String(perfil?.patio_id)
    ) {
      setErro(
        "Você não tem acesso a pagamentos de outro pátio."
      );
      return;
    }

    const motivo = window.prompt(
      `Informe o motivo do estorno do pagamento de ${formatarMoeda(
        item.valor
      )}:`
    );

    if (motivo === null) {
      return;
    }

    if (!motivo.trim()) {
      setErro(
        "Informe o motivo do estorno do pagamento de diária."
      );
      return;
    }

    const confirmou = window.confirm(
      `Confirma o estorno de ${formatarMoeda(
        item.valor
      )}?\n\nO pagamento deixará de compor o total recebido das diárias.`
    );

    if (!confirmou) {
      return;
    }

    try {
      setEstornandoPagamentoDiaria(
        item.id
      );
      setErro("");
      setMensagem("");

      const agora =
        new Date().toISOString();

      let consultaEstorno = supabase
        .from("pagamentos_diarias")
        .update({
          cancelado: true,
          cancelado_em: agora,
          motivo_cancelamento:
            motivo.trim(),
          updated_at: agora,
        })
        .eq("id", item.id);

      if (!isMaster) {
        consultaEstorno =
          consultaEstorno.eq(
            "patio_id",
            perfil?.patio_id
          );
      }

      const { error } =
        await consultaEstorno;

      if (error) {
        throw error;
      }

      setMensagem(
        "Pagamento de diária estornado com sucesso."
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao estornar pagamento de diária:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível estornar o pagamento de diária."
      );
    } finally {
      setEstornandoPagamentoDiaria(
        null
      );
    }
  }

  const resumo =
    useMemo(() => {
      let receitas = 0;
      let despesas = 0;
      let pendentes = 0;

      lancamentosPeriodo.forEach(
        (item) => {
          if (
            item.status ===
            "CANCELADO"
          ) {
            return;
          }

          const valor =
            Number(
              item.valor || 0
            );

          if (
            item.status ===
            "PENDENTE"
          ) {
            pendentes += valor;
            return;
          }

          if (
            item.status !==
            "PAGO"
          ) {
            return;
          }

          if (
            item.tipo ===
            "RECEITA"
          ) {
            receitas += valor;
          }

          if (
            item.tipo ===
            "DESPESA"
          ) {
            despesas += valor;
          }
        }
      );

      return {
        receitas,
        despesas,
        resultado:
          receitas -
          despesas,
        pendentes,
      };
    }, [
      lancamentosPeriodo,
    ]);

  function limparFormulario() {
    setEditandoId(null);
    setArquivoBoleto(null);

    setForm({
      tipo: "RECEITA",
      categoria: "",
      descricao: "",
      valor: "",
      status: "PENDENTE",
      dataVencimento:
        obterHoje(),
      formaPagamento: "",
      documentoReferencia: "",
      observacoes: "",
      patioId:
        isMaster
          ? ""
          : String(
              perfil?.patio_id ||
                ""
            ),
    });
  }

  function abrirNovo() {
    if (!isMaster && !perfil?.patio_id) {
      setErro(
        "Sua conta ainda não possui um pátio vinculado."
      );
      return;
    }

    limparFormulario();

    setErro("");
    setMensagem("");

    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setMostrarFormulario(false);
    limparFormulario();
  }

  function editarLancamento(item) {
    if (!validarAcessoLancamento(item)) {
      return;
    }

    setEditandoId(item.id);

    setArquivoBoleto(null);

    setForm({
      tipo:
        item.tipo,

      categoria:
        item.categoria || "",

      descricao:
        item.descricao || "",

      valor:
        String(
          item.valor ?? ""
        ),

      status:
        item.status ||
        "PENDENTE",

      dataVencimento:
        item.data_vencimento ||
        obterHoje(),

      formaPagamento:
        item.forma_pagamento ||
        "",

      documentoReferencia:
        item.documento_referencia ||
        "",

      observacoes:
        item.observacoes ||
        "",

      patioId:
        String(
          item.patio_id ||
            ""
        ),
    });

    setMostrarFormulario(true);

    setErro("");
    setMensagem("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function alterarCampo(event) {
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
          name === "tipo"
        ) {
          novo.categoria = "";
        }

        return novo;
      }
    );
  }

  const categorias =
    form.tipo ===
    "RECEITA"
      ? CATEGORIAS_RECEITA
      : CATEGORIAS_DESPESA;

  const lancamentoEditando =
    useMemo(() => {
      if (!editandoId) {
        return null;
      }

      return lancamentos.find(
        (item) =>
          item.id ===
          editandoId
      );
    }, [
      editandoId,
      lancamentos,
    ]);

  function selecionarBoleto(
    event
  ) {
    const arquivo =
      event.target.files?.[0];

    if (!arquivo) {
      return;
    }

    setErro("");

    if (
      !TIPOS_ARQUIVO.includes(
        arquivo.type
      )
    ) {
      setErro(
        "O boleto deve ser PDF, JPG, PNG ou WEBP."
      );

      event.target.value = "";

      return;
    }

    if (
      arquivo.size >
      TAMANHO_MAXIMO
    ) {
      setErro(
        "O arquivo pode ter no máximo 10 MB."
      );

      event.target.value = "";

      return;
    }

    setArquivoBoleto(
      arquivo
    );
  }

  async function enviarBoleto(
    arquivo,
    patioId
  ) {
    const nome =
      limparNomeArquivo(
        arquivo.name
      );

    const identificador =
      crypto.randomUUID();

    const path =
      `${patioId}/${identificador}-${nome}`;

    const {
      error,
    } = await supabase.storage
      .from(
        BUCKET_BOLETOS
      )
      .upload(
        path,
        arquivo,
        {
          cacheControl:
            "3600",

          upsert: false,

          contentType:
            arquivo.type,
        }
      );

    if (error) {
      throw error;
    }

    return {
      path,
      nome:
        arquivo.name,
      tipo:
        arquivo.type,
      tamanho:
        arquivo.size,
      enviadoEm:
        new Date().toISOString(),
    };
  }

  async function abrirBoleto(
    item
  ) {
    if (!validarAcessoLancamento(item)) {
      return;
    }

    if (!item.boleto_path) {
      return;
    }

    try {
      setErro("");

      const {
        data,
        error,
      } = await supabase.storage
        .from(
          BUCKET_BOLETOS
        )
        .createSignedUrl(
          item.boleto_path,
          120
        );

      if (error) {
        throw error;
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Erro ao abrir boleto:",
        error
      );

      setErro(
        "Não foi possível abrir o boleto."
      );
    }
  }

  async function removerBoleto(
    item
  ) {
    if (!validarAcessoLancamento(item)) {
      return;
    }

    if (!item.boleto_path) {
      return;
    }

    const confirmou =
      window.confirm(
        `Deseja remover o boleto "${item.boleto_nome}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setErro("");

      let consultaRemoverBoleto = supabase
        .from("financeiro")
        .update({
          boleto_path: null,
          boleto_nome: null,
          boleto_tipo: null,
          boleto_tamanho: null,
          boleto_enviado_em:
            null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          item.id
        );

      consultaRemoverBoleto =
        aplicarFiltroPatio(
          consultaRemoverBoleto
        );

      const {
        error: updateError,
      } = await consultaRemoverBoleto;

      if (updateError) {
        throw updateError;
      }

      const {
        error: storageError,
      } = await supabase.storage
        .from(
          BUCKET_BOLETOS
        )
        .remove([
          item.boleto_path,
        ]);

      if (storageError) {
        console.error(
          "Erro ao remover arquivo:",
          storageError
        );
      }

      setMensagem(
        "Boleto removido do lançamento."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível remover o boleto."
      );
    }
  }

  async function salvarLancamento(
    event
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    const valor =
      converterValor(
        form.valor
      );

    const patioIdEfetivo =
      isMaster
        ? form.patioId
        : String(
            perfil?.patio_id ||
              ""
          );

    if (!patioIdEfetivo) {
      setErro(
        isMaster
          ? "Selecione o pátio."
          : "Sua conta ainda não possui um pátio vinculado."
      );
      return;
    }

    if (
      editandoId &&
      lancamentoEditando &&
      !podeAcessarLancamento(
        lancamentoEditando
      )
    ) {
      setErro(
        "Você não pode editar um lançamento de outro pátio."
      );
      return;
    }

    if (!form.categoria) {
      setErro(
        "Selecione a categoria."
      );
      return;
    }

    if (
      !form.descricao.trim()
    ) {
      setErro(
        "Informe a descrição."
      );
      return;
    }

    if (
      valor === null ||
      valor <= 0
    ) {
      setErro(
        "Informe um valor válido."
      );
      return;
    }

    if (
      !form.dataVencimento
    ) {
      setErro(
        "Informe a data de vencimento."
      );
      return;
    }

    let novoBoleto = null;

    try {
      setSalvando(true);

      if (arquivoBoleto) {
        novoBoleto =
          await enviarBoleto(
            arquivoBoleto,
            patioIdEfetivo
          );
      }

      const agora =
        new Date().toISOString();

      const dados = {
        patio_id:
          Number(
            patioIdEfetivo
          ),

        tipo:
          form.tipo,

        categoria:
          form.categoria,

        descricao:
          form.descricao.trim(),

        valor,

        status:
          form.status,

        data_vencimento:
          form.dataVencimento,

        data_pagamento:
          form.status ===
          "PAGO"
            ? lancamentoEditando
                ?.data_pagamento ||
              agora
            : null,

        forma_pagamento:
          form.formaPagamento ||
          null,

        documento_referencia:
          form.documentoReferencia
            .trim() ||
          null,

        observacoes:
          form.observacoes
            .trim() ||
          null,

        updated_at:
          agora,
      };

      if (novoBoleto) {
        dados.boleto_path =
          novoBoleto.path;

        dados.boleto_nome =
          novoBoleto.nome;

        dados.boleto_tipo =
          novoBoleto.tipo;

        dados.boleto_tamanho =
          novoBoleto.tamanho;

        dados.boleto_enviado_em =
          novoBoleto.enviadoEm;
      }

      if (editandoId) {
        let consultaAtualizacao = supabase
          .from(
            "financeiro"
          )
          .update(dados)
          .eq(
            "id",
            editandoId
          );

        consultaAtualizacao =
          aplicarFiltroPatio(
            consultaAtualizacao
          );

        const {
          error,
        } = await consultaAtualizacao;

        if (error) {
          if (
            novoBoleto?.path
          ) {
            await supabase.storage
              .from(
                BUCKET_BOLETOS
              )
              .remove([
                novoBoleto.path,
              ]);
          }

          throw error;
        }

        if (
          novoBoleto &&
          lancamentoEditando
            ?.boleto_path &&
          lancamentoEditando
            .boleto_path !==
            novoBoleto.path
        ) {
          await supabase.storage
            .from(
              BUCKET_BOLETOS
            )
            .remove([
              lancamentoEditando
                .boleto_path,
            ]);
        }

        setMensagem(
          "Lançamento atualizado com sucesso."
        );
      } else {
        const {
          error,
        } = await supabase
          .from(
            "financeiro"
          )
          .insert({
            ...dados,

            created_by:
              user?.id ||
              null,

            criado_por_nome:
              perfil?.nome ||
              user?.email ||
              "Usuário",

            created_at:
              agora,
          });

        if (error) {
          if (
            novoBoleto?.path
          ) {
            await supabase.storage
              .from(
                BUCKET_BOLETOS
              )
              .remove([
                novoBoleto.path,
              ]);
          }

          throw error;
        }

        setMensagem(
          "Lançamento cadastrado com sucesso."
        );
      }

      setMostrarFormulario(
        false
      );

      limparFormulario();

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao salvar lançamento:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível salvar o lançamento."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function darBaixa(item) {
    if (!validarAcessoLancamento(item)) {
      return;
    }

    const confirmou =
      window.confirm(
        item.tipo ===
        "RECEITA"
          ? `Confirmar recebimento de ${formatarMoeda(
              item.valor
            )}?`
          : `Confirmar pagamento de ${formatarMoeda(
              item.valor
            )}?`
      );

    if (!confirmou) {
      return;
    }

    try {
      const agora =
        new Date().toISOString();

      let consultaBaixa = supabase
        .from("financeiro")
        .update({
          status:
            "PAGO",

          data_pagamento:
            agora,

          updated_at:
            agora,
        })
        .eq(
          "id",
          item.id
        );

      consultaBaixa =
        aplicarFiltroPatio(
          consultaBaixa
        );

      const {
        error,
      } = await consultaBaixa;

      if (error) {
        throw error;
      }

      setMensagem(
        item.tipo ===
        "RECEITA"
          ? "Recebimento confirmado."
          : "Pagamento confirmado."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível finalizar."
      );
    }
  }

  async function estornarPagamento(
    item
  ) {
    if (!validarAcessoLancamento(item)) {
      return;
    }

    if (
      item.status !==
      "PAGO"
    ) {
      return;
    }

    const motivo =
      window.prompt(
        item.tipo ===
        "RECEITA"
          ? "Informe o motivo do estorno do recebimento:"
          : "Informe o motivo do estorno do pagamento:"
      );

    if (
      motivo === null
    ) {
      return;
    }

    if (!motivo.trim()) {
      setErro(
        "Informe o motivo do estorno."
      );
      return;
    }

    const confirmou =
      window.confirm(
        `Confirma o estorno de ${formatarMoeda(
          item.valor
        )}?\n\nO lançamento voltará para PENDENTE.`
      );

    if (!confirmou) {
      return;
    }

    try {
      const agora =
        new Date().toISOString();

      const quantidade =
        Number(
          item.quantidade_estornos ||
            0
        ) + 1;

      let consultaEstorno = supabase
        .from("financeiro")
        .update({
          status:
            "PENDENTE",

          data_pagamento:
            null,

          estornado_em:
            agora,

          estorno_motivo:
            motivo.trim(),

          estornado_por:
            user?.id ||
            null,

          estornado_por_nome:
            perfil?.nome ||
            user?.email ||
            "Usuário",

          quantidade_estornos:
            quantidade,

          updated_at:
            agora,
        })
        .eq(
          "id",
          item.id
        );

      consultaEstorno =
        aplicarFiltroPatio(
          consultaEstorno
        );

      const {
        error,
      } = await consultaEstorno;

      if (error) {
        throw error;
      }

      setMensagem(
        "Estorno realizado. O lançamento voltou para PENDENTE."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível estornar."
      );
    }
  }

  async function cancelarLancamento(
    item
  ) {
    if (!validarAcessoLancamento(item)) {
      return;
    }

    const confirmou =
      window.confirm(
        `Deseja cancelar "${item.descricao}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      let consultaCancelar = supabase
        .from("financeiro")
        .update({
          status:
            "CANCELADO",

          data_pagamento:
            null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          item.id
        );

      consultaCancelar =
        aplicarFiltroPatio(
          consultaCancelar
        );

      const {
        error,
      } = await consultaCancelar;

      if (error) {
        throw error;
      }

      setMensagem(
        "Lançamento cancelado."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível cancelar."
      );
    }
  }

  async function reabrirLancamento(
    item
  ) {
    if (!validarAcessoLancamento(item)) {
      return;
    }

    const confirmou =
      window.confirm(
        `Deseja reabrir "${item.descricao}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      let consultaReabrir = supabase
        .from("financeiro")
        .update({
          status:
            "PENDENTE",

          data_pagamento:
            null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          item.id
        );

      consultaReabrir =
        aplicarFiltroPatio(
          consultaReabrir
        );

      const {
        error,
      } = await consultaReabrir;

      if (error) {
        throw error;
      }

      setMensagem(
        "Lançamento reaberto."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível reabrir."
      );
    }
  }

  async function excluirLancamento(
    item
  ) {
    if (!isMaster) {
      return;
    }

    const confirmou =
      window.confirm(
        `ATENÇÃO: excluir definitivamente "${item.descricao}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      if (
        item.boleto_path
      ) {
        await supabase.storage
          .from(
            BUCKET_BOLETOS
          )
          .remove([
            item.boleto_path,
          ]);
      }

      const {
        error,
      } = await supabase
        .from("financeiro")
        .delete()
        .eq(
          "id",
          item.id
        );

      if (error) {
        throw error;
      }

      setMensagem(
        "Lançamento excluído definitivamente."
      );

      await carregarDados();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível excluir."
      );
    }
  }

  function statusVisual(item) {
    if (
      item.status ===
      "CANCELADO"
    ) {
      return {
        texto:
          "CANCELADO",

        classe:
          "bg-slate-100 text-slate-600",
      };
    }

    if (
      item.status ===
      "PENDENTE"
    ) {
      return {
        texto:
          "PENDENTE",

        classe:
          "bg-amber-100 text-amber-700",
      };
    }

    return {
      texto:
        item.tipo ===
        "RECEITA"
          ? "RECEBIDO"
          : "PAGO",

      classe:
        "bg-green-100 text-green-700",
    };
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Carregando financeiro...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Administrativo
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Financeiro
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Controle receitas, despesas,
              boletos, pagamentos, estornos e
              resultados por pátio.
            </p>

            <p className="mt-2 text-sm font-bold text-blue-600">
              🏢 Acesso: {isMaster
                ? "Todos os pátios"
                : nomePatio(
                    perfil?.patio_id
                  )}
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovo}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            + Novo lançamento
          </button>
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

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            className={`grid gap-4 ${
              isMaster
                ? "md:grid-cols-2"
                : ""
            }`}
          >
            <div>
              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                Mês
              </label>

              <input
                type="month"
                value={mesFiltro}
                onChange={(event) =>
                  setMesFiltro(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            {isMaster && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                  Pátio
                </label>

                <select
                  value={patioFiltro}
                  onChange={(event) =>
                    setPatioFiltro(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="TODOS">
                    Todos os pátios
                  </option>

                  {patios.map(
                    (patio) => (
                      <option
                        key={patio.id}
                        value={patio.id}
                      >
                        {patio.nome}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Receitas
            </p>

            <p className="mt-3 text-2xl font-black text-green-600">
              {formatarMoeda(
                resumo.receitas
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Despesas
            </p>

            <p className="mt-3 text-2xl font-black text-red-600">
              {formatarMoeda(
                resumo.despesas
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Resultado
            </p>

            <p
              className={`mt-3 text-2xl font-black ${
                resumo.resultado >= 0
                  ? "text-blue-600"
                  : "text-red-600"
              }`}
            >
              {formatarMoeda(
                resumo.resultado
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Pendentes
            </p>

            <p className="mt-3 text-2xl font-black text-amber-600">
              {formatarMoeda(
                resumo.pendentes
              )}
            </p>
          </div>
        </div>

        {/* =================================================
            PAGAMENTOS DE DIÁRIAS
        ================================================== */}

        <div className="mb-6 overflow-hidden rounded-2xl border border-[#FFC400]/40 bg-[#211E1F] shadow-sm">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#FFC400]">
                  Integração automática
                </p>

                <h2 className="mt-1 text-xl font-black text-white">
                  Pagamentos de diárias
                </h2>

                <p className="mt-1 max-w-3xl text-sm text-white/60">
                  Valores registrados na tela de Veículos Liberados aparecem automaticamente aqui. O período e o pátio seguem os filtros acima.
                </p>
              </div>

              <span className="w-fit rounded-full bg-[#FFC400] px-3 py-1.5 text-xs font-black text-[#211E1F]">
                {resumoPagamentosDiarias.quantidadePagamentos} PAGAMENTO(S)
              </span>
            </div>
          </div>

          {erroPagamentosDiarias && (
            <div className="border-b border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-200 sm:px-6">
              {erroPagamentosDiarias}
            </div>
          )}

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                Recebido em diárias
              </p>
              <p className="mt-2 text-2xl font-black text-[#FFC400]">
                {formatarMoeda(
                  resumoPagamentosDiarias.totalRecebido
                )}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                Pagamentos
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {resumoPagamentosDiarias.quantidadePagamentos}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                Veículos pagos
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {resumoPagamentosDiarias.quantidadeVeiculos}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                Ticket médio
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {formatarMoeda(
                  resumoPagamentosDiarias.ticketMedio
                )}
              </p>
              {resumoPagamentosDiarias.estornados > 0 && (
                <p className="mt-1 text-xs font-semibold text-red-300">
                  {resumoPagamentosDiarias.estornados} estornado(s) no período
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/10 px-5 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-black text-white">
                Histórico de pagamentos de diárias
              </h3>
              <span className="text-xs font-semibold text-white/40">
                Mais recentes primeiro
              </span>
            </div>

            {pagamentosDiariasPeriodo.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm font-semibold text-white/50">
                Nenhum pagamento de diária registrado neste período.
              </div>
            ) : (
              <div className="space-y-2">
                {pagamentosDiariasPeriodo
                  .slice(0, 12)
                  .map((pagamento) => {
                    const veiculo =
                      veiculoDoPagamento(
                        pagamento.veiculo_id
                      );

                    return (
                      <div
                        key={pagamento.id}
                        className={`rounded-xl border p-4 ${
                          pagamento.cancelado
                            ? "border-red-400/20 bg-red-500/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black uppercase text-white">
                                {veiculo?.placa ||
                                  `Veículo #${pagamento.veiculo_id}`}
                              </p>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                  pagamento.cancelado
                                    ? "bg-red-500/20 text-red-200"
                                    : "bg-[#FFC400] text-[#211E1F]"
                                }`}
                              >
                                {pagamento.cancelado
                                  ? "ESTORNADO"
                                  : "PAGO"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm font-semibold text-white/70">
                              {[
                                veiculo?.marca,
                                veiculo?.modelo,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                                "Veículo"}
                              {" • "}
                              {nomePatio(
                                pagamento.patio_id
                              )}
                            </p>

                            <p className="mt-1 text-xs text-white/45">
                              {formatarFormaPagamentoDiaria(
                                pagamento.forma_pagamento
                              )}
                              {" • "}
                              {formatarDataHora(
                                pagamento.pago_em
                              )}
                              {pagamento.referencia
                                ? ` • Ref.: ${pagamento.referencia}`
                                : ""}
                            </p>

                            {pagamento.cancelado &&
                              pagamento.motivo_cancelamento && (
                                <p className="mt-2 text-xs font-semibold text-red-200">
                                  Motivo do estorno: {pagamento.motivo_cancelamento}
                                </p>
                              )}
                          </div>

                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                            <p
                              className={`text-xl font-black ${
                                pagamento.cancelado
                                  ? "text-red-300 line-through"
                                  : "text-[#FFC400]"
                              }`}
                            >
                              {formatarMoeda(
                                pagamento.valor
                              )}
                            </p>

                            {!pagamento.cancelado && (
                              <button
                                type="button"
                                onClick={() =>
                                  estornarPagamentoDiaria(
                                    pagamento
                                  )
                                }
                                disabled={
                                  estornandoPagamentoDiaria ===
                                  pagamento.id
                                }
                                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                              >
                                {estornandoPagamentoDiaria ===
                                pagamento.id
                                  ? "Estornando..."
                                  : "↩ Estornar"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {mostrarFormulario && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-black text-slate-900">
                {editandoId
                  ? "Editar lançamento"
                  : "Novo lançamento"}
              </h2>
            </div>

            <form
              onSubmit={
                salvarLancamento
              }
              className="p-6"
            >
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Tipo *
                  </label>

                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={alterarCampo}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="RECEITA">
                      Receita
                    </option>

                    <option value="DESPESA">
                      Despesa
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Pátio *
                  </label>

                  {isMaster ? (
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
                            </option>
                          )
                        )}
                    </select>
                  ) : (
                    <input
                      disabled
                      value={nomePatio(
                        perfil?.patio_id
                      )}
                      className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Categoria *
                  </label>

                  <select
                    name="categoria"
                    value={
                      form.categoria
                    }
                    onChange={
                      alterarCampo
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Selecione
                    </option>

                    {categorias.map(
                      (categoria) => (
                        <option
                          key={
                            categoria
                          }
                          value={
                            categoria
                          }
                        >
                          {categoria}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Descrição *
                  </label>

                  <input
                    name="descricao"
                    value={
                      form.descricao
                    }
                    onChange={
                      alterarCampo
                    }
                    placeholder="Descrição do lançamento"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Valor *
                  </label>

                  <input
                    name="valor"
                    value={form.valor}
                    onChange={
                      alterarCampo
                    }
                    placeholder="Ex.: 1.500,00"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Vencimento *
                  </label>

                  <input
                    type="date"
                    name="dataVencimento"
                    value={
                      form.dataVencimento
                    }
                    onChange={
                      alterarCampo
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      form.status
                    }
                    onChange={
                      alterarCampo
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="PENDENTE">
                      Pendente
                    </option>

                    <option value="PAGO">
                      {form.tipo ===
                      "RECEITA"
                        ? "Recebido"
                        : "Pago"}
                    </option>

                    <option value="CANCELADO">
                      Cancelado
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Forma de pagamento
                  </label>

                  <select
                    name="formaPagamento"
                    value={
                      form.formaPagamento
                    }
                    onChange={
                      alterarCampo
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Não informado
                    </option>

                    {FORMAS_PAGAMENTO.map(
                      (forma) => (
                        <option
                          key={forma}
                          value={forma}
                        >
                          {forma}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Documento / Referência
                  </label>

                  <input
                    name="documentoReferencia"
                    value={
                      form.documentoReferencia
                    }
                    onChange={
                      alterarCampo
                    }
                    placeholder="NF, protocolo, placa, código..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    📎 Anexar boleto
                  </label>

                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={
                        selecionarBoleto
                      }
                      className="block w-full text-sm text-slate-600"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      PDF, JPG, PNG ou WEBP. Máximo 10 MB.
                    </p>

                    {arquivoBoleto && (
                      <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">
                        Novo arquivo:{" "}
                        {
                          arquivoBoleto.name
                        }
                      </div>
                    )}

                    {lancamentoEditando
                      ?.boleto_path &&
                      !arquivoBoleto && (
                        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-green-200 bg-green-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm font-semibold text-green-700">
                            📎{" "}
                            {
                              lancamentoEditando.boleto_nome
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              abrirBoleto(
                                lancamentoEditando
                              )
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            Abrir boleto
                          </button>
                        </div>
                      )}
                  </div>
                </div>

                <div className="md:col-span-2 xl:col-span-3">
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
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={
                    fecharFormulario
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar lançamento"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-slate-900">
            Filtros
          </h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={pesquisa}
              onChange={(event) =>
                setPesquisa(
                  event.target.value
                )
              }
              placeholder="Pesquisar..."
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <select
              value={tipoFiltro}
              onChange={(event) =>
                setTipoFiltro(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="TODOS">
                Todos os tipos
              </option>

              <option value="RECEITA">
                Receitas
              </option>

              <option value="DESPESA">
                Despesas
              </option>
            </select>

            <select
              value={statusFiltro}
              onChange={(event) =>
                setStatusFiltro(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="TODOS">
                Todos os status
              </option>

              <option value="PENDENTE">
                Pendentes
              </option>

              <option value="PAGO">
                Pagos / Recebidos
              </option>

              <option value="CANCELADO">
                Cancelados
              </option>
            </select>

            <input
              value={valorMinimo}
              onChange={(event) =>
                setValorMinimo(
                  event.target.value
                )
              }
              placeholder="Valor mínimo"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <input
              value={valorMaximo}
              onChange={(event) =>
                setValorMaximo(
                  event.target.value
                )
              }
              placeholder="Valor máximo"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={
                somenteComBoleto
              }
              onChange={(event) =>
                setSomenteComBoleto(
                  event.target.checked
                )
              }
              className="h-4 w-4"
            />

            Mostrar somente lançamentos com boleto anexado
          </label>
        </div>

        {lancamentosFiltrados.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center">
            <div className="text-4xl">
              $
            </div>

            <h3 className="mt-3 font-black text-slate-900">
              Nenhum lançamento encontrado
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {lancamentosFiltrados.map(
              (item) => {
                const status =
                  statusVisual(
                    item
                  );

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black ${
                          item.tipo ===
                          "RECEITA"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.tipo ===
                        "RECEITA"
                          ? "↑"
                          : "↓"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900">
                            {
                              item.descricao
                            }
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${status.classe}`}
                          >
                            {status.texto}
                          </span>

                          {item.boleto_path && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">
                              📎 BOLETO
                            </span>
                          )}

                          {Number(
                            item.quantidade_estornos ||
                              0
                          ) > 0 && (
                            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black text-purple-700">
                              ↩ ESTORNADO{" "}
                              {
                                item.quantidade_estornos
                              }x
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {item.categoria}
                          {" • "}
                          {nomePatio(
                            item.patio_id
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Vencimento:{" "}
                          {formatarData(
                            item.data_vencimento
                          )}
                        </p>

                        {item.estornado_em && (
                          <div className="mt-3 rounded-lg bg-purple-50 p-3 text-xs text-purple-700">
                            <strong>
                              Último estorno:
                            </strong>{" "}
                            {formatarDataHora(
                              item.estornado_em
                            )}
                            <br />

                            <strong>
                              Motivo:
                            </strong>{" "}
                            {
                              item.estorno_motivo
                            }
                          </div>
                        )}
                      </div>

                      <div className="xl:text-right">
                        <p
                          className={`text-xl font-black ${
                            item.tipo ===
                            "RECEITA"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.tipo ===
                          "RECEITA"
                            ? "+"
                            : "-"}

                          {formatarMoeda(
                            item.valor
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:max-w-[330px]">
                        {item.boleto_path && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                abrirBoleto(
                                  item
                                )
                              }
                              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                            >
                              📎 Boleto
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removerBoleto(
                                  item
                                )
                              }
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                            >
                              Remover boleto
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            editarLancamento(
                              item
                            )
                          }
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                        >
                          Editar
                        </button>

                        {item.status ===
                          "PENDENTE" && (
                          <button
                            type="button"
                            onClick={() =>
                              darBaixa(
                                item
                              )
                            }
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            {item.tipo ===
                            "RECEITA"
                              ? "Receber"
                              : "Pagar"}
                          </button>
                        )}

                        {item.status ===
                          "PAGO" && (
                          <button
                            type="button"
                            onClick={() =>
                              estornarPagamento(
                                item
                              )
                            }
                            className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700"
                          >
                            ↩ Estornar
                          </button>
                        )}

                        {item.status !==
                          "CANCELADO" && (
                          <button
                            type="button"
                            onClick={() =>
                              cancelarLancamento(
                                item
                              )
                            }
                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                          >
                            Cancelar
                          </button>
                        )}

                        {item.status ===
                          "CANCELADO" && (
                          <button
                            type="button"
                            onClick={() =>
                              reabrirLancamento(
                                item
                              )
                            }
                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                          >
                            Reabrir
                          </button>
                        )}

                        {isMaster && (
                          <button
                            type="button"
                            onClick={() =>
                              excluirLancamento(
                                item
                              )
                            }
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                          >
                            Excluir
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
    </div>
  );
}
