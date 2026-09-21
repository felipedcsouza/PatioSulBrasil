import { useMemo, useState } from "react";

import logoPatioSulBrasil from "../assets/imagenPatioSul.png";

const API_URL = "https://publica.cnpj.ws/cnpj";

export default function ConsultaCNPJ() {
  const [cnpj, setCnpj] = useState("");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarJson, setMostrarJson] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const estabelecimento = dados?.estabelecimento ?? null;
  const atividadePrincipal = estabelecimento?.atividade_principal ?? null;
  const inscricoesEstaduais = estabelecimento?.inscricoes_estaduais ?? [];

  const totalCamposPreenchidos = useMemo(
    () => contarCamposPreenchidos(dados),
    [dados]
  );

  const enderecoCompleto = useMemo(() => {
    if (!estabelecimento) return "Não informado";

    const linha1 = [
      estabelecimento.tipo_logradouro,
      estabelecimento.logradouro,
      estabelecimento.numero,
    ]
      .filter(Boolean)
      .join(" ");

    const linha2 = [
      estabelecimento.complemento,
      estabelecimento.bairro,
      formatarCEP(estabelecimento.cep),
    ]
      .filter(Boolean)
      .join(" • ");

    return [linha1, linha2].filter(Boolean).join(" — ") || "Não informado";
  }, [estabelecimento]);

  const telefonePrincipal = useMemo(() => {
    if (!estabelecimento?.telefone1) return "Não informado";
    return formatarTelefone(estabelecimento.ddd1, estabelecimento.telefone1);
  }, [estabelecimento]);

  function aoAlterarCnpj(event) {
    const valor = formatarCNPJ(event.target.value);
    setCnpj(valor);
    setErro("");
  }

  async function consultar(event) {
    event.preventDefault();

    setErro("");
    setDados(null);
    setMostrarJson(false);
    setCopiado(false);

    const numero = somenteNumeros(cnpj);

    if (numero.length !== 14) {
      setErro("Informe um CNPJ com 14 dígitos.");
      return;
    }

    if (!cnpjValido(numero)) {
      setErro("O CNPJ informado não é válido.");
      return;
    }

    try {
      setLoading(true);

      const resposta = await fetch(`${API_URL}/${numero}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      let payload = null;

      try {
        payload = await resposta.json();
      } catch {
        payload = null;
      }

      if (!resposta.ok) {
        const mensagemApi =
          payload?.detalhes ||
          payload?.titulo ||
          payload?.message ||
          payload?.error;

        if (resposta.status === 404) {
          throw new Error(mensagemApi || "CNPJ não encontrado.");
        }

        if (resposta.status === 429) {
          throw new Error(
            mensagemApi ||
              "Limite de consultas da API atingido. Aguarde um momento e tente novamente."
          );
        }

        throw new Error(
          mensagemApi || `Não foi possível consultar o CNPJ. Erro ${resposta.status}.`
        );
      }

      setDados(payload);
    } catch (error) {
      console.error("Erro ao consultar CNPJ:", error);

      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setErro(
          "Não foi possível conectar à API de CNPJ. Verifique sua internet e tente novamente."
        );
        return;
      }

      setErro(error?.message || "Não foi possível consultar o CNPJ.");
    } finally {
      setLoading(false);
    }
  }

  async function copiarJson() {
    if (!dados) return;

    const texto = JSON.stringify(dados, null, 2);

    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch (error) {
      console.error("Erro ao copiar JSON:", error);
      setErro("Não foi possível copiar o JSON para a área de transferência.");
    }
  }

  function limparConsulta() {
    setCnpj("");
    setDados(null);
    setErro("");
    setMostrarJson(false);
    setCopiado(false);
  }

  return (
    <div className="min-h-screen bg-[#F4F4F3] text-[#211E1F]">
      <header className="border-b border-white/10 bg-[#211E1F] shadow-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src={logoPatioSulBrasil}
              alt="Pátio Sul Brasil"
              className="h-14 w-auto shrink-0 object-contain sm:h-16"
            />

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FFC400]">
                Pátio Sul Brasil
              </p>
              <h1 className="truncate text-2xl font-black text-white sm:text-3xl">
                Consulta de CNPJ
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Consulta empresarial completa com leitura dinâmica de todos os dados retornados.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#FFC400]/25 bg-[#FFC400]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#FFC400]">
              API pública
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300">
              Dados empresariais
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-5 sm:p-7 lg:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9B7800]">
                Consulta rápida
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Informe o CNPJ da empresa
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Digite apenas os números ou cole o CNPJ completo. A máscara é aplicada automaticamente.
              </p>

              <form onSubmit={consultar} className="mt-6">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="min-w-0 flex-1">
                    <label className="mb-2 block text-sm font-black text-[#211E1F]">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cnpj}
                      onChange={aoAlterarCnpj}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      disabled={loading}
                      className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-lg font-black tracking-wide text-[#211E1F] outline-none transition placeholder:text-zinc-300 focus:border-[#FFC400] focus:ring-4 focus:ring-[#FFC400]/15 disabled:cursor-not-allowed disabled:bg-zinc-100"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex min-h-[58px] min-w-[170px] items-center justify-center rounded-2xl bg-[#FFC400] px-6 py-4 font-black text-[#211E1F] shadow-lg shadow-[#FFC400]/15 transition hover:-translate-y-0.5 hover:bg-[#FFD43B] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-3">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#211E1F]/25 border-t-[#211E1F]" />
                          Consultando
                        </span>
                      ) : (
                        "Consultar"
                      )}
                    </button>

                    {(cnpj || dados) && (
                      <button
                        type="button"
                        onClick={limparConsulta}
                        disabled={loading}
                        className="min-h-[58px] rounded-2xl border border-zinc-300 bg-white px-5 py-4 font-black text-zinc-600 transition hover:border-[#211E1F] hover:text-[#211E1F] disabled:opacity-50"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {erro && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {erro}
                </div>
              )}
            </div>

            <div className="relative overflow-hidden bg-[#211E1F] p-6 text-white sm:p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FFC400]/10" />
              <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-white/[0.03]" />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFC400]">
                  Recursos
                </p>
                <h3 className="mt-3 text-xl font-black">
                  Leitura completa do retorno da API
                </h3>
                <div className="mt-5 grid gap-3 text-sm text-zinc-300">
                  <Recurso texto="Resumo empresarial organizado" />
                  <Recurso texto="Inscrições estaduais em destaque" />
                  <Recurso texto="Todos os objetos e listas renderizados" />
                  <Recurso texto="JSON bruto com cópia em um clique" />
                  <Recurso texto="Formatação automática dos principais campos" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {dados && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metrica
                titulo="Campos preenchidos"
                valor={totalCamposPreenchidos}
                descricao="Valores úteis encontrados no JSON"
              />
              <Metrica
                titulo="Situação"
                valor={estabelecimento?.situacao_cadastral || "Não informado"}
                descricao="Situação cadastral do estabelecimento"
                destaque={normalizarTexto(estabelecimento?.situacao_cadastral) === "ativa"}
              />
              <Metrica
                titulo="Tipo"
                valor={estabelecimento?.tipo || "Não informado"}
                descricao="Matriz ou filial"
              />
              <Metrica
                titulo="Capital social"
                valor={formatarCapitalSocial(dados?.capital_social)}
                descricao="Capital social informado"
              />
            </section>

            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="bg-[#211E1F] p-5 text-white sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFC400]">
                      Resumo da empresa
                    </p>
                    <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">
                      {dados?.razao_social || "Razão social não informada"}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-zinc-300">
                      {estabelecimento?.nome_fantasia || "Nome fantasia não informado"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${
                        normalizarTexto(estabelecimento?.situacao_cadastral) === "ativa"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {estabelecimento?.situacao_cadastral || "Situação não informada"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-200">
                      {formatarCNPJ(estabelecimento?.cnpj || cnpj)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:p-7 md:grid-cols-2 xl:grid-cols-3">
                <ResumoItem titulo="Razão social" valor={dados?.razao_social} />
                <ResumoItem titulo="Nome fantasia" valor={estabelecimento?.nome_fantasia} />
                <ResumoItem titulo="Situação cadastral" valor={estabelecimento?.situacao_cadastral} />
                <ResumoItem titulo="Endereço" valor={enderecoCompleto} className="md:col-span-2" />
                <ResumoItem
                  titulo="Cidade / UF"
                  valor={[estabelecimento?.cidade?.nome, estabelecimento?.estado?.sigla]
                    .filter(Boolean)
                    .join(" / ")}
                />
                <ResumoItem
                  titulo="CNAE principal"
                  valor={
                    atividadePrincipal
                      ? `${atividadePrincipal.id || ""}${atividadePrincipal.id ? " — " : ""}${
                          atividadePrincipal.descricao || "Não informado"
                        }`
                      : "Não informado"
                  }
                  className="md:col-span-2"
                />
                <ResumoItem titulo="Telefone" valor={telefonePrincipal} />
                <ResumoItem titulo="E-mail" valor={estabelecimento?.email} />
                <ResumoItem titulo="CEP" valor={formatarCEP(estabelecimento?.cep)} />
                <ResumoItem
                  titulo="Início da atividade"
                  valor={formatarData(estabelecimento?.data_inicio_atividade)}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9B7800]">
                    Inscrições estaduais
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Registros estaduais encontrados
                  </h2>
                </div>

                <span className="w-fit rounded-full bg-[#FFC400]/15 px-4 py-2 text-xs font-black text-[#7A5D00]">
                  {inscricoesEstaduais.length} registro(s)
                </span>
              </div>

              {inscricoesEstaduais.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {inscricoesEstaduais.map((item, index) => (
                    <div
                      key={`${item?.inscricao_estadual || "ie"}-${index}`}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                            Inscrição estadual
                          </p>
                          <p className="mt-1 text-lg font-black text-[#211E1F]">
                            {item?.inscricao_estadual || "Não informado"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            item?.ativo
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {item?.ativo ? "Ativa" : "Inativa"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <LinhaSimples
                          titulo="Estado"
                          valor={
                            [item?.estado?.nome, item?.estado?.sigla]
                              .filter(Boolean)
                              .join(" / ") || "Não informado"
                          }
                        />
                        <LinhaSimples titulo="Regime" valor={item?.regime || "Não informado"} />
                        <LinhaSimples
                          titulo="Atualizado em"
                          valor={formatarDataHora(item?.atualizado_em)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm font-semibold text-zinc-500">
                  Nenhuma inscrição estadual foi retornada para este CNPJ.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9B7800]">
                    Dados completos
                  </p>
                  <h2 className="mt-1 text-xl font-black sm:text-2xl">
                    Todos os campos retornados pela API
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Objetos, listas e listas de objetos são exibidos automaticamente, mesmo quando a estrutura muda entre empresas.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarJson((valor) => !valor)}
                    className="rounded-xl border border-[#211E1F] bg-white px-4 py-3 text-sm font-black text-[#211E1F] transition hover:bg-[#211E1F] hover:text-[#FFC400]"
                  >
                    {mostrarJson ? "Ocultar JSON bruto" : "Ver JSON bruto"}
                  </button>

                  <button
                    type="button"
                    onClick={copiarJson}
                    className="rounded-xl bg-[#FFC400] px-4 py-3 text-sm font-black text-[#211E1F] transition hover:bg-[#FFD43B]"
                  >
                    {copiado ? "JSON copiado" : "Copiar JSON"}
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <RenderizadorDinamico valor={dados} caminho="raiz" nivel={0} />
              </div>
            </section>

            {mostrarJson && (
              <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#151414] shadow-xl">
                <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFC400]">
                      JSON bruto
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Retorno integral recebido da API.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copiarJson}
                    className="w-fit rounded-xl border border-[#FFC400]/30 bg-[#FFC400]/10 px-4 py-2 text-sm font-black text-[#FFC400] transition hover:bg-[#FFC400] hover:text-[#211E1F]"
                  >
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>

                <pre className="max-h-[720px] overflow-auto p-5 text-xs leading-6 text-zinc-200 sm:p-6 sm:text-sm">
                  {JSON.stringify(dados, null, 2)}
                </pre>
              </section>
            )}

            <div className="pb-6 text-center text-xs leading-5 text-zinc-400">
              Os dados exibidos são fornecidos por serviço externo de consulta empresarial. A disponibilidade e a atualização das informações dependem da API consultada.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Recurso({ texto }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#FFC400]" />
      <span className="font-semibold">{texto}</span>
    </div>
  );
}

function Metrica({ titulo, valor, descricao, destaque = false }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
          {titulo}
        </p>
        <span className={`h-2.5 w-2.5 rounded-full ${destaque ? "bg-emerald-500" : "bg-[#FFC400]"}`} />
      </div>
      <p className="mt-3 break-words text-2xl font-black text-[#211E1F]">{valor}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{descricao}</p>
    </div>
  );
}

function ResumoItem({ titulo, valor, className = "" }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${className}`}>
      <p className="text-xs font-black uppercase tracking-wider text-zinc-400">{titulo}</p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-[#211E1F]">
        {valor || "Não informado"}
      </p>
    </div>
  );
}

function LinhaSimples({ titulo, valor }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-2 first:border-t-0 first:pt-0">
      <span className="font-semibold text-zinc-500">{titulo}</span>
      <span className="text-right font-bold text-[#211E1F]">{valor}</span>
    </div>
  );
}

