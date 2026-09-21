import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../componentes/Badges";
import PageHeader from "../componentes/PageHeader";
import { supabase } from "../API/supabaseClient";

const DESTINOS = [
  {
    value: "PATIO",
    label: "Veículo em pátio",
    descricao: "Veículo permanece no pátio.",
  },
  {
    value: "LEILAO",
    label: "Leilão",
    descricao: "Encaminhar o veículo para o módulo de leilão.",
  },
  {
    value: "JUDICIAL",
    label: "Retirada judicial",
    descricao: "Saída por Oficial de Justiça / ordem judicial.",
  },
  {
    value: "OUTRO_DESTINO",
    label: "Outros destinos",
    descricao: "Transferência ou saída para outro destino.",
  },
  {
    value: "LIBERADO",
    label: "Veículo liberado",
    descricao: "Veículo liberado para saída.",
  },
  {
    value: "ANALISE",
    label: "Em análise",
    descricao: "Veículo direcionado para análise.",
  },
];

const STATUS_POR_DESTINO = {
  PATIO: "EM_PATIO",
  LEILAO: "AGUARDANDO_LEILAO",
  JUDICIAL: "AGUARDANDO_RETIRADA_JUDICIAL",
  OUTRO_DESTINO: "OUTRO_DESTINO",
  LIBERADO: "LIBERADO",
  ANALISE: "EM_ANALISE",
};

const TIPO_MOVIMENTACAO = {
  LEILAO: "LEILAO",
  JUDICIAL: "RETIRADA",
  OUTRO_DESTINO: "SAIDA",
  LIBERADO: "SAIDA",
};

function formatarData(data) {
  if (!data) return "-";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(data));
  } catch {
    return "-";
  }
}

function nomeDestino(destino) {
  return (
    DESTINOS.find((item) => item.value === destino)?.label ||
    destino ||
    "Veículo em pátio"
  );
}

