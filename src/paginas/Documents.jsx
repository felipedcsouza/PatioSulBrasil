import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

const BUCKET = "patio-documentos";

const CATEGORIAS = [
  "CONTRATO",
  "OFÍCIO",
  "NOTA FISCAL",
  "DOCUMENTO ADMINISTRATIVO",
  "DOCUMENTO DE VEÍCULO",
  "LAUDO",
  "DOCUMENTO JUDICIAL",
  "COMPROVANTE",
  "RELATÓRIO",
  "FOTO",
  "OUTROS",
];

const TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
];

const TAMANHO_MAXIMO =
  20 * 1024 * 1024;

// =======================================================
// UTILITÁRIOS
// =======================================================

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

function formatarTamanho(bytes) {
  const tamanho =
    Number(bytes || 0);

  if (
    tamanho <
    1024
  ) {
    return `${tamanho} B`;
  }

  if (
    tamanho <
    1024 * 1024
  ) {
    return `${(
      tamanho / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    tamanho /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function limparNomeArquivo(nome) {
  return nome
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
}

function iconeArquivo(tipo) {
  if (
    tipo ===
    "application/pdf"
  ) {
    return "📕";
  }

  if (
    tipo?.includes(
      "image"
    )
  ) {
    return "🖼️";
  }

  if (
    tipo?.includes(
      "word"
    ) ||
    tipo ===
      "application/msword"
  ) {
    return "📘";
  }

  if (
    tipo?.includes(
      "excel"
    ) ||
    tipo?.includes(
      "spreadsheet"
    )
  ) {
    return "📗";
  }

  if (
    tipo ===
    "application/zip"
  ) {
    return "🗜️";
  }

  return "📄";
}

// =======================================================
// COMPONENTE
// =======================================================

export default function Documents() {
  const {
    user,
    perfil,
    isMaster,
  } = useAuth();

  const [
    documentos,
    setDocumentos,
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
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    pesquisa,
    setPesquisa,
  ] = useState("");

  const [
    patioFiltro,
    setPatioFiltro,
  ] = useState("TODOS");

  const [
    categoriaFiltro,
    setCategoriaFiltro,
  ] = useState("TODAS");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    arquivo,
    setArquivo,
  ] = useState(null);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState({
    titulo: "",
    categoria: "OUTROS",
    descricao: "",
    patioId: "",
  });

  // =====================================================
  // CARREGAR DADOS
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

      let consulta =
        supabase
          .from(
            "documentos"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (
        !isMaster
      ) {
        if (
          !perfil?.patio_id
        ) {
          setDocumentos([]);

          setErro(
            "Sua conta ainda não possui um pátio vinculado."
          );

          return;
        }

        consulta =
          consulta.eq(
            "patio_id",
            perfil.patio_id
          );
      }

      let consultaPatios =
        supabase
          .from("patios")
          .select(
            "id, nome, cidade, estado, ativo"
          )
          .order("nome");

      if (!isMaster) {
        consultaPatios =
          consultaPatios.eq(
            "id",
            perfil.patio_id
          );
      }

      const [
        documentosResponse,
        patiosResponse,
      ] =
        await Promise.all([
          consulta,
          consultaPatios,
        ]);

      if (
        documentosResponse.error
      ) {
        throw documentosResponse.error;
      }

      if (
        patiosResponse.error
      ) {
        console.error(
          "Erro ao carregar pátios:",
          patiosResponse.error
        );
      }

      setDocumentos(
        documentosResponse.data ||
          []
      );

      setPatios(
        patiosResponse.data ||
          []
      );
    } catch (error) {
      console.error(
        "Erro ao carregar documentos:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os documentos."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PÁTIO
  // =====================================================

  function nomePatio(
    patioId
  ) {
    const patio =
      patios.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            patioId
          )
      );

    return (
      patio?.nome ||
      "Pátio não informado"
    );
  }

  // =====================================================
  // CONTROLE DE ACESSO POR PÁTIO
  // =====================================================

  function podeAcessarDocumento(
    documento
  ) {
    if (isMaster) {
      return true;
    }

    return (
      String(
        documento?.patio_id ||
          ""
      ) ===
      String(
        perfil?.patio_id ||
          ""
      )
    );
  }

  function nomePatioAcesso() {
    if (isMaster) {
      return "Todos os pátios";
    }

    return nomePatio(
      perfil?.patio_id
    );
  }

  // =====================================================
  // FILTROS
  // =====================================================

  const documentosFiltrados =
    useMemo(() => {
      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      return documentos.filter(
        (item) => {
          if (
            !podeAcessarDocumento(
              item
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

          if (
            categoriaFiltro !==
              "TODAS" &&
            item.categoria !==
              categoriaFiltro
          ) {
            return false;
          }

          if (!termo) {
            return true;
          }

          const texto = [
            item.titulo,
            item.descricao,
            item.categoria,
            item.arquivo_nome,
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
      documentos,
      patios,
      pesquisa,
      patioFiltro,
      categoriaFiltro,
      isMaster,
      perfil?.patio_id,
    ]);

  // =====================================================
  // CONTADORES
  // =====================================================

  const totalDocumentos =
    documentosFiltrados.length;

  const totalPDF =
    documentosFiltrados.filter(
      (item) =>
        item.arquivo_tipo ===
        "application/pdf"
    ).length;

  const totalImagens =
    documentosFiltrados.filter(
      (item) =>
        item.arquivo_tipo?.includes(
          "image"
        )
    ).length;

  // =====================================================
  // ABRIR NOVO
  // =====================================================

  function abrirFormulario() {
    if (
      !isMaster &&
      !perfil?.patio_id
    ) {
      setErro(
        "Sua conta ainda não possui um pátio vinculado. Peça ao administrador para definir sua unidade."
      );

      return;
    }

    setForm({
      titulo: "",
      categoria:
        "OUTROS",
      descricao: "",
      patioId:
        isMaster
          ? patioFiltro !==
            "TODOS"
            ? String(
                patioFiltro
              )
            : ""
          : String(
              perfil?.patio_id ||
                ""
            ),
    });

    setArquivo(null);

    setErro("");
    setMensagem("");

    setMostrarFormulario(
      true
    );
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setMostrarFormulario(
      false
    );

    setArquivo(null);
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
  // SELECIONAR ARQUIVO
  // =====================================================

  function selecionarArquivo(
    event
  ) {
    const selecionado =
      event.target.files?.[0];

    if (!selecionado) {
      return;
    }

    setErro("");

    if (
      !TIPOS_PERMITIDOS.includes(
        selecionado.type
      )
    ) {
      setErro(
        "Tipo de arquivo não permitido."
      );

      event.target.value =
        "";

      return;
    }

    if (
      selecionado.size >
      TAMANHO_MAXIMO
    ) {
      setErro(
        "O arquivo pode ter no máximo 20 MB."
      );

      event.target.value =
        "";

      return;
    }

    setArquivo(
      selecionado
    );

    if (
      !form.titulo
    ) {
      const titulo =
        selecionado.name
          .replace(
            /\.[^/.]+$/,
            ""
          );

      setForm(
        (anterior) => ({
          ...anterior,
          titulo,
        })
      );
    }
  }

  // =====================================================
  // SALVAR DOCUMENTO
  // =====================================================

  async function salvarDocumento(
    event
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    const patioDestinoId =
      isMaster
        ? form.patioId
        : perfil?.patio_id;

    if (
      !patioDestinoId
    ) {
      setErro(
        isMaster
          ? "Selecione o pátio."
          : "Sua conta ainda não possui um pátio vinculado."
      );

      return;
    }

    if (
      !form.titulo.trim()
    ) {
      setErro(
        "Informe o título do documento."
      );

      return;
    }

    if (!arquivo) {
      setErro(
        "Selecione um arquivo."
      );

      return;
    }

    let caminho = null;

    try {
      setSalvando(true);

      const nomeLimpo =
        limparNomeArquivo(
          arquivo.name
        );

      const identificador =
        crypto.randomUUID();

      caminho =
        `${patioDestinoId}/${identificador}-${nomeLimpo}`;

      // ===============================================
      // UPLOAD STORAGE
      // ===============================================

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(BUCKET)
          .upload(
            caminho,
            arquivo,
            {
              upsert:
                false,

              contentType:
                arquivo.type,

              cacheControl:
                "3600",
            }
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      // ===============================================
      // REGISTRO NO BANCO
      // ===============================================

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "documentos"
          )
          .insert({
            patio_id:
              Number(
                patioDestinoId
              ),

            titulo:
              form.titulo.trim(),

            categoria:
              form.categoria,

            descricao:
              form.descricao
                .trim() ||
              null,

            arquivo_path:
              caminho,

            arquivo_nome:
              arquivo.name,

            arquivo_tipo:
              arquivo.type ||
              null,

            arquivo_tamanho:
              arquivo.size,

            created_by:
              user?.id ||
              null,

            criado_por_nome:
              perfil?.nome ||
              user?.email ||
              "Usuário",

            created_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          });

      if (
        insertError
      ) {
        await supabase.storage
          .from(BUCKET)
          .remove([
            caminho,
          ]);

        throw insertError;
      }

      setMostrarFormulario(
        false
      );

      setArquivo(null);

      setMensagem(
        "Documento anexado com sucesso."
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao enviar documento:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível anexar o documento."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =====================================================
  // ABRIR DOCUMENTO
  // =====================================================

  async function abrirDocumento(
    documento
  ) {
    if (
      !podeAcessarDocumento(
        documento
      )
    ) {
      setErro(
        "Você não possui acesso a documentos de outro pátio."
      );

      return;
    }

    try {
      setErro("");

      const {
        data,
        error,
      } =
        await supabase.storage
          .from(BUCKET)
          .createSignedUrl(
            documento.arquivo_path,
            300
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
        "Erro ao abrir documento:",
        error
      );

      setErro(
        "Não foi possível abrir o documento."
      );
    }
  }

  // =====================================================
  // EXCLUIR
  // =====================================================

  async function excluirDocumento(
    documento
  ) {
    if (
      !podeAcessarDocumento(
        documento
      )
    ) {
      setErro(
        "Você não possui acesso para excluir documentos de outro pátio."
      );

      return;
    }

    const confirmou =
      window.confirm(
        `Deseja excluir o documento "${documento.titulo}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setErro("");

      // primeiro remove arquivo

      const {
        error:
          storageError,
      } =
        await supabase.storage
          .from(BUCKET)
          .remove([
            documento.arquivo_path,
          ]);

      if (
        storageError
      ) {
        throw storageError;
      }

      // depois remove banco

      let consultaExclusao =
        supabase
          .from(
            "documentos"
          )
          .delete()
          .eq(
            "id",
            documento.id
          );

      if (!isMaster) {
        consultaExclusao =
          consultaExclusao.eq(
            "patio_id",
            perfil?.patio_id
          );
      }

      const {
        error:
          deleteError,
      } =
        await consultaExclusao;

      if (
        deleteError
      ) {
        throw deleteError;
      }

      setMensagem(
        "Documento excluído com sucesso."
      );

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao excluir documento:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível excluir o documento."
      );
    }
  }

  // =====================================================
  // LIMPAR FILTROS
  // =====================================================

  function limparFiltros() {
    setPesquisa("");

    setCategoriaFiltro(
      "TODAS"
    );

    setPatioFiltro(
      "TODOS"
    );
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
            Carregando documentos...
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

        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Arquivos
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Documentos
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Centralize contratos, ofícios,
              documentos administrativos,
              relatórios e arquivos dos pátios.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
              <span>🏢</span>
              <span>
                Acesso: {nomePatioAcesso()}
              </span>
            </div>

          </div>

          <button
            type="button"
            onClick={
              abrirFormulario
            }
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            + Anexar documento
          </button>

        </div>

        {/* =============================================
            MENSAGENS
        ============================================== */}

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

        {/* =============================================
            RESUMO
        ============================================== */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-bold text-slate-500">
              Documentos
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {
                totalDocumentos
              }
            </p>

          </div>

          <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-bold text-red-600">
              PDFs
            </p>

            <p className="mt-2 text-3xl font-black text-red-600">
              {totalPDF}
            </p>

          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-bold text-blue-600">
              Imagens
            </p>

            <p className="mt-2 text-3xl font-black text-blue-600">
              {totalImagens}
            </p>

          </div>

        </div>

        {/* =============================================
            FILTROS
        ============================================== */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="font-black text-slate-900">
              Localizar documentos
            </h2>

            <button
              type="button"
              onClick={
                limparFiltros
              }
              className="text-sm font-bold text-blue-600"
            >
              Limpar filtros
            </button>

          </div>

          <div
            className={`grid gap-4 ${
              isMaster
                ? "md:grid-cols-3"
                : "md:grid-cols-2"
            }`}
          >

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
              placeholder="Pesquisar título, arquivo, descrição..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={
                categoriaFiltro
              }
              onChange={(event) =>
                setCategoriaFiltro(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >

              <option value="TODAS">
                Todas as categorias
              </option>

              {CATEGORIAS.map(
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
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
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

        {documentosFiltrados.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="text-5xl">
              📁
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              Nenhum documento encontrado
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Clique em "Anexar documento" para cadastrar o primeiro arquivo.
            </p>

          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">

            {documentosFiltrados.map(
              (documento) => (
                <div
                  key={
                    documento.id
                  }
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >

                  {/* ÍCONE */}

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                      {iconeArquivo(
                        documento.arquivo_tipo
                      )}
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                      {
                        documento.categoria
                      }
                    </span>

                  </div>

                  {/* DADOS */}

                  <h2 className="mt-4 line-clamp-2 text-lg font-black text-slate-900">
                    {
                      documento.titulo
                    }
                  </h2>

                  <p className="mt-2 truncate text-sm font-semibold text-slate-500">
                    {
                      documento.arquivo_nome
                    }
                  </p>

                  {documento.descricao && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                      {
                        documento.descricao
                      }
                    </p>
                  )}

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">

                    <div className="flex justify-between gap-3 text-xs">

                      <span className="font-bold text-slate-400">
                        Pátio
                      </span>

                      <span className="text-right font-semibold text-slate-600">
                        {nomePatio(
                          documento.patio_id
                        )}
                      </span>

                    </div>

                    <div className="flex justify-between gap-3 text-xs">

                      <span className="font-bold text-slate-400">
                        Tamanho
                      </span>

                      <span className="font-semibold text-slate-600">
                        {formatarTamanho(
                          documento.arquivo_tamanho
                        )}
                      </span>

                    </div>

                    <div className="flex justify-between gap-3 text-xs">

                      <span className="font-bold text-slate-400">
                        Enviado
                      </span>

                      <span className="text-right font-semibold text-slate-600">
                        {formatarData(
                          documento.created_at
                        )}
                      </span>

                    </div>

                    {documento.criado_por_nome && (
                      <div className="flex justify-between gap-3 text-xs">

                        <span className="font-bold text-slate-400">
                          Por
                        </span>

                        <span className="text-right font-semibold text-slate-600">
                          {
                            documento.criado_por_nome
                          }
                        </span>

                      </div>
                    )}

                  </div>

                  {/* BOTÕES */}

                  <div className="mt-auto flex gap-2 pt-5">

                    <button
                      type="button"
                      onClick={() =>
                        abrirDocumento(
                          documento
                        )
                      }
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
                    >
                      Abrir
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        excluirDocumento(
                          documento
                        )
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
                    >
                      Excluir
                    </button>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </div>

      {/* ===============================================
          MODAL
      ================================================ */}

      {mostrarFormulario && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>

                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Documentos
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Anexar documento
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  fecharFormulario
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                salvarDocumento
              }
              className="p-6"
            >

              {erro && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {erro}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">

                {/* PÁTIO */}

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
                        Selecione o pátio
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

                              {patio.cidade
                                ? ` - ${patio.cidade}`
                                : ""}
                            </option>
                          )
                        )}

                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={nomePatio(
                        perfil?.patio_id
                      )}
                      className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
                    />
                  )}

                </div>

                {/* CATEGORIA */}

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

                    {CATEGORIAS.map(
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

                {/* TÍTULO */}

                <div className="md:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Título *
                  </label>

                  <input
                    type="text"
                    name="titulo"
                    value={
                      form.titulo
                    }
                    onChange={
                      alterarCampo
                    }
                    placeholder="Ex.: Contrato de prestação de serviços"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />

                </div>

                {/* DESCRIÇÃO */}

                <div className="md:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Descrição
                  </label>

                  <textarea
                    name="descricao"
                    value={
                      form.descricao
                    }
                    onChange={
                      alterarCampo
                    }
                    rows={4}
                    placeholder="Informações sobre este documento..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />

                </div>

                {/* ARQUIVO */}

                <div className="md:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Arquivo *
                  </label>

                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">

                    <input
                      type="file"
                      onChange={
                        selecionarArquivo
                      }
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      className="block w-full text-sm text-slate-600"
                    />

                    <p className="mt-3 text-xs text-slate-400">
                      PDF, imagens, Word, Excel, TXT ou ZIP. Máximo de 20 MB.
                    </p>

                    {arquivo && (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">

                        <div className="flex items-center gap-3">

                          <div className="text-2xl">
                            {iconeArquivo(
                              arquivo.type
                            )}
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-black text-blue-800">
                              {
                                arquivo.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-blue-600">
                              {formatarTamanho(
                                arquivo.size
                              )}
                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                </div>

              </div>

              {/* BOTÕES */}

              <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    fecharFormulario
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {salvando
                    ? "Enviando..."
                    : "📎 Anexar documento"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}