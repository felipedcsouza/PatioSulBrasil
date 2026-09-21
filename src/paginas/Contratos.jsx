import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

const CATEGORIAS = [
  { id: "MOTO", nome: "Moto" },
  { id: "CARRO", nome: "Carro" },
  { id: "CAMINHAO", nome: "Caminhão" },
  { id: "REBOQUE", nome: "Reboque" },
  { id: "OUTRO", nome: "Outro" },
];

const TARIFAS_INICIAIS = {
  MOTO: "0,00",
  CARRO: "0,00",
  CAMINHAO: "0,00",
  REBOQUE: "0,00",
  OUTRO: "0,00",
};

function valorParaNumero(valor) {
  if (typeof valor === "number") {
    return valor;
  }

  const texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(texto || 0);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function numeroParaCampo(valor) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
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

function formatarData(data) {
  if (!data) {
    return "Não informado";
  }

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function nomeSeguroArquivo(nome) {
  return String(nome || "contrato")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function Contratos() {
  const {
    perfil,
    isMaster,
    loading: loadingAuth,
  } = useAuth();

  const [contratos, setContratos] = useState([]);
  const [patios, setPatios] = useState([]);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("ATIVOS");
  const [filtroPatio, setFiltroPatio] = useState("TODOS");

  const [modalAberto, setModalAberto] = useState(false);
  const [contratoEditando, setContratoEditando] = useState(null);

  const [form, setForm] = useState({
    patio_id: "",
    nome: "",
    contratante: "",
    numero_contrato: "",
    vigencia_inicio: "",
    vigencia_fim: "",
    observacoes: "",
    ativo: true,
  });

  const [tarifas, setTarifas] = useState({
    ...TARIFAS_INICIAIS,
  });

  const [arquivo, setArquivo] = useState(null);

  const patioUsuarioId = perfil?.patio_id
    ? String(perfil.patio_id)
    : "";

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  useEffect(() => {
    if (loadingAuth) {
      return;
    }

    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadingAuth,
    isMaster,
    perfil?.patio_id,
  ]);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      if (!perfil?.id) {
        setContratos([]);
        setPatios([]);
        return;
      }

      if (!isMaster && !perfil?.patio_id) {
        setContratos([]);
        setPatios([]);
        setErro(
          "Seu usuário ainda não está vinculado a um pátio."
        );
        return;
      }

      let patiosQuery = supabase
        .from("patios")
        .select("id, nome, ativo")
        .order("nome", {
          ascending: true,
        });

      if (isMaster) {
        patiosQuery = patiosQuery.eq(
          "ativo",
          true
        );
      } else {
        patiosQuery = patiosQuery.eq(
          "id",
          Number(perfil.patio_id)
        );
      }

      const {
        data: patiosData,
        error: patiosError,
      } = await patiosQuery;

      if (patiosError) {
        throw patiosError;
      }

      setPatios(patiosData || []);

      let contratosQuery = supabase
        .from("contratos")
        .select(`
          id,
          patio_id,
          nome,
          contratante,
          numero_contrato,
          vigencia_inicio,
          vigencia_fim,
          arquivo_path,
          arquivo_nome,
          observacoes,
          ativo,
          created_at,
          updated_at,
          patios (
            id,
            nome
          ),
          contrato_tarifas (
            id,
            categoria,
            valor_diaria
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (!isMaster) {
        contratosQuery = contratosQuery.eq(
          "patio_id",
          Number(perfil.patio_id)
        );
      }

      const {
        data: contratosData,
        error: contratosError,
      } = await contratosQuery;

      if (contratosError) {
        throw contratosError;
      }

      setContratos(contratosData || []);
    } catch (error) {
      console.error(
        "Erro ao carregar contratos:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os contratos."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FILTROS
  // =====================================================

  const contratosFiltrados = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase();

    return contratos.filter((contrato) => {
      if (
        filtroStatus === "ATIVOS" &&
        !contrato.ativo
      ) {
        return false;
      }

      if (
        filtroStatus === "INATIVOS" &&
        contrato.ativo
      ) {
        return false;
      }

      if (
        isMaster &&
        filtroPatio !== "TODOS" &&
        String(contrato.patio_id) !==
          String(filtroPatio)
      ) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const texto = [
        contrato.nome,
        contrato.contratante,
        contrato.numero_contrato,
        contrato.patios?.nome,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [
    contratos,
    busca,
    filtroStatus,
    filtroPatio,
    isMaster,
  ]);

  const resumo = useMemo(() => {
    const ativos = contratos.filter(
      (contrato) => contrato.ativo
    ).length;

    const inativos = contratos.length - ativos;

    return {
      total: contratos.length,
      ativos,
      inativos,
    };
  }, [contratos]);

  // =====================================================
  // NOVO / EDITAR
  // =====================================================

  function abrirNovoContrato() {
    setErro("");
    setMensagem("");
    setContratoEditando(null);
    setArquivo(null);

    setForm({
      patio_id: isMaster
        ? ""
        : patioUsuarioId,
      nome: "",
      contratante: "",
      numero_contrato: "",
      vigencia_inicio: "",
      vigencia_fim: "",
      observacoes: "",
      ativo: true,
    });

    setTarifas({
      ...TARIFAS_INICIAIS,
    });

    setModalAberto(true);
  }

  function abrirEditarContrato(contrato) {
    if (!podeAcessarContrato(contrato)) {
      setErro(
        "Você não possui acesso a este contrato."
      );
      return;
    }

    setErro("");
    setMensagem("");
    setContratoEditando(contrato);
    setArquivo(null);

    setForm({
      patio_id: String(
        contrato.patio_id || ""
      ),
      nome: contrato.nome || "",
      contratante:
        contrato.contratante || "",
      numero_contrato:
        contrato.numero_contrato || "",
      vigencia_inicio:
        contrato.vigencia_inicio || "",
      vigencia_fim:
        contrato.vigencia_fim || "",
      observacoes:
        contrato.observacoes || "",
      ativo: contrato.ativo !== false,
    });

    const novasTarifas = {
      ...TARIFAS_INICIAIS,
    };

    for (const tarifa of
      contrato.contrato_tarifas || []) {
      novasTarifas[tarifa.categoria] =
        numeroParaCampo(
          tarifa.valor_diaria
        );
    }

    setTarifas(novasTarifas);
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setModalAberto(false);
    setContratoEditando(null);
    setArquivo(null);
  }

  function podeAcessarContrato(contrato) {
    if (isMaster) {
      return true;
    }

    return (
      patioUsuarioId &&
      String(contrato?.patio_id) ===
        patioUsuarioId
    );
  }

  // =====================================================
  // ARQUIVO
  // =====================================================

  function selecionarArquivo(event) {
    setErro("");

    const selecionado =
      event.target.files?.[0];

    if (!selecionado) {
      setArquivo(null);
      return;
    }

    const extensoesAceitas = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !extensoesAceitas.includes(
        selecionado.type
      )
    ) {
      setArquivo(null);
      setErro(
        "Envie um PDF, JPG, PNG ou WEBP."
      );
      event.target.value = "";
      return;
    }

    const LIMITE = 20 * 1024 * 1024;

    if (selecionado.size > LIMITE) {
      setArquivo(null);
      setErro(
        "O arquivo deve ter no máximo 20 MB."
      );
      event.target.value = "";
      return;
    }

    setArquivo(selecionado);
  }

  async function abrirArquivoContrato(
    contrato
  ) {
    try {
      setErro("");

      if (!podeAcessarContrato(contrato)) {
        throw new Error(
          "Você não possui acesso a este arquivo."
        );
      }

      if (!contrato.arquivo_path) {
        throw new Error(
          "Este contrato não possui arquivo anexado."
        );
      }

      const { data, error } =
        await supabase.storage
          .from("contratos-patio")
          .createSignedUrl(
            contrato.arquivo_path,
            120
          );

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Não foi possível gerar o link do arquivo."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Erro ao abrir contrato:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível abrir o contrato."
      );
    }
  }

  // =====================================================
  // SALVAR
  // =====================================================

  async function salvarContrato(event) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    const patioIdEfetivo = isMaster
      ? Number(form.patio_id)
      : Number(perfil?.patio_id);

    if (!patioIdEfetivo) {
      setErro("Selecione um pátio.");
      return;
    }

    if (!form.nome.trim()) {
      setErro(
        "Informe o nome do contrato."
      );
      return;
    }

    if (
      form.vigencia_inicio &&
      form.vigencia_fim &&
      form.vigencia_fim <
        form.vigencia_inicio
    ) {
      setErro(
        "A data final da vigência não pode ser anterior à data inicial."
      );
      return;
    }

    let caminhoNovoArquivo = null;

    try {
      setSalvando(true);

      if (
        !isMaster &&
        String(patioIdEfetivo) !==
          patioUsuarioId
      ) {
        throw new Error(
          "Você não pode cadastrar contrato em outro pátio."
        );
      }

      let arquivoPath =
        contratoEditando?.arquivo_path ||
        null;

      let arquivoNome =
        contratoEditando?.arquivo_nome ||
        null;

      // ================================================
      // UPLOAD DE NOVO ARQUIVO
      // ================================================

      if (arquivo) {
        const nomeFinal = `${Date.now()}-${nomeSeguroArquivo(
          arquivo.name
        )}`;

        caminhoNovoArquivo = `${patioIdEfetivo}/${nomeFinal}`;

        const { error: uploadError } =
          await supabase.storage
            .from("contratos-patio")
            .upload(
              caminhoNovoArquivo,
              arquivo,
              {
                upsert: false,
                contentType:
                  arquivo.type || undefined,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        arquivoPath = caminhoNovoArquivo;
        arquivoNome = arquivo.name;
      }

      const payload = {
        patio_id: patioIdEfetivo,
        nome: form.nome.trim(),
        contratante:
          form.contratante.trim() ||
          null,
        numero_contrato:
          form.numero_contrato.trim() ||
          null,
        vigencia_inicio:
          form.vigencia_inicio || null,
        vigencia_fim:
          form.vigencia_fim || null,
        arquivo_path: arquivoPath,
        arquivo_nome: arquivoNome,
        observacoes:
          form.observacoes.trim() ||
          null,
        ativo: Boolean(form.ativo),
        updated_at:
          new Date().toISOString(),
      };

      let contratoSalvo;

      if (contratoEditando?.id) {
        let query = supabase
          .from("contratos")
          .update(payload)
          .eq(
            "id",
            contratoEditando.id
          );

        if (!isMaster) {
          query = query.eq(
            "patio_id",
            Number(perfil.patio_id)
          );
        }

        const {
          data,
          error,
        } = await query
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        contratoSalvo = data;
      } else {
        const {
          data,
          error,
        } = await supabase
          .from("contratos")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        contratoSalvo = data;
      }

      if (!contratoSalvo?.id) {
        throw new Error(
          "Não foi possível identificar o contrato salvo."
        );
      }

      // ================================================
      // TARIFAS
      // ================================================

      const linhasTarifas =
        CATEGORIAS.map(
          (categoria) => ({
            contrato_id:
              contratoSalvo.id,
            categoria:
              categoria.id,
            valor_diaria:
              valorParaNumero(
                tarifas[
                  categoria.id
                ]
              ),
            updated_at:
              new Date().toISOString(),
          })
        );

      const { error: tarifasError } =
        await supabase
          .from("contrato_tarifas")
          .upsert(
            linhasTarifas,
            {
              onConflict:
                "contrato_id,categoria",
            }
          );

      if (tarifasError) {
        throw tarifasError;
      }

      // ================================================
      // REMOVER ARQUIVO ANTIGO APÓS SUCESSO
      // ================================================

      if (
        arquivo &&
        contratoEditando?.arquivo_path &&
        contratoEditando.arquivo_path !==
          arquivoPath
      ) {
        const { error: removerError } =
          await supabase.storage
            .from("contratos-patio")
            .remove([
              contratoEditando.arquivo_path,
            ]);

        if (removerError) {
          console.warn(
            "Não foi possível remover o arquivo antigo:",
            removerError
          );
        }
      }

      setMensagem(
        contratoEditando
          ? "Contrato atualizado com sucesso."
          : "Contrato cadastrado com sucesso."
      );

      setModalAberto(false);
      setContratoEditando(null);
      setArquivo(null);

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao salvar contrato:",
        error
      );

      if (
        caminhoNovoArquivo &&
        caminhoNovoArquivo !==
          contratoEditando?.arquivo_path
      ) {
        await supabase.storage
          .from("contratos-patio")
          .remove([
            caminhoNovoArquivo,
          ]);
      }

      setErro(
        error?.message ||
          "Não foi possível salvar o contrato."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =====================================================
  // ATIVAR / DESATIVAR
  // =====================================================

  async function alterarStatus(contrato) {
    try {
      setErro("");
      setMensagem("");

      if (!podeAcessarContrato(contrato)) {
        throw new Error(
          "Você não possui acesso a este contrato."
        );
      }

      let query = supabase
        .from("contratos")
        .update({
          ativo: !contrato.ativo,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", contrato.id);

      if (!isMaster) {
        query = query.eq(
          "patio_id",
          Number(perfil.patio_id)
        );
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      setMensagem(
        contrato.ativo
          ? "Contrato desativado."
          : "Contrato ativado."
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao alterar contrato:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível alterar o contrato."
      );
    }
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}

        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#A88400]">
              Pátio Sul Brasil
            </p>

            <h1 className="mt-1 text-3xl font-black text-[#211E1F]">
              Contratos e Tarifas
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              Cadastre contratos por pátio, anexe o documento original e defina as diárias aplicáveis a cada categoria de veículo.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovoContrato}
            disabled={
              !isMaster &&
              !perfil?.patio_id
            }
            className="rounded-xl bg-[#FFC400] px-5 py-3 font-black text-[#211E1F] shadow-sm transition hover:bg-[#FFD43B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Novo contrato
          </button>
        </div>

        {/* MENSAGENS */}

        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {mensagem}
          </div>
        )}

        {/* RESUMO */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <ResumoCard
            titulo="Total de contratos"
            valor={resumo.total}
          />

          <ResumoCard
            titulo="Contratos ativos"
            valor={resumo.ativos}
          />

          <ResumoCard
            titulo="Contratos inativos"
            valor={resumo.inativos}
          />
        </div>

        {/* FILTROS */}

        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_220px]">
            <input
              type="text"
              value={busca}
              onChange={(event) =>
                setBusca(
                  event.target.value
                )
              }
              placeholder="Buscar por contrato, contratante, número ou pátio..."
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20"
            />

            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(
                  event.target.value
                )
              }
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-semibold text-[#211E1F] outline-none focus:border-[#FFC400]"
            >
              <option value="ATIVOS">
                Ativos
              </option>
              <option value="INATIVOS">
                Inativos
              </option>
              <option value="TODOS">
                Todos
              </option>
            </select>

            {isMaster ? (
              <select
                value={filtroPatio}
                onChange={(event) =>
                  setFiltroPatio(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-semibold text-[#211E1F] outline-none focus:border-[#FFC400]"
              >
                <option value="TODOS">
                  Todos os pátios
                </option>

                {patios.map((patio) => (
                  <option
                    key={patio.id}
                    value={patio.id}
                  >
                    {patio.nome}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center rounded-xl border border-[#FFC400]/40 bg-[#FFC400]/10 px-4 py-3 text-sm font-bold text-[#211E1F]">
                🏢 {patios[0]?.nome || "Meu pátio"}
              </div>
            )}
          </div>
        </div>

        {/* CONTEÚDO */}

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-[#FFC400]" />

            <p className="mt-4 font-semibold text-zinc-500">
              Carregando contratos...
            </p>
          </div>
        ) : contratosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <div className="text-4xl">
              📄
            </div>

            <h2 className="mt-4 text-xl font-black text-[#211E1F]">
              Nenhum contrato encontrado
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Cadastre o primeiro contrato para começar a configurar as diárias do pátio.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {contratosFiltrados.map(
              (contrato) => (
                <ContratoCard
                  key={contrato.id}
                  contrato={contrato}
                  onEditar={() =>
                    abrirEditarContrato(
                      contrato
                    )
                  }
                  onArquivo={() =>
                    abrirArquivoContrato(
                      contrato
                    )
                  }
                  onStatus={() =>
                    alterarStatus(
                      contrato
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </div>

      {/* =================================================
          MODAL
      ================================================== */}

      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-8">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#211E1F] px-5 py-4 md:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#FFC400]">
                  Contratos do pátio
                </p>

                <h2 className="mt-1 text-xl font-black text-white">
                  {contratoEditando
                    ? "Editar contrato"
                    : "Novo contrato"}
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-xl text-white transition hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={salvarContrato}
              className="space-y-6 p-5 md:p-6"
            >
              {/* DADOS DO CONTRATO */}

              <section>
                <TituloSecao>
                  Dados do contrato
                </TituloSecao>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Campo label="Pátio *">
                    <select
                      value={form.patio_id}
                      onChange={(event) =>
                        setForm((atual) => ({
                          ...atual,
                          patio_id:
                            event.target.value,
                        }))
                      }
                      disabled={!isMaster}
                      className="campo-contrato"
                    >
                      <option value="">
                        Selecione...
                      </option>

                      {patios.map((patio) => (
                        <option
                          key={patio.id}
                          value={patio.id}
                        >
                          {patio.nome}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Nome do contrato *">
                    <input
                      value={form.nome}
                      onChange={(event) =>
                        setForm((atual) => ({
                          ...atual,
                          nome: event.target.value,
                        }))
                      }
                      placeholder="Ex.: Seguradora Alfa 2026"
                      className="campo-contrato"
                    />
                  </Campo>

                  <Campo label="Contratante">
                    <input
                      value={form.contratante}
                      onChange={(event) =>
                        setForm((atual) => ({
                          ...atual,
                          contratante:
                            event.target.value,
                        }))
                      }
                      placeholder="Empresa, seguradora ou órgão"
                      className="campo-contrato"
                    />
                  </Campo>

                  <Campo label="Número do contrato">
                    <input
                      value={form.numero_contrato}
                      onChange={(event) =>
                        setForm((atual) => ({
                          ...atual,
                          numero_contrato:
                            event.target.value,
                        }))
                      }
                      placeholder="Ex.: 0045/2026"
                      className="campo-contrato"
                    />
                  </Campo>

                  <Campo label="Início da vigência">
                    <input
                      type="date"
                      value={form.vigencia_inicio}
                      onChange={(event) =>
                        setForm((atual) => ({
                          ...atual,
                          vigencia_inicio:
                            event.target.value,
                        }))
                      }
                      className="campo-contrato"
                    />
                  </Campo>

                  <Campo label="Fim da vigência">
                    <input
                      type="date"
                      value={form.vigencia_fim}
                      onChange={(event) =>
                        setForm((atual) => ({
                          ...atual,
                          vigencia_fim:
                            event.target.value,
                        }))
                      }
                      className="campo-contrato"
                    />
                  </Campo>
                </div>
              </section>

              {/* TARIFAS */}

              <section>
                <TituloSecao>
                  Diárias por categoria
                </TituloSecao>

                <p className="mt-2 text-sm text-zinc-500">
                  Informe o valor da diária previsto neste contrato. O valor será copiado para o veículo no momento da entrada.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {CATEGORIAS.map(
                    (categoria) => (
                      <div
                        key={categoria.id}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                      >
                        <label className="text-xs font-black uppercase tracking-wider text-zinc-500">
                          {categoria.nome}
                        </label>

                        <div className="mt-2 flex items-center rounded-xl border border-zinc-300 bg-white px-3 focus-within:border-[#FFC400] focus-within:ring-2 focus-within:ring-[#FFC400]/20">
                          <span className="font-black text-zinc-400">
                            R$
                          </span>

                          <input
                            inputMode="decimal"
                            value={
                              tarifas[
                                categoria.id
                              ]
                            }
                            onChange={(event) =>
                              setTarifas(
                                (atual) => ({
                                  ...atual,
                                  [categoria.id]:
                                    event.target.value,
                                })
                              )
                            }
                            className="w-full bg-transparent px-2 py-3 font-black text-[#211E1F] outline-none"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/* DOCUMENTO */}

              <section>
                <TituloSecao>
                  Documento do contrato
                </TituloSecao>

                <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={selecionarArquivo}
                    className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#FFC400] file:px-4 file:py-2.5 file:font-black file:text-[#211E1F] hover:file:bg-[#FFD43B]"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    PDF, JPG, PNG ou WEBP • máximo 20 MB.
                  </p>

                  {arquivo && (
                    <p className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-[#211E1F]">
                      Novo arquivo: {arquivo.name}
                    </p>
                  )}

                  {!arquivo &&
                    contratoEditando?.arquivo_nome && (
                      <p className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-[#211E1F]">
                        Arquivo atual: {contratoEditando.arquivo_nome}
                      </p>
                    )}
                </div>
              </section>

              {/* OBSERVAÇÕES */}

              <section>
                <TituloSecao>
                  Observações
                </TituloSecao>

                <textarea
                  value={form.observacoes}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      observacoes:
                        event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Regras específicas, tolerâncias, reajustes, observações contratuais..."
                  className="mt-4 w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20"
                />
              </section>

              <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      ativo:
                        event.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-[#FFC400]"
                />

                <div>
                  <p className="font-black text-[#211E1F]">
                    Contrato ativo
                  </p>

                  <p className="text-xs text-zinc-500">
                    Apenas contratos ativos deverão ser oferecidos no cadastro de novos veículos.
                  </p>
                </div>
              </label>

              {/* AÇÕES */}

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-xl border border-zinc-300 px-5 py-3 font-black text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#FFC400] px-6 py-3 font-black text-[#211E1F] transition hover:bg-[#FFD43B] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando && (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#211E1F]/30 border-t-[#211E1F]" />
                  )}

                  {salvando
                    ? "Salvando..."
                    : contratoEditando
                      ? "Salvar alterações"
                      : "Cadastrar contrato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .campo-contrato {
          width: 100%;
          border: 1px solid rgb(212 212 216);
          border-radius: 0.75rem;
          background: white;
          padding: 0.75rem 1rem;
          color: #211E1F;
          outline: none;
          transition: 150ms ease;
        }

        .campo-contrato:focus {
          border-color: #FFC400;
          box-shadow: 0 0 0 2px rgb(255 196 0 / 0.2);
        }

        .campo-contrato:disabled {
          background: rgb(244 244 245);
          color: rgb(113 113 122);
        }
      `}</style>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
        {titulo}
      </p>

      <p className="mt-2 text-3xl font-black text-[#211E1F]">
        {valor}
      </p>
    </div>
  );
}

function TituloSecao({
  children,
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-1.5 rounded-full bg-[#FFC400]" />

      <h3 className="text-lg font-black text-[#211E1F]">
        {children}
      </h3>
    </div>
  );
}

function Campo({
  label,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#211E1F]">
        {label}
      </span>

      {children}
    </label>
  );
}

function ContratoCard({
  contrato,
  onEditar,
  onArquivo,
  onStatus,
}) {
  const tarifasOrdenadas =
    CATEGORIAS.map((categoria) => {
      const encontrada =
        contrato.contrato_tarifas?.find(
          (tarifa) =>
            tarifa.categoria ===
            categoria.id
        );

      return {
        ...categoria,
        valor:
          encontrada?.valor_diaria || 0,
      };
    });

  const hoje = new Date()
    .toISOString()
    .slice(0, 10);

  let vigencia = "Sem vigência definida";

  if (
    contrato.vigencia_inicio ||
    contrato.vigencia_fim
  ) {
    vigencia = `${formatarData(
      contrato.vigencia_inicio
    )} até ${formatarData(
      contrato.vigencia_fim
    )}`;
  }

  const vencido =
    contrato.vigencia_fim &&
    contrato.vigencia_fim < hoje;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-[#211E1F] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-[#FFC400]">
              {contrato.patios?.nome ||
                "Pátio"}
            </p>

            <h2 className="mt-1 truncate text-xl font-black text-white">
              {contrato.nome}
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {contrato.contratante ||
                "Contratante não informado"}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
              contrato.ativo
                ? "bg-green-100 text-green-700"
                : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {contrato.ativo
              ? "ATIVO"
              : "INATIVO"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoMini
            titulo="Número"
            valor={
              contrato.numero_contrato ||
              "Não informado"
            }
          />

          <InfoMini
            titulo="Vigência"
            valor={vigencia}
            destaque={vencido}
          />
        </div>

        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Diárias contratadas
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tarifasOrdenadas.map(
              (tarifa) => (
                <div
                  key={tarifa.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                >
                  <p className="text-[11px] font-black uppercase text-zinc-400">
                    {tarifa.nome}
                  </p>

                  <p className="mt-1 font-black text-[#211E1F]">
                    {formatarMoeda(
                      tarifa.valor
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {contrato.arquivo_nome && (
          <button
            type="button"
            onClick={onArquivo}
            className="mt-5 flex w-full items-center justify-between rounded-xl border border-[#FFC400]/50 bg-[#FFC400]/10 px-4 py-3 text-left transition hover:bg-[#FFC400]/20"
          >
            <span>
              <span className="block text-xs font-black uppercase text-[#8A6B00]">
                Documento anexado
              </span>

              <span className="mt-1 block truncate text-sm font-bold text-[#211E1F]">
                📄 {contrato.arquivo_nome}
              </span>
            </span>

            <span className="font-black text-[#211E1F]">
              Abrir →
            </span>
          </button>
        )}

        {contrato.observacoes && (
          <div className="mt-4 rounded-xl bg-zinc-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Observações
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
              {contrato.observacoes}
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onEditar}
            className="rounded-xl bg-[#FFC400] px-4 py-3 font-black text-[#211E1F] transition hover:bg-[#FFD43B]"
          >
            ✎ Editar contrato
          </button>

          <button
            type="button"
            onClick={onStatus}
            className="rounded-xl border border-zinc-300 px-4 py-3 font-black text-zinc-600 transition hover:bg-zinc-50"
          >
            {contrato.ativo
              ? "Desativar contrato"
              : "Ativar contrato"}
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoMini({
  titulo,
  valor,
  destaque = false,
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
        {titulo}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${
          destaque
            ? "text-red-600"
            : "text-[#211E1F]"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
