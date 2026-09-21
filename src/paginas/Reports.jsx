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

const TIPOS_RELATORIO = [
  {
    valor: "RESUMO",
    nome: "Resumo geral",
  },
  {
    valor: "VEICULOS",
    nome: "Veículos",
  },
  {
    valor: "MOVIMENTACOES",
    nome: "Movimentações",
  },
  {
    valor: "FINANCEIRO",
    nome: "Financeiro",
  },
];

const DESTINOS = [
  {
    valor: "TODOS",
    nome: "Todos os destinos",
  },
  {
    valor: "PATIO",
    nome: "Em pátio",
  },
  {
    valor: "LEILAO",
    nome: "Leilão",
  },
  {
    valor: "JUDICIAL",
    nome: "Retirada judicial",
  },
  {
    valor: "OUTRO_DESTINO",
    nome: "Outro destino",
  },
  {
    valor: "LIBERADO",
    nome: "Liberado",
  },
  {
    valor: "ANALISE",
    nome: "Análise",
  },
];

// =======================================================
// DATAS
// =======================================================

function hoje() {
  const data = new Date();

  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function primeiroDiaMes() {
  const data = new Date();

  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

// =======================================================
// FORMATADORES
// =======================================================

function formatarData(data) {
  if (!data) {
    return "-";
  }

  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataHora(data) {
  if (!data) {
    return "-";
  }

  return new Date(data).toLocaleString("pt-BR");
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function nomeDestino(destino) {
  const nomes = {
    PATIO: "Em pátio",
    LEILAO: "Leilão",
    JUDICIAL: "Retirada judicial",
    OUTRO_DESTINO: "Outro destino",
    LIBERADO: "Liberado",
    ANALISE: "Análise",
  };

  return nomes[destino] || destino || "-";
}

function nomeStatus(status) {
  if (!status) {
    return "-";
  }

  const nomes = {
    EM_PATIO: "Em pátio",
    LIBERADO: "Liberado",
    RETIRADO_LIBERADO: "Retirado",
    AGUARDANDO_LEILAO: "Aguardando leilão",
    LIBERADO_LEILAO: "Liberado para leilão",
    ARREMATADO: "Arrematado",
    RETIRADO_LEILAO: "Retirado por leilão",
    AGUARDANDO_RETIRADA_JUDICIAL:
      "Aguardando retirada judicial",
    RETIRADO_JUDICIAL: "Retirado judicialmente",
    OUTRO_DESTINO: "Outro destino",
    RETIRADO_OUTRO_DESTINO:
      "Encaminhado para outro destino",
    EM_ANALISE: "Em análise",
    ANALISE_CONCLUIDA: "Análise concluída",
  };

  return (
    nomes[status] ||
    status.replaceAll("_", " ")
  );
}

function nomeMovimentacao(tipo) {
  const nomes = {
    ENTRADA: "Entrada",
    SAIDA: "Saída",
    LEILAO: "Leilão",
    RETIRADA: "Retirada",
    ANALISE: "Análise",
  };

  return nomes[tipo] || tipo || "-";
}

// =======================================================
// CSV
// =======================================================

function escaparCSV(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  const texto = String(valor);

  if (
    texto.includes(";") ||
    texto.includes('"') ||
    texto.includes("\n")
  ) {
    return `"${texto.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return texto;
}

function baixarCSV(nomeArquivo, cabecalho, linhas) {
  const conteudo = [
    cabecalho
      .map(escaparCSV)
      .join(";"),

    ...linhas.map((linha) =>
      linha
        .map(escaparCSV)
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob(
    [
      "\uFEFF",
      conteudo,
    ],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    nomeArquivo;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// =======================================================
// COMPONENTE
// =======================================================

export default function Reports() {
  const {
    perfil,
    isMaster,
    temPermissao,
  } = useAuth();

  const [
    veiculos,
    setVeiculos,
  ] = useState([]);

  const [
    movimentacoes,
    setMovimentacoes,
  ] = useState([]);

  const [
    financeiro,
    setFinanceiro,
  ] = useState([]);

  const [
    patios,
    setPatios,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    tipoRelatorio,
    setTipoRelatorio,
  ] = useState("RESUMO");

  const [
    dataInicial,
    setDataInicial,
  ] = useState(
    primeiroDiaMes()
  );

  const [
    dataFinal,
    setDataFinal,
  ] = useState(
    hoje()
  );

  const [
    patioFiltro,
    setPatioFiltro,
  ] = useState("TODOS");

  const [
    destinoFiltro,
    setDestinoFiltro,
  ] = useState("TODOS");

  const [
    pesquisa,
    setPesquisa,
  ] = useState("");

  // =====================================================
  // PERMISSÃO FINANCEIRA
  // =====================================================

  const podeVerFinanceiro =
    isMaster ||
    temPermissao("financial");

  // =====================================================
  // CARREGAMENTO
  // =====================================================

  useEffect(() => {
    if (!perfil) {
      return;
    }

    carregarDados();
  }, [
    perfil,
    isMaster,
  ]);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      // =================================================
      // USUÁRIO COMUM PRECISA ESTAR VINCULADO A UM PÁTIO
      // =================================================

      if (!isMaster && !perfil?.patio_id) {
        setVeiculos([]);
        setMovimentacoes([]);
        setFinanceiro([]);

        setErro(
          "Sua conta ainda não possui um pátio vinculado. Peça ao administrador para definir sua unidade."
        );

        return;
      }

      let consultaVeiculos =
        supabase
          .from("veiculos")
          .select("*")
          .is(
            "excluido_em",
            null
          )
          .order(
            "data_entrada",
            {
              ascending: false,
            }
          );

      let consultaMovimentacoes =
        supabase
          .from(
            "movimentacoes"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      let consultaFinanceiro =
        supabase
          .from("financeiro")
          .select("*")
          .order(
            "data_vencimento",
            {
              ascending: false,
            }
          );

      // ===============================================
      // FUNCIONÁRIO COMUM
      // ===============================================

      if (!isMaster) {
        consultaVeiculos =
          consultaVeiculos.eq(
            "patio_id",
            perfil.patio_id
          );

        if (
          podeVerFinanceiro
        ) {
          consultaFinanceiro =
            consultaFinanceiro.eq(
              "patio_id",
              perfil.patio_id
            );
        }
      }

      const requisicoes = [
        consultaVeiculos,
        consultaMovimentacoes,

        supabase
          .from("patios")
          .select(
            "id, nome, cidade, estado, ativo"
          )
          .order("nome"),
      ];

      if (
        podeVerFinanceiro
      ) {
        requisicoes.push(
          consultaFinanceiro
        );
      }

      const respostas =
        await Promise.all(
          requisicoes
        );

      const veiculosResponse =
        respostas[0];

      const movimentacoesResponse =
        respostas[1];

      const patiosResponse =
        respostas[2];

      const financeiroResponse =
        podeVerFinanceiro
          ? respostas[3]
          : null;

      if (
        veiculosResponse.error
      ) {
        throw veiculosResponse.error;
      }

      if (
        movimentacoesResponse.error
      ) {
        console.error(
          "Erro nas movimentações:",
          movimentacoesResponse.error
        );
      }

      if (
        patiosResponse.error
      ) {
        console.error(
          "Erro nos pátios:",
          patiosResponse.error
        );
      }

      if (
        financeiroResponse?.error
      ) {
        console.error(
          "Erro financeiro:",
          financeiroResponse.error
        );
      }

      setVeiculos(
        veiculosResponse.data ||
        []
      );

      setMovimentacoes(
        movimentacoesResponse.data ||
        []
      );

      setPatios(
        patiosResponse.data ||
        []
      );

      setFinanceiro(
        financeiroResponse?.data ||
        []
      );
    } catch (error) {
      console.error(
        "Erro ao carregar relatório:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os dados do relatório."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PÁTIO
  // =====================================================

  function nomePatio(patioId) {
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
  // VEÍCULO POR ID
  // =====================================================

  function buscarVeiculo(
    veiculoId
  ) {
    return veiculos.find(
      (item) =>
        String(item.id) ===
        String(veiculoId)
    );
  }

  // =====================================================
  // VEÍCULOS FILTRADOS
  // =====================================================

  const veiculosFiltrados =
    useMemo(() => {
      const inicio =
        dataInicial
          ? new Date(
              `${dataInicial}T00:00:00`
            )
          : null;

      const fim =
        dataFinal
          ? new Date(
              `${dataFinal}T23:59:59`
            )
          : null;

      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      return veiculos.filter(
        (veiculo) => {
          if (
            inicio ||
            fim
          ) {
            if (
              !veiculo.data_entrada
            ) {
              return false;
            }

            const data =
              new Date(
                veiculo.data_entrada
              );

            if (
              inicio &&
              data < inicio
            ) {
              return false;
            }

            if (
              fim &&
              data > fim
            ) {
              return false;
            }
          }

          if (
            isMaster &&
            patioFiltro !==
              "TODOS" &&
            String(
              veiculo.patio_id
            ) !==
              String(
                patioFiltro
              )
          ) {
            return false;
          }

          if (
            destinoFiltro !==
              "TODOS" &&
            veiculo.destino_atual !==
              destinoFiltro
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
            veiculo.cor,
            veiculo.renavam,
            veiculo.chassi,
            veiculo.proprietario,
            veiculo.status,
            veiculo.destino_atual,
            nomePatio(
              veiculo.patio_id
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
      veiculos,
      patios,
      dataInicial,
      dataFinal,
      patioFiltro,
      destinoFiltro,
      pesquisa,
      isMaster,
    ]);

  // =====================================================
  // IDs DOS VEÍCULOS PERMITIDOS
  // =====================================================

  const idsVeiculos =
    useMemo(
      () =>
        new Set(
          veiculosFiltrados.map(
            (item) =>
              String(item.id)
          )
        ),
      [
        veiculosFiltrados,
      ]
    );

  // =====================================================
  // MOVIMENTAÇÕES FILTRADAS
  // =====================================================

  const movimentacoesFiltradas =
    useMemo(() => {
      const inicio =
        dataInicial
          ? new Date(
              `${dataInicial}T00:00:00`
            )
          : null;

      const fim =
        dataFinal
          ? new Date(
              `${dataFinal}T23:59:59`
            )
          : null;

      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      return movimentacoes.filter(
        (movimentacao) => {
          const veiculo =
            buscarVeiculo(
              movimentacao.veiculo_id
            );

          if (!veiculo) {
            return false;
          }

          // filtro de pátio
          if (
            isMaster &&
            patioFiltro !==
              "TODOS" &&
            String(
              veiculo.patio_id
            ) !==
              String(
                patioFiltro
              )
          ) {
            return false;
          }

          // filtro destino
          if (
            destinoFiltro !==
              "TODOS" &&
            veiculo.destino_atual !==
              destinoFiltro
          ) {
            return false;
          }

          const data =
            new Date(
              movimentacao.created_at
            );

          if (
            inicio &&
            data < inicio
          ) {
            return false;
          }

          if (
            fim &&
            data > fim
          ) {
            return false;
          }

          if (!termo) {
            return true;
          }

          const texto = [
            movimentacao.tipo,
            movimentacao.descricao,
            veiculo.placa,
            veiculo.marca,
            veiculo.modelo,
            nomePatio(
              veiculo.patio_id
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
      movimentacoes,
      veiculos,
      patios,
      dataInicial,
      dataFinal,
      patioFiltro,
      destinoFiltro,
      pesquisa,
      isMaster,
    ]);

  // =====================================================
  // FINANCEIRO FILTRADO
  // =====================================================

  const financeiroFiltrado =
    useMemo(() => {
      if (
        !podeVerFinanceiro
      ) {
        return [];
      }

      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      return financeiro.filter(
        (item) => {
          if (
            dataInicial &&
            item.data_vencimento <
              dataInicial
          ) {
            return false;
          }

          if (
            dataFinal &&
            item.data_vencimento >
              dataFinal
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

          if (!termo) {
            return true;
          }

          const texto = [
            item.tipo,
            item.categoria,
            item.descricao,
            item.status,
            item.forma_pagamento,
            item.documento_referencia,
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
      financeiro,
      patios,
      dataInicial,
      dataFinal,
      patioFiltro,
      pesquisa,
      isMaster,
      podeVerFinanceiro,
    ]);

  // =====================================================
  // RESUMO DE VEÍCULOS
  // =====================================================

  const resumoVeiculos =
    useMemo(() => {
      const resumo = {
        total:
          veiculosFiltrados.length,

        patio: 0,
        liberado: 0,
        leilao: 0,
        judicial: 0,
        outro: 0,
        analise: 0,
      };

      veiculosFiltrados.forEach(
        (item) => {
          switch (
            item.destino_atual
          ) {
            case "PATIO":
              resumo.patio++;
              break;

            case "LIBERADO":
              resumo.liberado++;
              break;

            case "LEILAO":
              resumo.leilao++;
              break;

            case "JUDICIAL":
              resumo.judicial++;
              break;

            case "OUTRO_DESTINO":
              resumo.outro++;
              break;

            case "ANALISE":
              resumo.analise++;
              break;

            default:
              break;
          }
        }
      );

      return resumo;
    }, [
      veiculosFiltrados,
    ]);

  // =====================================================
  // RESUMO FINANCEIRO
  // =====================================================

  const resumoFinanceiro =
    useMemo(() => {
      let receitas = 0;
      let despesas = 0;
      let receitasPendentes = 0;
      let despesasPendentes = 0;

      financeiroFiltrado.forEach(
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
            if (
              item.tipo ===
              "RECEITA"
            ) {
              receitasPendentes +=
                valor;
            } else {
              despesasPendentes +=
                valor;
            }

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

        receitasPendentes,

        despesasPendentes,
      };
    }, [
      financeiroFiltrado,
    ]);

  // =====================================================
  // MOVIMENTAÇÕES
  // =====================================================

  const resumoMovimentacoes =
    useMemo(() => {
      const resumo = {
        total:
          movimentacoesFiltradas.length,

        entradas: 0,
        saidas: 0,
        leiloes: 0,
        retiradas: 0,
        analises: 0,
      };

      movimentacoesFiltradas.forEach(
        (item) => {
          switch (
            item.tipo
          ) {
            case "ENTRADA":
              resumo.entradas++;
              break;

            case "SAIDA":
              resumo.saidas++;
              break;

            case "LEILAO":
              resumo.leiloes++;
              break;

            case "RETIRADA":
              resumo.retiradas++;
              break;

            case "ANALISE":
              resumo.analises++;
              break;

            default:
              break;
          }
        }
      );

      return resumo;
    }, [
      movimentacoesFiltradas,
    ]);

  // =====================================================
  // EXPORTAR
  // =====================================================

  function exportarRelatorio() {
    const dataArquivo =
      new Date()
        .toISOString()
        .slice(0, 10);

    if (
      tipoRelatorio ===
      "VEICULOS"
    ) {
      baixarCSV(
        `relatorio-veiculos-${dataArquivo}.csv`,

        [
          "Placa",
          "Marca",
          "Modelo",
          "Cor",
          "Ano",
          "RENAVAM",
          "Chassi",
          "Proprietário",
          "Pátio",
          "Status",
          "Destino",
          "Entrada",
        ],

        veiculosFiltrados.map(
          (item) => [
            item.placa,
            item.marca,
            item.modelo,
            item.cor,
            item.ano,
            item.renavam,
            item.chassi,
            item.proprietario,
            nomePatio(
              item.patio_id
            ),
            nomeStatus(
              item.status
            ),
            nomeDestino(
              item.destino_atual
            ),
            formatarDataHora(
              item.data_entrada
            ),
          ]
        )
      );

      return;
    }

    if (
      tipoRelatorio ===
      "MOVIMENTACOES"
    ) {
      baixarCSV(
        `relatorio-movimentacoes-${dataArquivo}.csv`,

        [
          "Data",
          "Tipo",
          "Placa",
          "Veículo",
          "Pátio",
          "Descrição",
        ],

        movimentacoesFiltradas.map(
          (item) => {
            const veiculo =
              buscarVeiculo(
                item.veiculo_id
              );

            return [
              formatarDataHora(
                item.created_at
              ),

              nomeMovimentacao(
                item.tipo
              ),

              veiculo?.placa ||
                "-",

              `${veiculo?.marca || ""} ${veiculo?.modelo || ""}`.trim(),

              nomePatio(
                veiculo?.patio_id
              ),

              item.descricao ||
                "",
            ];
          }
        )
      );

      return;
    }

    if (
      tipoRelatorio ===
      "FINANCEIRO"
    ) {
      baixarCSV(
        `relatorio-financeiro-${dataArquivo}.csv`,

        [
          "Tipo",
          "Categoria",
          "Descrição",
          "Pátio",
          "Valor",
          "Status",
          "Vencimento",
          "Pagamento",
          "Forma de pagamento",
          "Referência",
        ],

        financeiroFiltrado.map(
          (item) => [
            item.tipo,
            item.categoria,
            item.descricao,

            nomePatio(
              item.patio_id
            ),

            Number(
              item.valor ||
                0
            ).toFixed(2),

            item.status,

            formatarData(
              item.data_vencimento
            ),

            formatarDataHora(
              item.data_pagamento
            ),

            item.forma_pagamento ||
              "",

            item.documento_referencia ||
              "",
          ]
        )
      );

      return;
    }

    // RESUMO GERAL

    baixarCSV(
      `relatorio-resumo-${dataArquivo}.csv`,

      [
        "Indicador",
        "Valor",
      ],

      [
        [
          "Veículos",
          resumoVeiculos.total,
        ],

        [
          "Veículos em pátio",
          resumoVeiculos.patio,
        ],

        [
          "Veículos liberados",
          resumoVeiculos.liberado,
        ],

        [
          "Veículos em leilão",
          resumoVeiculos.leilao,
        ],

        [
          "Retirada judicial",
          resumoVeiculos.judicial,
        ],

        [
          "Outros destinos",
          resumoVeiculos.outro,
        ],

        [
          "Em análise",
          resumoVeiculos.analise,
        ],

        [
          "Movimentações",
          resumoMovimentacoes.total,
        ],

        [
          "Receitas",
          resumoFinanceiro.receitas.toFixed(
            2
          ),
        ],

        [
          "Despesas",
          resumoFinanceiro.despesas.toFixed(
            2
          ),
        ],

        [
          "Resultado",
          resumoFinanceiro.resultado.toFixed(
            2
          ),
        ],
      ]
    );
  }

  // =====================================================
  // LIMPAR FILTROS
  // =====================================================

  function limparFiltros() {
    setDataInicial(
      primeiroDiaMes()
    );

    setDataFinal(
      hoje()
    );

    setPatioFiltro(
      "TODOS"
    );

    setDestinoFiltro(
      "TODOS"
    );

    setPesquisa("");
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
            Gerando informações dos relatórios...
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
              Gestão
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Relatórios
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Consulte informações operacionais,
              movimentações e dados financeiros
              utilizando filtros por período e
              pátio.
            </p>

            <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
              🏢 Acesso: {
                isMaster
                  ? "Todos os pátios"
                  : nomePatio(perfil?.patio_id)
              }
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                exportarRelatorio
              }
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700 transition hover:bg-green-100"
            >
              ↓ Exportar CSV
            </button>

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
            >
              🖨 Imprimir / PDF
            </button>
          </div>
        </div>

        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {erro}
          </div>
        )}

        {/* FILTROS */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-900">
                Filtros do relatório
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Escolha as informações que deseja consultar.
              </p>
            </div>

            <button
              type="button"
              onClick={
                limparFiltros
              }
              className="text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              Limpar filtros
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            <div>
              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                Tipo de relatório
              </label>

              <select
                value={
                  tipoRelatorio
                }
                onChange={(event) =>
                  setTipoRelatorio(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
              >
                {TIPOS_RELATORIO
                  .filter(
                    (item) =>
                      item.valor !==
                        "FINANCEIRO" ||
                      podeVerFinanceiro
                  )
                  .map(
                    (item) => (
                      <option
                        key={
                          item.valor
                        }
                        value={
                          item.valor
                        }
                      >
                        {item.nome}
                      </option>
                    )
                  )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                Data inicial
              </label>

              <input
                type="date"
                value={
                  dataInicial
                }
                onChange={(event) =>
                  setDataInicial(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                Data final
              </label>

              <input
                type="date"
                value={
                  dataFinal
                }
                onChange={(event) =>
                  setDataFinal(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            {isMaster && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                  Pátio
                </label>

                <select
                  value={
                    patioFiltro
                  }
                  onChange={(event) =>
                    setPatioFiltro(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
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
              </div>
            )}

            {tipoRelatorio !==
              "FINANCEIRO" && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                  Destino
                </label>

                <select
                  value={
                    destinoFiltro
                  }
                  onChange={(event) =>
                    setDestinoFiltro(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  {DESTINOS.map(
                    (item) => (
                      <option
                        key={
                          item.valor
                        }
                        value={
                          item.valor
                        }
                      >
                        {item.nome}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                Pesquisar
              </label>

              <input
                value={
                  pesquisa
                }
                onChange={(event) =>
                  setPesquisa(
                    event.target.value
                  )
                }
                placeholder="Placa, proprietário, descrição..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO IMPRESSÃO */}

        <div className="mb-6 hidden border-b border-slate-300 pb-5 print:block">
          <h1 className="text-2xl font-black">
            Pátio Sul Brasil
          </h1>

          <p className="mt-1 text-sm">
            Relatório gerado em{" "}
            {new Date().toLocaleString(
              "pt-BR"
            )}
          </p>

          <p className="text-sm">
            Período:{" "}
            {formatarData(
              dataInicial
            )}{" "}
            até{" "}
            {formatarData(
              dataFinal
            )}
          </p>
        </div>

        {/* =================================================
            RESUMO GERAL
        ================================================== */}

        {tipoRelatorio ===
          "RESUMO" && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  Veículos
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900">
                  {
                    resumoVeiculos.total
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-sm font-bold text-blue-700">
                  Em pátio
                </p>

                <p className="mt-2 text-3xl font-black text-blue-700">
                  {
                    resumoVeiculos.patio
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-sm font-bold text-amber-700">
                  Movimentações
                </p>

                <p className="mt-2 text-3xl font-black text-amber-700">
                  {
                    resumoMovimentacoes.total
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
                <p className="text-sm font-bold text-purple-700">
                  Em análise
                </p>

                <p className="mt-2 text-3xl font-black text-purple-700">
                  {
                    resumoVeiculos.analise
                  }
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase text-slate-400">
                  Leilão
                </p>

                <p className="mt-2 text-2xl font-black text-slate-800">
                  {
                    resumoVeiculos.leilao
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase text-slate-400">
                  Liberados
                </p>

                <p className="mt-2 text-2xl font-black text-slate-800">
                  {
                    resumoVeiculos.liberado
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase text-slate-400">
                  Judicial
                </p>

                <p className="mt-2 text-2xl font-black text-slate-800">
                  {
                    resumoVeiculos.judicial
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase text-slate-400">
                  Outros destinos
                </p>

                <p className="mt-2 text-2xl font-black text-slate-800">
                  {
                    resumoVeiculos.outro
                  }
                </p>
              </div>
            </div>

            {podeVerFinanceiro && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black text-slate-900">
                  Resumo financeiro
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-xs font-black uppercase text-green-600">
                      Receitas
                    </p>

                    <p className="mt-2 text-xl font-black text-green-700">
                      {formatarMoeda(
                        resumoFinanceiro.receitas
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-xs font-black uppercase text-red-600">
                      Despesas
                    </p>

                    <p className="mt-2 text-xl font-black text-red-700">
                      {formatarMoeda(
                        resumoFinanceiro.despesas
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-black uppercase text-blue-600">
                      Resultado
                    </p>

                    <p
                      className={`mt-2 text-xl font-black ${
                        resumoFinanceiro.resultado >=
                        0
                          ? "text-blue-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatarMoeda(
                        resumoFinanceiro.resultado
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* =================================================
            VEÍCULOS
        ================================================== */}

        {tipoRelatorio ===
          "VEICULOS" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-black text-slate-900">
                Relatório de veículos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {
                  veiculosFiltrados.length
                }{" "}
                registro(s)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Placa
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Veículo
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Proprietário
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Pátio
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Entrada
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {veiculosFiltrados.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-4 text-sm font-black uppercase text-slate-800">
                          {item.placa ||
                            "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {item.marca ||
                            ""}{" "}
                          {item.modelo ||
                            ""}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {item.proprietario ||
                            "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {nomePatio(
                            item.patio_id
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {nomeStatus(
                            item.status
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatarDataHora(
                            item.data_entrada
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================
            MOVIMENTAÇÕES
        ================================================== */}

        {tipoRelatorio ===
          "MOVIMENTACOES" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-black text-slate-900">
                Relatório de movimentações
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {
                  movimentacoesFiltradas.length
                }{" "}
                movimentação(ões)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Data
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Tipo
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Veículo
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Pátio
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                      Descrição
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movimentacoesFiltradas.map(
                    (item) => {
                      const veiculo =
                        buscarVeiculo(
                          item.veiculo_id
                        );

                      return (
                        <tr
                          key={
                            item.id
                          }
                          className="border-t border-slate-100"
                        >
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                            {formatarDataHora(
                              item.created_at
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-bold text-slate-700">
                            {nomeMovimentacao(
                              item.tipo
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            <strong>
                              {veiculo?.placa ||
                                "-"}
                            </strong>

                            <div className="text-xs text-slate-400">
                              {veiculo?.marca ||
                                ""}{" "}
                              {veiculo?.modelo ||
                                ""}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {nomePatio(
                              veiculo?.patio_id
                            )}
                          </td>

                          <td className="max-w-md px-4 py-4 text-sm text-slate-600">
                            {item.descricao ||
                              "-"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================
            FINANCEIRO
        ================================================== */}

        {tipoRelatorio ===
          "FINANCEIRO" &&
          podeVerFinanceiro && (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">
                    Receitas
                  </p>

                  <p className="mt-2 text-2xl font-black text-green-600">
                    {formatarMoeda(
                      resumoFinanceiro.receitas
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">
                    Despesas
                  </p>

                  <p className="mt-2 text-2xl font-black text-red-600">
                    {formatarMoeda(
                      resumoFinanceiro.despesas
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">
                    Resultado
                  </p>

                  <p
                    className={`mt-2 text-2xl font-black ${
                      resumoFinanceiro.resultado >=
                      0
                        ? "text-blue-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatarMoeda(
                      resumoFinanceiro.resultado
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">
                    Pendentes
                  </p>

                  <p className="mt-2 text-lg font-black text-amber-600">
                    Receber:{" "}
                    {formatarMoeda(
                      resumoFinanceiro.receitasPendentes
                    )}
                  </p>

                  <p className="mt-1 text-sm font-bold text-amber-700">
                    Pagar:{" "}
                    {formatarMoeda(
                      resumoFinanceiro.despesasPendentes
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-black text-slate-900">
                    Relatório financeiro
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {
                      financeiroFiltrado.length
                    }{" "}
                    lançamento(s)
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                          Tipo
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                          Descrição
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                          Pátio
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                          Vencimento
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                          Status
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-400">
                          Valor
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {financeiroFiltrado.map(
                        (item) => (
                          <tr
                            key={
                              item.id
                            }
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                  item.tipo ===
                                  "RECEITA"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {
                                  item.tipo
                                }
                              </span>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              <strong className="text-slate-800">
                                {
                                  item.descricao
                                }
                              </strong>

                              <div className="text-xs text-slate-400">
                                {
                                  item.categoria
                                }
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {nomePatio(
                                item.patio_id
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {formatarData(
                                item.data_vencimento
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-bold text-slate-600">
                              {
                                item.status
                              }
                            </td>

                            <td
                              className={`px-4 py-4 text-right text-sm font-black ${
                                item.tipo ===
                                "RECEITA"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatarMoeda(
                                item.valor
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}