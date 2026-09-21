import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";

// =======================================================
// TIPOS DE DESTINO
// =======================================================

const TIPOS_DESTINO = [
  "OUTRO PÁTIO",
  "DELEGACIA",
  "ÓRGÃO PÚBLICO",
  "OFICINA",
  "SEGURADORA",
  "DEPÓSITO TERCEIRIZADO",
  "TRANSPORTADORA",
  "PROPRIETÁRIO",
  "OUTRO",
];

// =======================================================
// COMPONENTE
// =======================================================

export default function OtherDestinations() {
  const [veiculos, setVeiculos] = useState([]);
  const [patios, setPatios] = useState([]);

  // Controle de acesso por pátio
  const [perfilAtual, setPerfilAtual] = useState(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [pesquisa, setPesquisa] = useState("");

  const [filtro, setFiltro] = useState(
    "AGUARDANDO"
  );

  const [
    veiculoSelecionado,
    setVeiculoSelecionado,
  ] = useState(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] =
    useState("");

  const [form, setForm] = useState({
    tipoDestino: "",
    destinoLocal: "",
    cidade: "",
    protocolo: "",
    autorizadoPor: "",
    responsavel: "",
    documento: "",
    observacoes: "",
  });

  const ehMaster =
    perfilAtual?.cargo === "MASTER" &&
    perfilAtual?.status === "APROVADO";

  const patioUsuarioId = perfilAtual?.patio_id ?? null;

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
      // USUÁRIO LOGADO E PÁTIO DE ACESSO
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
        .select("id, cargo, status, patio_id")
        .eq("id", usuarioLogado.id)
        .single();

      if (perfilError) {
        throw perfilError;
      }

      setPerfilAtual(meuPerfil);

      const usuarioEhMaster =
        meuPerfil?.cargo === "MASTER" &&
        meuPerfil?.status === "APROVADO";

      if (
        !usuarioEhMaster &&
        !meuPerfil?.patio_id
      ) {
        setVeiculos([]);
        throw new Error(
          "Seu usuário ainda não está vinculado a um pátio. Peça ao administrador para definir sua unidade."
        );
      }

      // ===================================================
      // VEÍCULOS DE OUTROS DESTINOS
      // ===================================================

      let consultaVeiculos = supabase
        .from("veiculos")
        .select("*")
        .is("excluido_em", null)
        .or(
          [
            "destino_atual.eq.OUTRO_DESTINO",
            "status.eq.OUTRO_DESTINO",
            "status.eq.RETIRADO_OUTRO_DESTINO",
          ].join(",")
        );

      // Usuário comum vê somente o próprio pátio.
      // MASTER continua vendo todas as unidades.
      if (!usuarioEhMaster) {
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

        supabase
          .from("patios")
          .select(
            "id, nome, cidade, estado"
          )
          .order("nome"),
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
        "Erro ao carregar outros destinos:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os veículos."
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
        item.id === patioId
    );

    if (!patio) {
      return "Pátio não informado";
    }

    return patio.nome;
  }

  function podeAcessarVeiculo(veiculo) {
    if (!veiculo) {
      return false;
    }

    if (ehMaster) {
      return true;
    }

    return (
      Number(veiculo.patio_id) ===
      Number(patioUsuarioId)
    );
  }

  // =====================================================
  // FILTRO
  // =====================================================

  const veiculosFiltrados =
    useMemo(() => {
      const termo = pesquisa
        .trim()
        .toLowerCase();

      return veiculos.filter(
        (veiculo) => {
          const retirado =
            veiculo.status ===
            "RETIRADO_OUTRO_DESTINO";

          if (
            filtro ===
              "AGUARDANDO" &&
            retirado
          ) {
            return false;
          }

          if (
            filtro ===
              "RETIRADOS" &&
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

            veiculo.outro_destino_tipo,
            veiculo.outro_destino_local,
            veiculo.outro_destino_cidade,
            veiculo.outro_destino_protocolo,
            veiculo.outro_destino_responsavel,
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
        "RETIRADO_OUTRO_DESTINO"
    ).length;

  const totalRetirados =
    veiculos.filter(
      (veiculo) =>
        veiculo.status ===
        "RETIRADO_OUTRO_DESTINO"
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
      tipoDestino:
        veiculo.outro_destino_tipo ||
        "",

      destinoLocal:
        veiculo.outro_destino_local ||
        "",

      cidade:
        veiculo.outro_destino_cidade ||
        "",

      protocolo:
        veiculo.outro_destino_protocolo ||
        "",

      autorizadoPor:
        veiculo.outro_destino_autorizado_por ||
        "",

      responsavel:
        veiculo.outro_destino_responsavel ||
        "",

      documento:
        veiculo.outro_destino_documento ||
        "",

      observacoes:
        veiculo.outro_destino_observacoes ||
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
  // SALVAR INFORMAÇÕES
  // =====================================================

  async function salvarInformacoes() {
    if (
      !veiculoSelecionado
    ) {
      return;
    }

    if (!podeAcessarVeiculo(veiculoSelecionado)) {
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
        outro_destino_tipo:
          form.tipoDestino ||
          null,

        outro_destino_local:
          form.destinoLocal
            .trim() ||
          null,

        outro_destino_cidade:
          form.cidade
            .trim() ||
          null,

        outro_destino_protocolo:
          form.protocolo
            .trim() ||
          null,

        outro_destino_autorizado_por:
          form.autorizadoPor
            .trim() ||
          null,

        outro_destino_responsavel:
          form.responsavel
            .trim() ||
          null,

        outro_destino_documento:
          form.documento
            .trim() ||
          null,

        outro_destino_observacoes:
          form.observacoes
            .trim() ||
          null,

        destino_atual:
          "OUTRO_DESTINO",

        status:
          "OUTRO_DESTINO",
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
            patioUsuarioId
          );
      }

      const { error } =
        await consultaAtualizacao;

      if (error) {
        throw error;
      }

      setMensagem(
        "Informações do destino salvas com sucesso."
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
        "Erro ao salvar destino:",
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
  // FINALIZAR SAÍDA
  // =====================================================

  async function finalizarSaida() {
    if (
      !veiculoSelecionado
    ) {
      return;
    }

    if (!podeAcessarVeiculo(veiculoSelecionado)) {
      setErro(
        "Você não tem permissão para registrar a saída de um veículo de outro pátio."
      );
      return;
    }

    setErro("");
    setMensagem("");

    if (!form.tipoDestino) {
      setErro(
        "Selecione o tipo do destino."
      );

      return;
    }

    if (
      !form.destinoLocal.trim()
    ) {
      setErro(
        "Informe para onde o veículo será encaminhado."
      );

      return;
    }

    if (
      !form.responsavel.trim()
    ) {
      setErro(
        "Informe o responsável pela retirada ou transporte."
      );

      return;
    }

    if (
      !form.documento.trim()
    ) {
      setErro(
        "Informe o documento do responsável."
      );

      return;
    }

    const confirmou =
      window.confirm(
        `Confirma a saída do veículo ${veiculoSelecionado.placa} para "${form.destinoLocal}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);

      const agora =
        new Date().toISOString();

      const dados = {
        outro_destino_tipo:
          form.tipoDestino,

        outro_destino_local:
          form.destinoLocal.trim(),

        outro_destino_cidade:
          form.cidade.trim() ||
          null,

        outro_destino_protocolo:
          form.protocolo.trim() ||
          null,

        outro_destino_autorizado_por:
          form.autorizadoPor.trim() ||
          null,

        outro_destino_responsavel:
          form.responsavel.trim(),

        outro_destino_documento:
          form.documento.trim(),

        outro_destino_observacoes:
          form.observacoes.trim() ||
          null,

        outro_destino_data_saida:
          agora,

        destino_atual:
          "OUTRO_DESTINO",

        status:
          "RETIRADO_OUTRO_DESTINO",
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
            patioUsuarioId
          );
      }

      const {
        error: updateError,
      } = await consultaAtualizacao;

      if (updateError) {
        throw updateError;
      }

      // ===============================================
      // MOVIMENTAÇÃO
      // ===============================================

      const descricao = [
        "Saída para outro destino concluída.",

        `Placa: ${
          veiculoSelecionado.placa ||
          "-"
        }.`,

        `Tipo do destino: ${
          form.tipoDestino
        }.`,

        `Destino: ${
          form.destinoLocal.trim()
        }.`,

        form.cidade.trim()
          ? `Cidade: ${form.cidade.trim()}.`
          : "",

        form.protocolo.trim()
          ? `Protocolo: ${form.protocolo.trim()}.`
          : "",

        `Responsável: ${
          form.responsavel.trim()
        }.`,

        `Documento: ${
          form.documento.trim()
        }.`,
      ]
        .filter(Boolean)
        .join(" ");

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

          tipo: "SAIDA",

          descricao,
        });

      if (
        movimentacaoError
      ) {
        console.error(
          "Veículo atualizado, mas houve erro ao registrar movimentação:",
          movimentacaoError
        );
      }

      setMensagem(
        `Saída do veículo ${veiculoSelecionado.placa} registrada com sucesso.`
      );

      setVeiculoSelecionado(
        null
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao finalizar saída:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível registrar a saída."
      );
    } finally {
      setSalvando(false);
    }
  }

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
  // CARREGANDO
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Carregando outros destinos...
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
            Outros Destinos
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Controle veículos encaminhados para
            destinos diferentes dos fluxos de
            liberação, leilão ou retirada judicial.
          </p>

          <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            🏢 Acesso: {
              ehMaster
                ? "Todos os pátios"
                : nomePatio(patioUsuarioId)
            }
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
                "AGUARDANDO"
              )
            }
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              filtro ===
              "AGUARDANDO"
                ? "border-blue-300 bg-blue-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >

            <p className="text-sm font-bold text-amber-700">
              Aguardando saída
            </p>

            <p className="mt-2 text-3xl font-black text-amber-700">
              {totalAguardando}
            </p>

          </button>

          <button
            type="button"
            onClick={() =>
              setFiltro(
                "RETIRADOS"
              )
            }
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              filtro ===
              "RETIRADOS"
                ? "border-blue-300 bg-blue-50"
                : "border-green-200 bg-green-50"
            }`}
          >

            <p className="text-sm font-bold text-green-700">
              Encaminhados
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
                placeholder="Pesquisar placa, veículo, destino, protocolo..."
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
                Aguardando saída
              </option>

              <option value="RETIRADOS">
                Encaminhados
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
              ↗
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
                  "RETIRADO_OUTRO_DESTINO";

                return (
                  <div
                    key={veiculo.id}
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
                              retirado
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {retirado
                              ? "ENCAMINHADO"
                              : "AGUARDANDO"}
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
                        ↗
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
                          RENAVAM
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.renavam ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Tipo do destino
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.outro_destino_tipo ||
                            "-"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-black uppercase text-slate-400">
                          Destino
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.outro_destino_local ||
                            "-"}
                        </p>

                      </div>

                    </div>

                    {/* SAÍDA CONCLUÍDA */}

                    {retirado &&
                      veiculo.outro_destino_data_saida && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                          <p className="text-xs font-black uppercase text-green-600">
                            Encaminhamento realizado
                          </p>

                          <p className="mt-1 font-semibold text-green-800">
                            {formatarData(
                              veiculo.outro_destino_data_saida
                            )}
                          </p>

                          {veiculo.outro_destino_responsavel && (
                            <p className="mt-1 text-sm text-green-700">
                              Responsável:{" "}
                              {
                                veiculo.outro_destino_responsavel
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
                      className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black transition ${
                        retirado
                          ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {retirado
                        ? "Ver informações"
                        : "Registrar encaminhamento"}
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
                  Outros destinos
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
                      Pátio atual
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
                  DESTINO
              ========================================== */}

              <div>

                <h3 className="text-lg font-black text-slate-900">
                  Destino do veículo
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Informe para onde o veículo será
                  encaminhado.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Tipo do destino *
                    </label>

                    <select
                      name="tipoDestino"
                      value={
                        form.tipoDestino
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_OUTRO_DESTINO"
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    >

                      <option value="">
                        Selecione
                      </option>

                      {TIPOS_DESTINO.map(
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
                      Destino / Local *
                    </label>

                    <input
                      type="text"
                      name="destinoLocal"
                      value={
                        form.destinoLocal
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_OUTRO_DESTINO"
                      }
                      placeholder="Ex.: Delegacia de Apucarana"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Cidade / UF
                    </label>

                    <input
                      type="text"
                      name="cidade"
                      value={
                        form.cidade
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_OUTRO_DESTINO"
                      }
                      placeholder="Ex.: Apucarana - PR"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Protocolo / Documento
                    </label>

                    <input
                      type="text"
                      name="protocolo"
                      value={
                        form.protocolo
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_OUTRO_DESTINO"
                      }
                      placeholder="Número do protocolo ou documento"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                </div>

              </div>

              {/* =========================================
                  AUTORIZAÇÃO
              ========================================== */}

              <div className="mt-8 border-t border-slate-200 pt-6">

                <h3 className="text-lg font-black text-slate-900">
                  Autorização
                </h3>

                <div className="mt-5">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Autorizado por
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
                      "RETIRADO_OUTRO_DESTINO"
                    }
                    placeholder="Nome, setor, órgão ou responsável pela autorização"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />

                </div>

              </div>

              {/* =========================================
                  RESPONSÁVEL
              ========================================== */}

              <div className="mt-8 border-t border-slate-200 pt-6">

                <h3 className="text-lg font-black text-slate-900">
                  Responsável pela retirada / transporte
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Informe quem está retirando fisicamente
                  o veículo do pátio.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Nome do responsável *
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
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_OUTRO_DESTINO"
                      }
                      placeholder="Nome completo"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Documento *
                    </label>

                    <input
                      type="text"
                      name="documento"
                      value={
                        form.documento
                      }
                      onChange={
                        alterarCampo
                      }
                      disabled={
                        veiculoSelecionado.status ===
                        "RETIRADO_OUTRO_DESTINO"
                      }
                      placeholder="CPF, RG, CNH ou identificação"
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
                    "RETIRADO_OUTRO_DESTINO"
                  }
                  rows={4}
                  placeholder="Informações sobre o encaminhamento, documentos, condições do veículo..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                />

              </div>

              {/* =========================================
                  SAÍDA REALIZADA
              ========================================== */}

              {veiculoSelecionado.status ===
                "RETIRADO_OUTRO_DESTINO" && (
                <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5">

                  <p className="font-black text-green-800">
                    ✓ Encaminhamento concluído
                  </p>

                  <p className="mt-2 text-sm text-green-700">
                    Destino:{" "}
                    {
                      veiculoSelecionado.outro_destino_local ||
                      "-"
                    }
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Data da saída:{" "}
                    {formatarData(
                      veiculoSelecionado.outro_destino_data_saida
                    )}
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Responsável:{" "}
                    {
                      veiculoSelecionado.outro_destino_responsavel ||
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
                  "RETIRADO_OUTRO_DESTINO" && (
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
                        finalizarSaida
                      }
                      disabled={
                        salvando
                      }
                      className="rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {salvando
                        ? "Processando..."
                        : "✓ Registrar saída"}
                    </button>
                  </>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}