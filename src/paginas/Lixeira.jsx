import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../API/supabaseClient";

function Lixeira() {
  const navigate = useNavigate();

  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [restaurandoId, setRestaurandoId] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);

  // =========================================================
  // CARREGAR LIXEIRA
  // =========================================================

  useEffect(() => {
    buscarVeiculosExcluidos();
  }, []);

  async function buscarVeiculosExcluidos() {
    try {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("veiculos")
        .select("*")
        .not("excluido_em", "is", null)
        .order("excluido_em", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setVeiculos(data || []);
    } catch (error) {
      console.error(
        "Erro ao carregar lixeira:",
        error
      );

      setErro(
        error.message ||
          "Não foi possível carregar a lixeira."
      );
    } finally {
      setCarregando(false);
    }
  }

  // =========================================================
  // FORMATAR DATA
  // =========================================================

  function formatarData(data) {
    if (!data) {
      return "-";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(data));
  }

  // =========================================================
  // CALCULAR DATA DE EXCLUSÃO DEFINITIVA
  // =========================================================

  function dataExclusaoDefinitiva(excluidoEm) {
    if (!excluidoEm) {
      return null;
    }

    const data = new Date(excluidoEm);

    data.setDate(
      data.getDate() + 30
    );

    return data;
  }

  // =========================================================
  // DIAS RESTANTES
  // =========================================================

  function calcularDiasRestantes(excluidoEm) {
    const dataFinal =
      dataExclusaoDefinitiva(excluidoEm);

    if (!dataFinal) {
      return 0;
    }

    const agora = new Date();

    const diferenca =
      dataFinal.getTime() - agora.getTime();

    const dias = Math.ceil(
      diferenca / (1000 * 60 * 60 * 24)
    );

    return Math.max(dias, 0);
  }

  // =========================================================
  // RESTAURAR VEÍCULO
  // =========================================================

  async function restaurarVeiculo(veiculo) {
    const confirmar = window.confirm(
      `Deseja restaurar o veículo ${veiculo.placa}?`
    );

    if (!confirmar) {
      return;
    }

    try {
      setRestaurandoId(veiculo.id);

      const { error } = await supabase
        .from("veiculos")
        .update({
          excluido_em: null,
        })
        .eq("id", veiculo.id);

      if (error) {
        throw error;
      }

      setVeiculos((anteriores) =>
        anteriores.filter(
          (item) =>
            item.id !== veiculo.id
        )
      );

      alert(
        `Veículo ${veiculo.placa} restaurado com sucesso.`
      );
    } catch (error) {
      console.error(
        "Erro ao restaurar veículo:",
        error
      );

      alert(
        "Não foi possível restaurar o veículo.\n\n" +
          error.message
      );
    } finally {
      setRestaurandoId(null);
    }
  }

  // =========================================================
  // PEGAR CAMINHO DAS FOTOS NO STORAGE
  // =========================================================

  function pegarCaminhoStorage(url) {
    try {
      const marcador =
        "/storage/v1/object/public/veiculos/";

      const posicao =
        url.indexOf(marcador);

      if (posicao === -1) {
        return null;
      }

      return decodeURIComponent(
        url.substring(
          posicao + marcador.length
        )
      );
    } catch {
      return null;
    }
  }

  // =========================================================
  // EXCLUIR DEFINITIVAMENTE
  // =========================================================

  async function excluirDefinitivamente(
    veiculo
  ) {
    const confirmar = window.confirm(
      `ATENÇÃO!\n\n` +
        `Deseja excluir definitivamente o veículo ${veiculo.placa}?\n\n` +
        `Essa ação não poderá ser desfeita.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setExcluindoId(veiculo.id);

      // =====================================================
      // APAGAR FOTOS DO STORAGE
      // =====================================================

      if (
        Array.isArray(veiculo.fotos) &&
        veiculo.fotos.length > 0
      ) {
        const caminhos =
          veiculo.fotos
            .map(pegarCaminhoStorage)
            .filter(Boolean);

        if (caminhos.length > 0) {
          const { error: storageError } =
            await supabase.storage
              .from("veiculos")
              .remove(caminhos);

          if (storageError) {
            throw new Error(
              "Não foi possível apagar as fotos: " +
                storageError.message
            );
          }
        }
      }

      // =====================================================
      // APAGAR REGISTRO DO BANCO
      // =====================================================

      const { error } = await supabase
        .from("veiculos")
        .delete()
        .eq("id", veiculo.id);

      if (error) {
        throw error;
      }

      setVeiculos((anteriores) =>
        anteriores.filter(
          (item) =>
            item.id !== veiculo.id
        )
      );

      alert(
        `Veículo ${veiculo.placa} excluído definitivamente.`
      );
    } catch (error) {
      console.error(
        "Erro ao excluir veículo:",
        error
      );

      alert(
        "Não foi possível excluir definitivamente.\n\n" +
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
          Carregando lixeira...
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
            Erro ao carregar lixeira
          </h1>

          <p className="mt-2 text-red-700">
            {erro}
          </p>

          <button
            type="button"
            onClick={buscarVeiculosExcluidos}
            className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white"
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

      {/* CABEÇALHO */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            Lixeira
          </h1>

          <p className="mt-1 text-slate-500">
            Veículos excluídos ficam armazenados por até 30 dias.
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/vehicles")
          }
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Voltar para veículos
        </button>

      </div>

      {/* AVISO */}

      {veiculos.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">

          <p className="font-semibold text-amber-800">
            Atenção
          </p>

          <p className="mt-1 text-sm text-amber-700">
            Os veículos são excluídos
            definitivamente após 30 dias.
            Durante esse período eles podem
            ser restaurados.
          </p>

        </div>
      )}

      {/* LIXEIRA VAZIA */}

      {veiculos.length === 0 ? (

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            🗑️
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-800">
            A lixeira está vazia
          </h2>

          <p className="mt-2 text-slate-500">
            Nenhum veículo foi excluído.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/vehicles")
            }
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Ver veículos
          </button>

        </div>

      ) : (

        // LISTA

        <div className="grid gap-5">

          {veiculos.map((veiculo) => {

            const exclusaoFinal =
              dataExclusaoDefinitiva(
                veiculo.excluido_em
              );

            const diasRestantes =
              calcularDiasRestantes(
                veiculo.excluido_em
              );

            return (
              <div
                key={veiculo.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >

                {/* CABEÇALHO */}

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="flex items-center gap-4">

                    {/* FOTO */}

                    {Array.isArray(
                      veiculo.fotos
                    ) &&
                    veiculo.fotos.length >
                      0 ? (

                      <img
                        src={
                          veiculo.fotos[0]
                        }
                        alt={
                          veiculo.placa
                        }
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

                      <p className="text-slate-500">
                        {veiculo.marca ||
                          "-"}{" "}
                        {veiculo.modelo ||
                          ""}
                      </p>

                    </div>

                  </div>

                  {/* DIAS RESTANTES */}

                  <div className="w-fit rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">

                    {diasRestantes > 0
                      ? `${diasRestantes} dia(s) restantes`
                      : "Aguardando exclusão definitiva"}

                  </div>

                </div>

                {/* INFORMAÇÕES */}

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                  <div>
                    <p className="text-sm text-slate-400">
                      Proprietário
                    </p>

                    <p className="font-medium text-slate-700">
                      {veiculo.proprietario ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Pátio
                    </p>

                    <p className="font-medium text-slate-700">
                      {veiculo.patio ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Excluído em
                    </p>

                    <p className="font-medium text-slate-700">
                      {formatarData(
                        veiculo.excluido_em
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Exclusão definitiva
                    </p>

                    <p className="font-medium text-red-600">
                      {formatarData(
                        exclusaoFinal
                      )}
                    </p>
                  </div>

                </div>

                {/* BOTÕES */}

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    disabled={
                      restaurandoId ===
                        veiculo.id ||
                      excluindoId ===
                        veiculo.id
                    }
                    onClick={() =>
                      restaurarVeiculo(
                        veiculo
                      )
                    }
                    className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {restaurandoId ===
                    veiculo.id
                      ? "Restaurando..."
                      : "Restaurar veículo"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      excluindoId ===
                        veiculo.id ||
                      restaurandoId ===
                        veiculo.id
                    }
                    onClick={() =>
                      excluirDefinitivamente(
                        veiculo
                      )
                    }
                    className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {excluindoId ===
                    veiculo.id
                      ? "Excluindo..."
                      : "Excluir agora"}
                  </button>

                </div>

              </div>
            );
          })}

        </div>

      )}

    </div>
  );
}

export default Lixeira;