export default function VehicleDetail() {
  const { id } = useParams();

  const [veiculo, setVeiculo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [novoDestino, setNovoDestino] = useState("PATIO");
  const [observacaoDestino, setObservacaoDestino] = useState("");

  useEffect(() => {
    carregarVeiculo();
  }, [id]);

  async function carregarVeiculo() {
    try {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("veiculos")
        .select(`
          id,
          placa,
          renavam,
          chassi,
          marca,
          modelo,
          cor,
          ano,
          proprietario,
          patio,
          status,
          destino_atual,
          data_entrada,
          observacoes,
          fotos,
          lote_leilao,
          data_leilao,
          leilao_observacoes,
          created_at
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setVeiculo(data);
      setNovoDestino(data?.destino_atual || "PATIO");
    } catch (error) {
      console.error("Erro ao carregar veículo:", error);

      setErro(
        error?.message ||
          "Não foi possível carregar os dados do veículo."
      );
    } finally {
      setCarregando(false);
    }
  }

  const fotoPrincipal = useMemo(() => {
    if (
      Array.isArray(veiculo?.fotos) &&
      veiculo.fotos.length > 0
    ) {
      return veiculo.fotos[0];
    }

    return null;
  }, [veiculo]);

  async function alterarDestino(event) {
    event.preventDefault();

    if (!veiculo) return;

    if (!novoDestino) {
      setErro("Selecione o novo destino do veículo.");
      return;
    }

    const destinoAnterior =
      veiculo.destino_atual || "PATIO";

    if (
      novoDestino === destinoAnterior &&
      !observacaoDestino.trim()
    ) {
      setErro(
        "Escolha um destino diferente ou informe uma observação."
      );
      return;
    }

    const confirmar = window.confirm(
      `Deseja alterar o destino do veículo ${
        veiculo.placa || ""
      }?\n\n` +
        `De: ${nomeDestino(destinoAnterior)}\n` +
        `Para: ${nomeDestino(novoDestino)}`
    );

    if (!confirmar) return;

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const novoStatus =
        STATUS_POR_DESTINO[novoDestino] ||
        veiculo.status;

      const { error: updateError } = await supabase
        .from("veiculos")
        .update({
          destino_atual: novoDestino,
          status: novoStatus,
        })
        .eq("id", veiculo.id);

      if (updateError) throw updateError;

      const tipoMovimentacao =
        TIPO_MOVIMENTACAO[novoDestino];

      if (tipoMovimentacao) {
        const descricaoBase =
          `Destino alterado de ${nomeDestino(
            destinoAnterior
          )} para ${nomeDestino(novoDestino)}.`;

        const descricaoCompleta =
          observacaoDestino.trim()
            ? `${descricaoBase} ${observacaoDestino.trim()}`
            : descricaoBase;

        const {
          error: movimentacaoError,
        } = await supabase
          .from("movimentacoes")
          .insert({
            veiculo_id: veiculo.id,
            tipo: tipoMovimentacao,
            descricao: descricaoCompleta,
          });

        if (movimentacaoError) {
          console.warn(
            "Destino alterado, mas a movimentação não foi registrada:",
            movimentacaoError
          );
        }
      }

      setVeiculo((anterior) => ({
        ...anterior,
        destino_atual: novoDestino,
        status: novoStatus,
      }));

      setObservacaoDestino("");

      setMensagem(
        `Destino atualizado para "${nomeDestino(
          novoDestino
        )}" com sucesso.`
      );
    } catch (error) {
      console.error(
        "Erro ao alterar destino:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível alterar o destino do veículo."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <>
        <PageHeader
          title="Detalhes do veículo"
          description="Carregando informações..."
          actions={
            <Link
              to="/vehicles"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700"
            >
              Voltar
            </Link>
          }
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="font-semibold text-slate-600">
            Carregando veículo...
          </p>
        </div>
      </>
    );
  }

  if (!veiculo) {
    return (
      <>
        <PageHeader
          title="Veículo não encontrado"
          description="Não foi possível localizar este veículo."
          actions={
            <Link
              to="/vehicles"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700"
            >
              Voltar
            </Link>
          }
        />

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {erro}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={veiculo.placa || "Veículo"}
        description={
          [veiculo.marca, veiculo.modelo]
            .filter(Boolean)
            .join(" ") || "Detalhes do veículo"
        }
        actions={
          <Link
            to="/vehicles"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Voltar
          </Link>
        }
      />

      {erro && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {mensagem && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          {mensagem}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-72 bg-slate-100">
              {fotoPrincipal ? (
                <img
                  src={fotoPrincipal}
                  alt={`Veículo ${veiculo.placa || ""}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl">🚗</div>
                    <p className="mt-3 text-sm font-semibold text-slate-400">
                      Sem foto cadastrada
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{veiculo.status}</Badge>

                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {nomeDestino(
                    veiculo.destino_atual || "PATIO"
                  )}
                </span>
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-900">
                Dados do veículo
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info
                  titulo="Placa"
                  valor={veiculo.placa}
                />

                <Info
                  titulo="Marca / Modelo"
                  valor={
                    [veiculo.marca, veiculo.modelo]
                      .filter(Boolean)
                      .join(" ") || "-"
                  }
                />

                <Info
                  titulo="Ano"
                  valor={veiculo.ano}
                />

                <Info
                  titulo="Cor"
                  valor={veiculo.cor}
                />

                <Info
                  titulo="RENAVAM"
                  valor={veiculo.renavam}
                />

                <Info
                  titulo="Chassi"
                  valor={veiculo.chassi}
                />

                <Info
                  titulo="Pátio"
                  valor={veiculo.patio}
                />

                <Info
                  titulo="Entrada"
                  valor={formatarData(
                    veiculo.data_entrada
                  )}
                />
              </div>

              {veiculo.proprietario && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Proprietário
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {veiculo.proprietario}
                  </p>
                </div>
              )}

              {veiculo.observacoes && (
                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Observações
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {veiculo.observacoes}
                  </p>
                </div>
              )}
            </div>
          </section>

          {Array.isArray(veiculo.fotos) &&
            veiculo.fotos.length > 1 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-black text-slate-900">
                  Fotos do veículo
                </h2>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {veiculo.fotos.map(
                    (foto, index) => (
                      <img
                        key={`${foto}-${index}`}
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="aspect-video w-full rounded-xl object-cover"
                      />
                    )
                  )}
                </div>
              </section>
            )}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                ↔️
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Alterar destino
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Defina em qual módulo este veículo deve aparecer.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Destino atual
              </p>

              <p className="mt-1 text-lg font-black text-slate-800">
                {nomeDestino(
                  veiculo.destino_atual || "PATIO"
                )}
              </p>
            </div>

            <form
              onSubmit={alterarDestino}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Novo destino
                </label>

                <select
                  value={novoDestino}
                  onChange={(event) =>
                    setNovoDestino(
                      event.target.value
                    )
                  }
                  disabled={salvando}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 outline-none transition focus:border-blue-500 disabled:opacity-60"
                >
                  {DESTINOS.map((destino) => (
                    <option
                      key={destino.value}
                      value={destino.value}
                    >
                      {destino.label}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {
                    DESTINOS.find(
                      (item) =>
                        item.value === novoDestino
                    )?.descricao
                  }
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observação da movimentação
                </label>

                <textarea
                  rows={4}
                  value={observacaoDestino}
                  onChange={(event) =>
                    setObservacaoDestino(
                      event.target.value
                    )
                  }
                  disabled={salvando}
                  placeholder="Ex.: encaminhado para leilão, ordem judicial nº..., liberado pelo responsável..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando
                  ? "Atualizando destino..."
                  : "Confirmar alteração de destino"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-slate-900">
              Como funciona
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <DestinoAjuda
                titulo="Pátio"
                texto="Permanece como veículo em pátio."
              />

              <DestinoAjuda
                titulo="Leilão"
                texto="Recebe status AGUARDANDO_LEILAO e aparece em Liberado por Leilão."
              />

              <DestinoAjuda
                titulo="Retirada judicial"
                texto="Fica identificado para a página de retirada judicial."
              />

              <DestinoAjuda
                titulo="Outros destinos"
                texto="Fica identificado para transferências e outros destinos."
              />

              <DestinoAjuda
                titulo="Liberado"
                texto="Marca o veículo como liberado."
              />

              <DestinoAjuda
                titulo="Análise"
                texto="Direciona o veículo para análise."
              />
            </div>
          </section>

          {veiculo.destino_atual === "LEILAO" && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-black text-amber-800">
                🔨 Veículo em processo de leilão
              </h2>

              <p className="mt-2 text-sm text-amber-700">
                Este veículo já pode ser administrado na página
                Liberado por Leilão.
              </p>

              <Link
                to="/auction-release"
                className="mt-4 inline-flex rounded-xl bg-amber-600 px-5 py-3 font-bold text-white transition hover:bg-amber-700"
              >
                Abrir página de leilão
              </Link>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Info({ titulo, valor }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">
        {titulo}
      </dt>

      <dd className="mt-1 break-words font-bold text-slate-700">
        {valor || "-"}
      </dd>
    </div>
  );
}

function DestinoAjuda({
  titulo,
  texto,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="font-bold text-slate-700">
        {titulo}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {texto}
      </p>
    </div>
  );
}
