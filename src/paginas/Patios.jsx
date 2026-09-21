import { useEffect, useMemo, useState } from "react";
import { supabase } from "../API/supabaseClient";
import { useAuth } from "../biblioteca/AuthContext";

export default function Patios() {
  const { isMaster } = useAuth();

  const [patios, setPatios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [veiculos, setVeiculos] = useState([]);

  // TARIFAS PADRÃO DE CADA PÁTIO
  const [tarifas, setTarifas] = useState({});
  const [salvandoTarifaId, setSalvandoTarifaId] = useState(null);

  // CONTRATOS E TARIFAS VINCULADOS A CADA PÁTIO
  const [contratosPorPatio, setContratosPorPatio] = useState({});

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [form, setForm] = useState({
    nome: "",
    cidade: "",
    estado: "PR",
    endereco: "",
    telefone: "",
    ativo: true,
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      const [
        { data: patiosData, error: patiosError },
        { data: usuariosData, error: usuariosError },
        { data: veiculosData, error: veiculosError },
      ] = await Promise.all([
        supabase
          .from("patios")
          .select("*")
          .order("nome", { ascending: true }),

        supabase
          .from("profiles")
          .select("id, patio_id"),

        supabase
          .from("veiculos")
          .select("id, patio_id, excluido_em"),
      ]);

      if (patiosError) {
        throw patiosError;
      }

      if (usuariosError) {
        console.error("Erro ao carregar usuários:", usuariosError);
      }

      if (veiculosError) {
        console.error("Erro ao carregar veículos:", veiculosError);
      }

      setPatios(patiosData || []);
      setUsuarios(usuariosData || []);
      setVeiculos(veiculosData || []);

      // Buscar as diárias já cadastradas.
      // Se a tabela ainda não existir ou houver problema de permissão,
      // a página de pátios continua funcionando normalmente.
      const {
        data: tarifasData,
        error: tarifasError,
      } = await supabase
        .from("tarifas_patio")
        .select("patio_id, categoria, valor_diaria, ativo")
        .eq("ativo", true);

      if (tarifasError) {
        console.error(
          "Erro ao carregar tarifas dos pátios:",
          tarifasError
        );
        setTarifas({});
      } else {
        const mapaTarifas = {};

        (tarifasData || []).forEach((tarifa) => {
          const patioId = String(tarifa.patio_id);

          if (!mapaTarifas[patioId]) {
            mapaTarifas[patioId] = {
              MOTO: "",
              CARRO: "",
              CAMINHAO: "",
              REBOQUE: "",
              OUTRO: "",
            };
          }

          mapaTarifas[patioId][tarifa.categoria] =
            tarifa.valor_diaria ?? "";
        });

        setTarifas(mapaTarifas);
      }

      // Buscar contratos e tarifas para exibir dentro de cada pátio.
      const { data: contratosData, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          id,
          patio_id,
          nome,
          contratante,
          numero_contrato,
          vigencia_inicio,
          vigencia_fim,
          ativo,
          contrato_tarifas (
            id,
            categoria,
            valor_diaria
          )
        `)
        .order("nome", { ascending: true });

      if (contratosError) {
        console.error("Erro ao carregar contratos dos pátios:", contratosError);
        setContratosPorPatio({});
      } else {
        const mapaContratos = {};

        (contratosData || []).forEach((contrato) => {
          const patioId = String(contrato.patio_id);

          if (!mapaContratos[patioId]) {
            mapaContratos[patioId] = [];
          }

          mapaContratos[patioId].push(contrato);
        });

        setContratosPorPatio(mapaContratos);
      }
    } catch (error) {
      console.error("Erro ao carregar pátios:", error);

      setErro(
        error?.message ||
          "Não foi possível carregar os pátios."
      );
    } finally {
      setLoading(false);
    }
  }

  function limparFormulario() {
    setForm({
      nome: "",
      cidade: "",
      estado: "PR",
      endereco: "",
      telefone: "",
      ativo: true,
    });

    setEditandoId(null);
    setErro("");
  }

  function abrirNovoPatio() {
    limparFormulario();
    setMensagem("");
    setMostrarFormulario(true);
  }

  function cancelarFormulario() {
    limparFormulario();
    setMostrarFormulario(false);
  }

  function editarPatio(patio) {
    setMensagem("");
    setErro("");

    setForm({
      nome: patio.nome || "",
      cidade: patio.cidade || "",
      estado: patio.estado || "PR",
      endereco: patio.endereco || "",
      telefone: patio.telefone || "",
      ativo: patio.ativo ?? true,
    });

    setEditandoId(patio.id);
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function alterarCampo(event) {
    const { name, value, type, checked } = event.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function salvarPatio(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const nome = form.nome.trim();
      const cidade = form.cidade.trim();
      const estado = form.estado.trim().toUpperCase();
      const endereco = form.endereco.trim();
      const telefone = form.telefone.trim();

      if (!nome) {
        setErro("Informe o nome do pátio.");
        return;
      }

      if (!cidade) {
        setErro("Informe a cidade.");
        return;
      }

      if (!estado) {
        setErro("Informe o estado.");
        return;
      }

      const dados = {
        nome,
        cidade,
        estado,
        endereco: endereco || null,
        telefone: telefone || null,
        ativo: form.ativo,
        updated_at: new Date().toISOString(),
      };

      if (editandoId) {
        const { error } = await supabase
          .from("patios")
          .update(dados)
          .eq("id", editandoId);

        if (error) {
          throw error;
        }

        setMensagem("Pátio atualizado com sucesso.");
      } else {
        const { error } = await supabase
          .from("patios")
          .insert({
            ...dados,
            created_at: new Date().toISOString(),
          });

        if (error) {
          throw error;
        }

        setMensagem("Pátio criado com sucesso.");
      }

      limparFormulario();
      setMostrarFormulario(false);

      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar pátio:", error);

      setErro(
        error?.message ||
          "Não foi possível salvar o pátio."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(patio) {
    const novoStatus = !patio.ativo;

    const texto = novoStatus
      ? `Deseja ativar o pátio "${patio.nome}"?`
      : `Deseja desativar o pátio "${patio.nome}"?`;

    const confirmou = window.confirm(texto);

    if (!confirmou) {
      return;
    }

    try {
      setErro("");
      setMensagem("");

      const { error } = await supabase
        .from("patios")
        .update({
          ativo: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patio.id);

      if (error) {
        throw error;
      }

      setMensagem(
        novoStatus
          ? "Pátio ativado com sucesso."
          : "Pátio desativado com sucesso."
      );

      await carregarDados();
    } catch (error) {
      console.error("Erro ao alterar status:", error);

      setErro(
        error?.message ||
          "Não foi possível alterar o status do pátio."
      );
    }
  }

  // =========================================================
  // TARIFAS / DIÁRIAS DOS PÁTIOS
  // =========================================================

  function formatarValorDiaria(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function obterContratosPatio(patioId) {
    return contratosPorPatio[String(patioId)] || [];
  }

  function obterTarifasPatio(patioId) {
    return (
      tarifas[String(patioId)] || {
        MOTO: "",
        CARRO: "",
        CAMINHAO: "",
        REBOQUE: "",
        OUTRO: "",
      }
    );
  }

  function alterarTarifa(patioId, categoria, valor) {
    setTarifas((anterior) => ({
      ...anterior,
      [String(patioId)]: {
        ...obterTarifasPatio(patioId),
        [categoria]: valor,
      },
    }));
  }

  async function salvarTarifasPatio(patio) {
    const valores = obterTarifasPatio(patio.id);

    try {
      setSalvandoTarifaId(patio.id);
      setErro("");
      setMensagem("");

      const agora = new Date().toISOString();

      const registros = Object.entries(valores).map(
        ([categoria, valor]) => ({
          patio_id: patio.id,
          categoria,
          valor_diaria: Number(String(valor || 0).replace(",", ".")),
          ativo: true,
          updated_at: agora,
        })
      );

      const valorInvalido = registros.some(
        (item) =>
          !Number.isFinite(item.valor_diaria) ||
          item.valor_diaria < 0
      );

      if (valorInvalido) {
        setErro("Informe valores de diária válidos, iguais ou maiores que zero.");
        return;
      }

      const { error } = await supabase
        .from("tarifas_patio")
        .upsert(registros, {
          onConflict: "patio_id,categoria",
        });

      if (error) {
        throw error;
      }

      setMensagem(
        `Valores das diárias do pátio "${patio.nome}" salvos com sucesso.`
      );

      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar tarifas do pátio:", error);

      setErro(
        error?.message ||
          "Não foi possível salvar os valores das diárias."
      );
    } finally {
      setSalvandoTarifaId(null);
    }
  }

  const resumoPatios = useMemo(() => {
    return patios.map((patio) => {
      const totalUsuarios = usuarios.filter(
        (usuario) => usuario.patio_id === patio.id
      ).length;

      const totalVeiculos = veiculos.filter(
        (veiculo) =>
          veiculo.patio_id === patio.id &&
          !veiculo.excluido_em
      ).length;

      return {
        ...patio,
        totalUsuarios,
        totalVeiculos,
      };
    });
  }, [patios, usuarios, veiculos]);

  const totalAtivos = patios.filter(
    (patio) => patio.ativo
  ).length;

  const totalInativos = patios.filter(
    (patio) => !patio.ativo
  ).length;

  if (!isMaster) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-700">
            Acesso não autorizado
          </h1>

          <p className="mt-2 text-sm text-red-600">
            Somente usuários MASTER podem administrar os
            pátios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Administração
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Gestão de Pátios
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Cadastre e organize as unidades que fazem parte
              do sistema Pátio Sul Brasil.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovoPatio}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Novo pátio
          </button>
        </div>

        {/* MENSAGENS */}
        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {mensagem}
          </div>
        )}

        {/* RESUMO */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total de pátios
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {patios.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pátios ativos
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {totalAtivos}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pátios inativos
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-500">
              {totalInativos}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Veículos vinculados
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {
                veiculos.filter(
                  (veiculo) => !veiculo.excluido_em
                ).length
              }
            </p>
          </div>
        </div>

        {/* FORMULÁRIO */}
        {mostrarFormulario && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-900">
                {editandoId
                  ? "Editar pátio"
                  : "Cadastrar novo pátio"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Informe os dados da unidade.
              </p>
            </div>

            <form
              onSubmit={salvarPatio}
              className="p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Nome do pátio *
                  </label>

                  <input
                    type="text"
                    name="nome"
                    value={form.nome}
                    onChange={alterarCampo}
                    placeholder="Ex.: Pátio Apucarana"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Cidade *
                  </label>

                  <input
                    type="text"
                    name="cidade"
                    value={form.cidade}
                    onChange={alterarCampo}
                    placeholder="Ex.: Apucarana"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Estado *
                  </label>

                  <input
                    type="text"
                    name="estado"
                    value={form.estado}
                    onChange={alterarCampo}
                    maxLength={2}
                    placeholder="PR"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Telefone
                  </label>

                  <input
                    type="text"
                    name="telefone"
                    value={form.telefone}
                    onChange={alterarCampo}
                    placeholder="(43) 0000-0000"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Endereço
                  </label>

                  <input
                    type="text"
                    name="endereco"
                    value={form.endereco}
                    onChange={alterarCampo}
                    placeholder="Rua, número, bairro..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="ativo"
                  checked={form.ativo}
                  onChange={alterarCampo}
                  className="h-5 w-5 rounded border-slate-300"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Pátio ativo
                  </p>

                  <p className="text-xs text-slate-500">
                    Pátios ativos poderão receber usuários e
                    veículos.
                  </p>
                </div>
              </label>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelarFormulario}
                  disabled={salvando}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : editandoId
                    ? "Salvar alterações"
                    : "Cadastrar pátio"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LISTAGEM */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Pátios cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Controle todas as unidades cadastradas no
              sistema.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-3 text-sm text-slate-500">
                  Carregando pátios...
                </p>
              </div>
            </div>
          ) : resumoPatios.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                🏢
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Nenhum pátio cadastrado
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Clique em "Novo pátio" para cadastrar sua
                primeira unidade.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {resumoPatios.map((patio) => (
                <div
                  key={patio.id}
                  className={`rounded-2xl border p-5 transition ${
                    patio.ativo
                      ? "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
                      : "border-slate-200 bg-slate-50 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {patio.nome}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            patio.ativo
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {patio.ativo
                            ? "ATIVO"
                            : "INATIVO"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {patio.cidade || "Cidade não informada"}
                        {patio.estado
                          ? ` - ${patio.estado}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                      🏢
                    </div>
                  </div>

                  {patio.endereco && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Endereço
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {patio.endereco}
                      </p>
                    </div>
                  )}

                  {patio.telefone && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Telefone
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {patio.telefone}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Usuários
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {patio.totalUsuarios}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Veículos
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {patio.totalVeiculos}
                      </p>
                    </div>
                  </div>

                  {/* VALORES PADRÃO DAS DIÁRIAS */}
                  <div className="mt-5 rounded-2xl border border-[#FFC400]/40 bg-[#211E1F] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#FFC400]">
                          Valores padrão das diárias
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">
                          Defina manualmente o valor cobrado por categoria neste pátio.
                        </p>
                      </div>

                      <span className="rounded-lg bg-[#FFC400] px-2.5 py-1 text-[10px] font-black text-[#211E1F]">
                        R$/DIA
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ["MOTO", "Moto"],
                        ["CARRO", "Carro"],
                        ["CAMINHAO", "Caminhão"],
                        ["REBOQUE", "Reboque"],
                        ["OUTRO", "Outro"],
                      ].map(([categoria, label]) => (
                        <label
                          key={categoria}
                          className={categoria === "OUTRO" ? "sm:col-span-2" : ""}
                        >
                          <span className="mb-1.5 block text-xs font-bold text-slate-200">
                            {label}
                          </span>

                          <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white">
                            <span className="flex items-center bg-slate-100 px-3 text-sm font-black text-slate-500">
                              R$
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={obterTarifasPatio(patio.id)[categoria]}
                              onChange={(event) =>
                                alterarTarifa(
                                  patio.id,
                                  categoria,
                                  event.target.value
                                )
                              }
                              placeholder="0,00"
                              className="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none"
                            />
                          </div>
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => salvarTarifasPatio(patio)}
                      disabled={salvandoTarifaId === patio.id}
                      className="mt-4 w-full rounded-xl bg-[#FFC400] px-4 py-3 text-sm font-black text-[#211E1F] transition hover:bg-[#FFD43B] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salvandoTarifaId === patio.id
                        ? "Salvando diárias..."
                        : "Salvar valores das diárias"}
                    </button>

                    {/* TARIFAS DOS CONTRATOS VINCULADOS AO PÁTIO */}
                    <div className="mt-5 border-t border-white/15 pt-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-white">
                            Valores dos contratos
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            Tarifas cadastradas em Contratos e Tarifas para este pátio.
                          </p>
                        </div>

                        <span className="rounded-lg border border-[#FFC400]/40 bg-[#FFC400]/10 px-2.5 py-1 text-[10px] font-black text-[#FFC400]">
                          {obterContratosPatio(patio.id).length} contrato(s)
                        </span>
                      </div>

                      {obterContratosPatio(patio.id).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center">
                          <p className="text-sm font-bold text-slate-300">
                            Nenhum contrato vinculado a este pátio.
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Cadastre o contrato na página Contratos e Tarifas e selecione este pátio.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {obterContratosPatio(patio.id).map((contrato) => (
                            <div
                              key={contrato.id}
                              className="rounded-xl border border-white/10 bg-white/5 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-white">
                                    {contrato.nome || "Contrato sem nome"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {contrato.contratante || "Contratante não informado"}
                                    {contrato.numero_contrato
                                      ? ` • Nº ${contrato.numero_contrato}`
                                      : ""}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                    contrato.ativo
                                      ? "bg-green-500/15 text-green-300"
                                      : "bg-slate-500/20 text-slate-400"
                                  }`}
                                >
                                  {contrato.ativo ? "Ativo" : "Inativo"}
                                </span>
                              </div>

                              {contrato.contrato_tarifas?.length > 0 ? (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {contrato.contrato_tarifas
                                    .slice()
                                    .sort((a, b) =>
                                      String(a.categoria).localeCompare(String(b.categoria))
                                    )
                                    .map((tarifa) => (
                                      <div
                                        key={tarifa.id || tarifa.categoria}
                                        className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2"
                                      >
                                        <span className="text-xs font-bold text-slate-300">
                                          {tarifa.categoria === "CAMINHAO"
                                            ? "Caminhão"
                                            : tarifa.categoria === "REBOQUE"
                                            ? "Reboque"
                                            : tarifa.categoria === "MOTO"
                                            ? "Moto"
                                            : tarifa.categoria === "CARRO"
                                            ? "Carro"
                                            : "Outro"}
                                        </span>
                                        <span className="text-sm font-black text-[#FFC400]">
                                          {formatarValorDiaria(tarifa.valor_diaria)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-xs font-semibold text-slate-500">
                                  Este contrato ainda não possui valores de diária cadastrados.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => editarPatio(patio)}
                      className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => alterarStatus(patio)}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        patio.ativo
                          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {patio.ativo
                        ? "Desativar"
                        : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}