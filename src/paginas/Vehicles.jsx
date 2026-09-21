import { useEffect, useState } from "react";
import { supabase } from "../API/supabaseClient";
import { useNavigate } from "react-router-dom";

function Vehicles() {
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindoId, setExcluindoId] = useState(null);

  // =========================================================
  // CONTROLE POR PÁTIO
  // =========================================================

  const [perfilAtual, setPerfilAtual] = useState(null);
  const [nomePatioAtual, setNomePatioAtual] = useState("");

  const navigate = useNavigate();

  // =========================================================
  // CARREGAR VEÍCULOS
  // =========================================================

  useEffect(() => {
    buscarVeiculos();
  }, []);

  async function buscarVeiculos() {
    try {
      setCarregando(true);
      setErro("");

      // ---------------------------------------------------------
      // 1. DESCOBRIR O USUÁRIO LOGADO E O PÁTIO DELE
      // ---------------------------------------------------------

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const usuarioLogado = authData?.user;

      if (!usuarioLogado) {
        throw new Error("Nenhum usuário autenticado.");
      }

      const { data: meuPerfil, error: perfilError } =
        await supabase
          .from("profiles")
          .select("id, cargo, status, patio_id")
          .eq("id", usuarioLogado.id)
          .single();

      if (perfilError) {
        throw perfilError;
      }

      setPerfilAtual(meuPerfil);

      const ehMaster =
        meuPerfil?.cargo === "MASTER" &&
        meuPerfil?.status === "APROVADO";

      if (!ehMaster && !meuPerfil?.patio_id) {
        throw new Error(
          "Seu usuário ainda não está vinculado a um pátio. Peça ao administrador para definir sua unidade."
        );
      }

      // ---------------------------------------------------------
      // 2. DESCOBRIR O NOME DO PÁTIO DO USUÁRIO
      // ---------------------------------------------------------

      if (ehMaster) {
        setNomePatioAtual("Todos os pátios");
      } else {
        const { data: patioData, error: patioError } =
          await supabase
            .from("patios")
            .select("id, nome, cidade, estado")
            .eq("id", meuPerfil.patio_id)
            .maybeSingle();

        if (patioError) {
          console.error("Erro ao carregar o pátio do usuário:", patioError);
        }

        setNomePatioAtual(
          patioData?.nome || "Pátio vinculado ao usuário"
        );
      }

      // ---------------------------------------------------------
      // 3. BUSCAR VEÍCULOS
      // ---------------------------------------------------------

      let consulta = supabase
        .from("veiculos")
        .select("*")

        // Não mostra veículos enviados para a lixeira
        .is("excluido_em", null);

      // Usuários comuns só enxergam os veículos do próprio pátio.
      // MASTER continua enxergando todos os pátios.
      if (!ehMaster) {
        consulta = consulta.eq("patio_id", meuPerfil.patio_id);
      }

      const { data, error } = await consulta.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      setVeiculos(data || []);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);

      setErro(
        error.message || "Não foi possível carregar os veículos."
      );
    } finally {
      setCarregando(false);
    }
  }

  // =========================================================
  // EXCLUIR VEÍCULO
  // =========================================================

  async function excluirVeiculo(veiculo) {
    const ehMaster =
      perfilAtual?.cargo === "MASTER" &&
      perfilAtual?.status === "APROVADO";

    // Proteção adicional: usuário comum não pode alterar veículo
    // pertencente a outro pátio.
    if (
      !ehMaster &&
      perfilAtual?.patio_id &&
      veiculo.patio_id !== perfilAtual.patio_id
    ) {
      alert(
        "Você não tem permissão para excluir um veículo de outro pátio."
      );
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente excluir o veículo ${veiculo.placa}?\n\n` +
        "O veículo será enviado para a lixeira e apagado definitivamente após 30 dias."
    );

    if (!confirmar) {
      return;
    }

    try {
      setExcluindoId(veiculo.id);

      let consultaExclusao = supabase
        .from("veiculos")
        .update({
          excluido_em: new Date().toISOString(),
        })
        .eq("id", veiculo.id);

      const ehMasterExclusao =
        perfilAtual?.cargo === "MASTER" &&
        perfilAtual?.status === "APROVADO";

      if (!ehMasterExclusao && perfilAtual?.patio_id) {
        consultaExclusao = consultaExclusao.eq(
          "patio_id",
          perfilAtual.patio_id
        );
      }

      const { error } = await consultaExclusao;

      if (error) {
        throw error;
      }

      // Remove o veículo da tela imediatamente
      setVeiculos((anteriores) =>
        anteriores.filter(
          (item) => item.id !== veiculo.id
        )
      );

      alert(
        `Veículo ${veiculo.placa} enviado para a lixeira.\n\n` +
          "Ele será excluído definitivamente após 30 dias."
      );
    } catch (error) {
      console.error(
        "Erro ao excluir veículo:",
        error
      );

      alert(
        "Não foi possível excluir o veículo.\n\n" +
          error.message
      );
    } finally {
      setExcluindoId(null);
    }
  }

  // =========================================================
  // CARREGANDO
  // =========================================================

  if (carregando) {
    return (
      <div className="p-6">
        <p className="text-slate-500">
          Carregando veículos...
        </p>
      </div>
    );
  }

  // =========================================================
  // ERRO
  // =========================================================

  if (erro) {
    return (
      <div className="p-6">

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">

          <h1 className="text-2xl font-bold text-red-600">
            Erro ao carregar veículos
          </h1>

          <p className="mt-2 text-red-700">
            {erro}
          </p>

          <button
            type="button"
            onClick={buscarVeiculos}
            className="mt-4 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-700"
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
    <div className="p-6">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            Veículos
          </h1>

          <p className="mt-1 text-gray-500">
            Veículos cadastrados no sistema
          </p>

          <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            🏢 Acesso: {nomePatioAtual || "Carregando pátio..."}
          </div>

        </div>
<div className="flex items-center gap-3">

  {/* LIXEIRA */}

  <button
    type="button"
    onClick={() => navigate("/lixeira")}
    title="Abrir lixeira"
    className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-300 bg-white text-xl text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
  >
    🗑️
  </button>

  {/* CADASTRAR VEÍCULO */}

  <button
    type="button"
    onClick={() => navigate("/vehicles/new")}
    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
  >
    + Cadastrar veículo
  </button>

</div>

      </div>

      {/* =====================================================
          QUANTIDADE
      ====================================================== */}

      <div className="mb-6">

        <p className="text-sm text-slate-500">
          Total de veículos:
          <strong className="ml-2 text-slate-900">
            {veiculos.length}
          </strong>
        </p>

      </div>

      {/* =====================================================
          NENHUM VEÍCULO
      ====================================================== */}

      {veiculos.length === 0 ? (

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <h2 className="text-xl font-bold text-slate-800">
            Nenhum veículo encontrado
          </h2>

          <p className="mt-2 text-slate-500">
            Cadastre um novo veículo para começar.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/vehicles/new")
            }
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Cadastrar veículo
          </button>

        </div>

      ) : (

        // =====================================================
        // LISTAGEM
        // =====================================================

        <div className="grid gap-5">

          {veiculos.map((veiculo) => (

            <div
              key={veiculo.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >

              {/* =============================================
                  CABEÇALHO DO CARD
              ============================================== */}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  {/* FOTO PRINCIPAL */}

                  {veiculo.fotos &&
                  veiculo.fotos.length > 0 ? (

                    <img
                      src={veiculo.fotos[0]}
                      alt={`Veículo ${veiculo.placa}`}
                      className="h-20 w-28 rounded-lg border border-slate-200 object-cover"
                    />

                  ) : (

                    <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
                      Sem foto
                    </div>

                  )}

                  <div>

                    <h2 className="text-xl font-bold text-slate-900">
                      {veiculo.placa}
                    </h2>

                    <p className="text-gray-500">
                      {veiculo.marca || "-"}{" "}
                      {veiculo.modelo || ""}
                    </p>

                  </div>

                </div>

                <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                  {veiculo.status}
                </span>

              </div>

              {/* =============================================
                  INFORMAÇÕES
              ============================================== */}

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* RENAVAM */}

                <div>
                  <p className="text-sm text-gray-400">
                    Renavam
                  </p>

                  <p className="font-medium text-slate-700">
                    {veiculo.renavam || "-"}
                  </p>
                </div>

                {/* CHASSI */}

                <div>
                  <p className="text-sm text-gray-400">
                    Chassi
                  </p>

                  <p className="font-medium text-slate-700">
                    {veiculo.chassi || "-"}
                  </p>
                </div>

                {/* ANO */}

                <div>
                  <p className="text-sm text-gray-400">
                    Ano
                  </p>

                  <p className="font-medium text-slate-700">
                    {veiculo.ano || "-"}
                  </p>
                </div>

                {/* COR */}

                <div>
                  <p className="text-sm text-gray-400">
                    Cor
                  </p>

                  <p className="font-medium text-slate-700">
                    {veiculo.cor || "-"}
                  </p>
                </div>

                {/* PROPRIETÁRIO */}

                <div>
                  <p className="text-sm text-gray-400">
                    Proprietário
                  </p>

                  <p className="font-medium text-slate-700">
                    {veiculo.proprietario || "-"}
                  </p>
                </div>

                {/* PÁTIO */}

                <div>
                  <p className="text-sm text-gray-400">
                    Pátio
                  </p>

                  <p className="font-medium text-slate-700">
                    {veiculo.patio || "-"}
                  </p>
                </div>

              </div>

              {/* =============================================
                  OBSERVAÇÕES
              ============================================== */}

              {veiculo.observacoes && (

                <div className="mt-5 border-t border-slate-200 pt-4">

                  <p className="text-sm text-gray-400">
                    Observações
                  </p>

                  <p className="mt-1 text-slate-700">
                    {veiculo.observacoes}
                  </p>

                </div>

              )}

              {/* =============================================
                  BOTÕES
              ============================================== */}

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                {/* DETALHES */}

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/vehicles/${veiculo.id}`
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver detalhes
                </button>

                {/* EXCLUIR */}

                <button
                  type="button"
                  disabled={
                    excluindoId === veiculo.id
                  }
                  onClick={() =>
                    excluirVeiculo(veiculo)
                  }
                  className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {excluindoId === veiculo.id
                    ? "Excluindo..."
                    : "Excluir veículo"}
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}

export default Vehicles;