function RenderizadorDinamico({ valor, caminho, nivel }) {
  if (valor === null || valor === undefined) {
    return <ValorPrimitivo valor="Não informado" />;
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm font-semibold text-zinc-400">
          Lista vazia
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {valor.map((item, index) => (
          <div
            key={`${caminho}-${index}`}
            className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-wider text-[#8A6B00]">
                Item {index + 1}
              </p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                {tipoDoValor(item)}
              </span>
            </div>
            <RenderizadorDinamico
              valor={item}
              caminho={`${caminho}.${index}`}
              nivel={nivel + 1}
            />
          </div>
        ))}
      </div>
    );
  }

  if (typeof valor === "object") {
    const entradas = Object.entries(valor);

    if (entradas.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm font-semibold text-zinc-400">
          Objeto vazio
        </div>
      );
    }

    return (
      <div className={nivel === 0 ? "grid gap-4" : "grid gap-3"}>
        {entradas.map(([chave, conteudo]) => {
          const complexo = conteudo !== null && typeof conteudo === "object";

          if (!complexo) {
            return (
              <div
                key={`${caminho}.${chave}`}
                className="grid gap-2 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-[220px_1fr] sm:items-start"
              >
                <p className="break-words text-xs font-black uppercase tracking-wider text-zinc-400">
                  {humanizarChave(chave)}
                </p>
                <ValorPrimitivo valor={formatarValorAutomatico(chave, conteudo)} />
              </div>
            );
          }

          const quantidade = Array.isArray(conteudo)
            ? conteudo.length
            : Object.keys(conteudo || {}).length;

          return (
            <details
              key={`${caminho}.${chave}`}
              open={nivel < 1}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-zinc-50 px-4 py-4 transition hover:bg-zinc-100">
                <div className="min-w-0">
                  <p className="break-words font-black text-[#211E1F]">
                    {humanizarChave(chave)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-400">
                    {Array.isArray(conteudo) ? "Lista" : "Objeto"} • {quantidade} item(ns)
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-[#FFC400]/15 px-3 py-1.5 text-xs font-black text-[#7A5D00]">
                  abrir / fechar
                </span>
              </summary>

              <div className="border-t border-zinc-200 p-4">
                <RenderizadorDinamico
                  valor={conteudo}
                  caminho={`${caminho}.${chave}`}
                  nivel={nivel + 1}
                />
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  return <ValorPrimitivo valor={String(valor)} />;
}

function ValorPrimitivo({ valor }) {
  return (
    <p className="min-w-0 break-words text-sm font-bold leading-6 text-[#211E1F]">
      {valor === "" || valor === null || valor === undefined ? "Não informado" : String(valor)}
    </p>
  );
}

function somenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCNPJ(valor) {
  const numeros = somenteNumeros(valor).slice(0, 14);

  if (!numeros) return "";

  return numeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarCEP(valor) {
  const numeros = somenteNumeros(valor).slice(0, 8);
  if (numeros.length !== 8) return valor || "Não informado";
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
}

function formatarTelefone(ddd, telefone) {
  const numero = somenteNumeros(telefone);
  const dddLimpo = somenteNumeros(ddd);

  if (!numero) return "Não informado";

  if (numero.length === 9) {
    return `${dddLimpo ? `(${dddLimpo}) ` : ""}${numero.slice(0, 5)}-${numero.slice(5)}`;
  }

  if (numero.length === 8) {
    return `${dddLimpo ? `(${dddLimpo}) ` : ""}${numero.slice(0, 4)}-${numero.slice(4)}`;
  }

  return `${dddLimpo ? `(${dddLimpo}) ` : ""}${numero}`;
}

function formatarCapitalSocial(valor) {
  if (valor === null || valor === undefined || valor === "") return "Não informado";

  const numero = Number(String(valor).replace(",", "."));
  if (Number.isNaN(numero)) return String(valor);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor) {
  if (!valor) return "Não informado";

  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  return formatarDataHora(valor);
}

function formatarDataHora(valor) {
  if (!valor) return "Não informado";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  const temHorario = /T\d{2}:\d{2}/.test(String(valor));

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(temHorario ? { timeStyle: "short" } : {}),
  }).format(data);
}

function formatarValorAutomatico(chave, valor) {
  if (valor === null || valor === undefined || valor === "") return "Não informado";

  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Não";
  }

  const chaveNormalizada = normalizarTexto(chave).replace(/\s+/g, "_");
  const texto = String(valor);

  if (chaveNormalizada.includes("cnpj") && somenteNumeros(texto).length === 14) {
    return formatarCNPJ(texto);
  }

  if (chaveNormalizada === "cep" || chaveNormalizada.endsWith("_cep")) {
    return formatarCEP(texto);
  }

  if (chaveNormalizada === "capital_social") {
    return formatarCapitalSocial(valor);
  }

  const pareceDataPelaChave =
    chaveNormalizada.startsWith("data_") ||
    chaveNormalizada.endsWith("_em") ||
    chaveNormalizada.includes("atualizado_em");

  const pareceDataPeloValor =
    /^\d{4}-\d{2}-\d{2}$/.test(texto) ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(texto);

  if (pareceDataPelaChave && pareceDataPeloValor) {
    return formatarDataHora(texto);
  }

  return texto;
}

function contarCamposPreenchidos(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  if (Array.isArray(valor)) {
    return valor.reduce((total, item) => total + contarCamposPreenchidos(item), 0);
  }

  if (typeof valor === "object") {
    return Object.values(valor).reduce(
      (total, item) => total + contarCamposPreenchidos(item),
      0
    );
  }

  return 1;
}

function humanizarChave(chave) {
  return String(chave || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function tipoDoValor(valor) {
  if (Array.isArray(valor)) return "lista";
  if (valor === null) return "nulo";
  return typeof valor === "object" ? "objeto" : typeof valor;
}

function cnpjValido(cnpj) {
  const numero = somenteNumeros(cnpj);

  if (numero.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(numero)) return false;

  const calcularDigito = (base, pesos) => {
    const soma = base
      .split("")
      .reduce((total, digito, index) => total + Number(digito) * pesos[index], 0);

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(numero.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcularDigito(
    `${numero.slice(0, 12)}${primeiro}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return numero.endsWith(`${primeiro}${segundo}`);
}
