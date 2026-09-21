import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";

export default function JudicialRetrieval() {
  const [veiculos, setVeiculos] = useState([]);
  const [patios, setPatios] = useState([]);

  // Controle de acesso por pátio
  const [perfilAtual, setPerfilAtual] = useState(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("AGUARDANDO");

  const [veiculoSelecionado, setVeiculoSelecionado] =
    useState(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [form, setForm] = useState({
    processo: "",
    vara: "",
    comarca: "",
    oficialNome: "",
    oficialDocumento: "",
    mandado: "",
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
      // VEÍCULOS DA RETIRADA JUDICIAL
      // ===================================================

      let consultaVeiculos = supabase
        .from("veiculos")
        .select("*")
        .is("excluido_em", null)
        .or(
          "destino_atual.eq.JUDICIAL,status.eq.AGUARDANDO_RETIRADA_JUDICIAL,status.eq.RETIRADO_JUDICIAL"
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
        { data: veiculosData, error: veiculosError },
        { data: patiosData, error: patiosError },
      ] = await Promise.all([
        consultaVeiculos,

        supabase
          .from("patios")
          .select("id, nome, cidade, estado"),
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
        "Erro ao carregar retirada judicial:",
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
  // PÁTIO
  // =====================================================

  function nomePatio(patioId) {
    const patio = patios.find(
      (item) => item.id === patioId
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
  // FILTRAR VEÍCULOS
  // =====================================================

  const veiculosFiltrados = useMemo(() => {
    const termo = pesquisa
      .trim()
      .toLowerCase();

    return veiculos.filter((veiculo) => {
      const retirado =
        veiculo.status ===
        "RETIRADO_JUDICIAL";

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
        veiculo.judicial_processo,
        veiculo.judicial_oficial_nome,
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

  const totalAguardando =
    veiculos.filter(
      (veiculo) =>
        veiculo.status !==
        "RETIRADO_JUDICIAL"
    ).length;

  const totalRetirados =
    veiculos.filter(
      (veiculo) =>
        veiculo.status ===
        "RETIRADO_JUDICIAL"
    ).length;

  // =====================================================
  // ABRIR RETIRADA
  // =====================================================

  function abrirRetirada(veiculo) {
    if (!podeAcessarVeiculo(veiculo)) {
      setErro(
        "Você não tem acesso a veículos de outro pátio."
      );
      return;
    }

    setVeiculoSelecionado(veiculo);

    setForm({
      processo:
        veiculo.judicial_processo || "",

      vara:
        veiculo.judicial_vara || "",

      comarca:
        veiculo.judicial_comarca || "",

      oficialNome:
        veiculo.judicial_oficial_nome || "",

      oficialDocumento:
        veiculo.judicial_oficial_documento || "",

      mandado:
        veiculo.judicial_mandado || "",

      observacoes:
        veiculo.judicial_observacoes || "",
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
  // SALVAR INFORMAÇÕES SEM FINALIZAR
  // =====================================================

  async function salvarInformacoes() {
    if (!veiculoSelecionado) {
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
        judicial_processo:
          form.processo.trim() || null,

        judicial_vara:
          form.vara.trim() || null,

        judicial_comarca:
          form.comarca.trim() || null,

        judicial_oficial_nome:
          form.oficialNome.trim() || null,

        judicial_oficial_documento:
          form.oficialDocumento.trim() ||
          null,

        judicial_mandado:
          form.mandado.trim() || null,

        judicial_observacoes:
          form.observacoes.trim() || null,

        destino_atual: "JUDICIAL",

        status:
          "AGUARDANDO_RETIRADA_JUDICIAL",
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
        "Informações judiciais salvas com sucesso."
      );

      await carregarDados();

      setVeiculoSelecionado((anterior) => ({
        ...anterior,
        ...dados,
      }));
    } catch (error) {
      console.error(
        "Erro ao salvar informações:",
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

    if (!podeAcessarVeiculo(veiculoSelecionado)) {
      setErro(
        "Você não tem permissão para finalizar a retirada de um veículo de outro pátio."
      );
      return;
    }

    setErro("");
    setMensagem("");

    if (!form.processo.trim()) {
      setErro(
        "Informe o número do processo judicial."
      );
      return;
    }

    if (!form.oficialNome.trim()) {
      setErro(
        "Informe o nome do responsável pela retirada."
      );
      return;
    }

    if (
      !form.oficialDocumento.trim()
    ) {
      setErro(
        "Informe o documento ou matrícula do responsável."
      );
      return;
    }

    const confirmou =
      window.confirm(
        `Confirma a retirada judicial do veículo ${veiculoSelecionado.placa}?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);

      const agora =
        new Date().toISOString();

      const dados = {
        judicial_processo:
          form.processo.trim(),

        judicial_vara:
          form.vara.trim() || null,

        judicial_comarca:
          form.comarca.trim() || null,

        judicial_oficial_nome:
          form.oficialNome.trim(),

        judicial_oficial_documento:
          form.oficialDocumento.trim(),

        judicial_mandado:
          form.mandado.trim() || null,

        judicial_observacoes:
          form.observacoes.trim() || null,

        judicial_data_retirada:
          agora,

        destino_atual: "JUDICIAL",

        status:
          "RETIRADO_JUDICIAL",
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

      const { error: updateError } =
        await consultaAtualizacao;

      if (updateError) {
        throw updateError;
      }

      // =================================================
      // REGISTRAR MOVIMENTAÇÃO
      // =================================================

      const descricao = [
        "Retirada judicial concluída.",
        `Placa: ${
          veiculoSelecionado.placa ||
          "-"
        }.`,
        `Processo: ${
          form.processo.trim()
        }.`,
        `Responsável: ${
          form.oficialNome.trim()
        }.`,
        `Documento/Matrícula: ${
          form.oficialDocumento.trim()
        }.`,
      ].join(" ");

      const {
        error: movimentacaoError,
      } = await supabase
        .from("movimentacoes")
        .insert({
          veiculo_id:
            veiculoSelecionado.id,

          tipo: "RETIRADA",

          descricao,
        });

      if (movimentacaoError) {
        console.error(
          "Veículo atualizado, mas houve erro ao registrar movimentação:",
          movimentacaoError
        );
      }

      setMensagem(
        `Retirada judicial do veículo ${veiculoSelecionado.placa} concluída com sucesso.`
      );

      setVeiculoSelecionado(null);

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao finalizar retirada:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível finalizar a retirada judicial."
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

  // =====================================================
  // CARREGANDO
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Carregando retiradas judiciais...
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
            Retirada Judicial
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Controle os veículos destinados à
            retirada por determinação judicial,
            oficial de justiça ou responsável
            autorizado.
          </p>

          <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            🏢 Acesso: {
              ehMaster
                ? "Todos os pátios"
                : nomePatio(patioUsuarioId)
            }
          </div>
        </div>

        {/* ===============================================
            MENSAGENS
        ================================================ */}

        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {mensagem}
          </div>
        )}

        {/* ===============================================
            RESUMO
        ================================================ */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Total
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {veiculos.length}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-amber-700">
              Aguardando retirada
            </p>

            <p className="mt-2 text-3xl font-black text-amber-700">
              {totalAguardando}
            </p>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-green-700">
              Retirados
            </p>

            <p className="mt-2 text-3xl font-black text-green-700">
              {totalRetirados}
            </p>
          </div>
        </div>

        {/* ===============================================
            FILTROS
        ================================================ */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">

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
                placeholder="Pesquisar por placa, veículo, processo, proprietário..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  setFiltro("AGUARDANDO")
                }
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  filtro === "AGUARDANDO"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Aguardando
              </button>

              <button
                type="button"
                onClick={() =>
                  setFiltro("RETIRADOS")
                }
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  filtro === "RETIRADOS"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Retirados
              </button>

              <button
                type="button"
                onClick={() =>
                  setFiltro("TODOS")
                }
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  filtro === "TODOS"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Todos
              </button>

            </div>
          </div>
        </div>

        {/* ===============================================
            LISTA
        ================================================ */}

        {veiculosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-4xl">
              ⚖
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
                  "RETIRADO_JUDICIAL";

                return (
                  <div
                    key={veiculo.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

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
                        ⚖
                      </div>

                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          RENAVAM
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.renavam ||
                            "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Processo
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.judicial_processo ||
                            "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Proprietário
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {veiculo.proprietario ||
                            "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Entrada
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatarData(
                            veiculo.data_entrada
                          )}
                        </p>
                      </div>

                    </div>

                    {retirado &&
                      veiculo.judicial_data_retirada && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                          <p className="text-xs font-bold uppercase text-green-600">
                            Retirada realizada
                          </p>

                          <p className="mt-1 text-sm font-semibold text-green-800">
                            {formatarData(
                              veiculo.judicial_data_retirada
                            )}
                          </p>

                          {veiculo.judicial_oficial_nome && (
                            <p className="mt-1 text-sm text-green-700">
                              Responsável:{" "}
                              {
                                veiculo.judicial_oficial_nome
                              }
                            </p>
                          )}

                        </div>
                      )}

                    <button
                      type="button"
                      onClick={() =>
                        abrirRetirada(
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
                        ? "Ver informações da retirada"
                        : "Registrar retirada judicial"}
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

          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* CABEÇALHO */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Retirada Judicial
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {veiculoSelecionado.placa}
                  {" - "}
                  {veiculoSelecionado.modelo}
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

                <div className="grid gap-3 sm:grid-cols-3">

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Placa
                    </p>

                    <p className="mt-1 font-black uppercase text-slate-800">
                      {
                        veiculoSelecionado.placa
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Veículo
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {
                        veiculoSelecionado.marca
                      }{" "}
                      {
                        veiculoSelecionado.modelo
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
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

              {/* ERRO */}

              {erro && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {erro}
                </div>
              )}

              {mensagem && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  {mensagem}
                </div>
              )}

              {/* FORMULÁRIO */}

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Número do processo *
                  </label>

                  <input
                    type="text"
                    name="processo"
                    value={form.processo}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_JUDICIAL"
                    }
                    placeholder="Ex.: 0000000-00.2026.8.16.0000"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Vara
                  </label>

                  <input
                    type="text"
                    name="vara"
                    value={form.vara}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_JUDICIAL"
                    }
                    placeholder="Ex.: 2ª Vara Cível"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Comarca
                  </label>

                  <input
                    type="text"
                    name="comarca"
                    value={form.comarca}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_JUDICIAL"
                    }
                    placeholder="Ex.: Apucarana - PR"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Número do mandado
                  </label>

                  <input
                    type="text"
                    name="mandado"
                    value={form.mandado}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_JUDICIAL"
                    }
                    placeholder="Número ou referência do mandado"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Nome do responsável / Oficial *
                  </label>

                  <input
                    type="text"
                    name="oficialNome"
                    value={form.oficialNome}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_JUDICIAL"
                    }
                    placeholder="Nome completo"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Documento / Matrícula *
                  </label>

                  <input
                    type="text"
                    name="oficialDocumento"
                    value={
                      form.oficialDocumento
                    }
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_JUDICIAL"
                    }
                    placeholder="CPF, matrícula ou identificação"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Observações
                  </label>

                  <textarea
                    name="observacoes"
                    value={form.observacoes}
                    onChange={alterarCampo}
                    disabled={
                      veiculoSelecionado.status ===
                      "RETIRADO_JUDICIAL"
                    }
                    rows={4}
                    placeholder="Documentação apresentada, condições da retirada, informações adicionais..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

              </div>

              {/* RETIRADO */}

              {veiculoSelecionado.status ===
                "RETIRADO_JUDICIAL" && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">

                  <p className="font-black text-green-800">
                    ✓ Retirada judicial concluída
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Data:{" "}
                    {formatarData(
                      veiculoSelecionado.judicial_data_retirada
                    )}
                  </p>

                </div>
              )}

              {/* BOTÕES */}

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>

                {veiculoSelecionado.status !==
                  "RETIRADO_JUDICIAL" && (
                  <>
                    <button
                      type="button"
                      onClick={
                        salvarInformacoes
                      }
                      disabled={salvando}
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
                      disabled={salvando}
                      className="rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {salvando
                        ? "Processando..."
                        : "✓ Finalizar retirada judicial"}
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