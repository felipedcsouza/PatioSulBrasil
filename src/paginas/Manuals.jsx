import { useMemo, useState } from "react";

const manuais = [
  {
    id: 1,
    titulo: "Dashboard",
    categoria: "Sistema",
    icone: "▦",
    descricao:
      "Entenda os indicadores, gráficos, movimentações e informações apresentadas no Dashboard.",
    conteudo: [
      "O Dashboard apresenta uma visão geral da operação.",
      "Os cards superiores mostram os principais indicadores do sistema.",
      "Os gráficos utilizam informações dos veículos e movimentações cadastradas.",
      "Os dados apresentados respeitam as permissões e o pátio do usuário.",
      "Usuários MASTER poderão visualizar informações gerais da organização.",
    ],
  },
  {
    id: 2,
    titulo: "Cadastro de veículos",
    categoria: "Veículos",
    icone: "🚗",
    descricao:
      "Aprenda como cadastrar corretamente um novo veículo no sistema.",
    conteudo: [
      "Acesse a opção Veículos no menu lateral.",
      'Clique no botão "Cadastrar veículo".',
      "Informe placa, RENAVAM, chassi, marca, modelo, cor e ano.",
      "Informe os dados do proprietário quando necessário.",
      "Selecione o pátio responsável pelo veículo.",
      "Adicione observações importantes.",
      "Adicione as fotos do veículo.",
      "Confira as informações antes de finalizar o cadastro.",
    ],
  },
  {
    id: 3,
    titulo: "Consulta de veículos",
    categoria: "Veículos",
    icone: "🔍",
    descricao:
      "Veja como localizar veículos e acessar todas as informações cadastradas.",
    conteudo: [
      "Entre na página Veículos.",
      "Utilize a pesquisa para localizar pela placa ou outras informações disponíveis.",
      "Clique no veículo desejado para abrir os detalhes.",
      "Na tela de detalhes poderão ser visualizadas informações, fotos, status e destino atual.",
      "As informações disponíveis dependem das permissões do usuário.",
    ],
  },
  {
    id: 4,
    titulo: "Alteração de destino",
    categoria: "Operação",
    icone: "↗",
    descricao:
      "Como encaminhar um veículo para leilão, retirada judicial, liberação ou outro destino.",
    conteudo: [
      "Abra os detalhes do veículo.",
      "Localize a opção de alteração de destino.",
      "Selecione o novo destino.",
      "Confira as informações antes de confirmar.",
      "A alteração ficará vinculada ao veículo.",
      "Quando aplicável, uma movimentação será registrada no histórico.",
    ],
  },
  {
    id: 5,
    titulo: "Veículos liberados",
    categoria: "Operação",
    icone: "✓",
    descricao:
      "Procedimentos relacionados aos veículos que foram liberados.",
    conteudo: [
      "Acesse Veículos liberados no menu.",
      "Consulte os veículos disponíveis nessa situação.",
      "Confira os dados antes de realizar qualquer procedimento.",
      "As liberações devem respeitar os documentos e procedimentos administrativos da empresa.",
    ],
  },
  {
    id: 6,
    titulo: "Leilão",
    categoria: "Operação",
    icone: "⚖",
    descricao:
      "Entenda o fluxo de veículos destinados e posteriormente liberados por leilão.",
    conteudo: [
      "Acesse Liberados por leilão.",
      "Localize o veículo.",
      "Informe lote, data do leilão e observações quando necessário.",
      "Atualize o andamento do processo conforme cada etapa.",
      "Confira o histórico antes de liberar a retirada.",
    ],
  },
  {
    id: 7,
    titulo: "Retirada judicial",
    categoria: "Operação",
    icone: "⚑",
    descricao:
      "Procedimento para veículos retirados por determinação ou oficial de justiça.",
    conteudo: [
      "Entre em Retirada judicial.",
      "Localize o veículo correspondente.",
      "Confira os dados e documentos apresentados.",
      "Registre as informações necessárias no sistema.",
      "Finalize a movimentação somente após a conferência do procedimento.",
    ],
  },
  {
    id: 8,
    titulo: "Outros destinos",
    categoria: "Operação",
    icone: "➜",
    descricao:
      "Como controlar veículos encaminhados para destinos diferentes dos fluxos principais.",
    conteudo: [
      "Acesse Outros destinos.",
      "Localize ou selecione o veículo.",
      "Informe corretamente o destino.",
      "Adicione observações importantes.",
      "Confirme a movimentação.",
    ],
  },
  {
    id: 9,
    titulo: "Análise de veículos",
    categoria: "Operação",
    icone: "⌕",
    descricao:
      "Orientações para veículos que precisam permanecer em análise.",
    conteudo: [
      "Acesse a página Análise.",
      "Localize o veículo.",
      "Confira os dados cadastrais.",
      "Registre as informações referentes à análise.",
      "Após a conclusão, encaminhe o veículo para o destino adequado.",
    ],
  },
  {
    id: 10,
    titulo: "Relatórios",
    categoria: "Administrativo",
    icone: "▤",
    descricao:
      "Veja como utilizar as informações do sistema para acompanhamento e gestão.",
    conteudo: [
      "Entre na página Relatórios.",
      "Selecione as informações necessárias.",
      "Utilize os filtros disponíveis.",
      "Confira o período e o pátio selecionado.",
      "Os dados exibidos respeitam as permissões do usuário.",
    ],
  },
  {
    id: 11,
    titulo: "Usuários e permissões",
    categoria: "Administração",
    icone: "👥",
    descricao:
      "Manual destinado ao MASTER para gerenciamento de contas, cargos e permissões.",
    conteudo: [
      "Entre na página Administração.",
      "Localize o usuário desejado.",
      "Confira nome e e-mail.",
      "Escolha o cargo do funcionário.",
      "Escolha o pátio ao qual o funcionário pertence.",
      "Marque apenas as permissões necessárias.",
      "Aprove, bloqueie ou reative o usuário quando necessário.",
      "Nunca forneça permissões administrativas sem necessidade.",
    ],
  },
  {
    id: 12,
    titulo: "Gestão de pátios",
    categoria: "Administração",
    icone: "🏢",
    descricao:
      "Como criar, editar, ativar e organizar os pátios da organização.",
    conteudo: [
      "A página de Pátios é destinada ao usuário MASTER.",
      'Clique em "Novo pátio" para cadastrar uma unidade.',
      "Informe nome, cidade, estado, endereço e telefone.",
      "Um pátio pode ser ativado ou desativado.",
      "Funcionários poderão posteriormente ser vinculados a um pátio.",
      "Veículos também poderão ser vinculados à unidade responsável.",
    ],
  },
];

export default function Manuals() {
  const [pesquisa, setPesquisa] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [manualAberto, setManualAberto] = useState(null);

  const categorias = [
    "Todos",
    ...new Set(manuais.map((manual) => manual.categoria)),
  ];

  const manuaisFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return manuais.filter((manual) => {
      const correspondeCategoria =
        categoria === "Todos" ||
        manual.categoria === categoria;

      const correspondePesquisa =
        !termo ||
        manual.titulo.toLowerCase().includes(termo) ||
        manual.descricao.toLowerCase().includes(termo) ||
        manual.categoria.toLowerCase().includes(termo);

      return correspondeCategoria && correspondePesquisa;
    });
  }, [pesquisa, categoria]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}

        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Central de conhecimento
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Manuais do Sistema
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Consulte orientações e procedimentos para utilizar
            corretamente as funções do sistema Pátio Sul Brasil.
          </p>
        </div>

        {/* PESQUISA */}

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
                  setPesquisa(event.target.value)
                }
                placeholder="Pesquisar manual..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={categoria}
              onChange={(event) =>
                setCategoria(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              {categorias.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CARDS */}

        {manuaisFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">📚</div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Nenhum manual encontrado
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tente pesquisar utilizando outro termo.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {manuaisFiltrados.map((manual) => (
              <div
                key={manual.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    {manual.icone}
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {manual.categoria}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-black text-slate-900">
                  {manual.titulo}
                </h2>

                <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                  {manual.descricao}
                </p>

                <button
                  type="button"
                  onClick={() => setManualAberto(manual)}
                  className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Abrir manual
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}

      {manualAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  {manualAberto.icone}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-blue-600">
                    {manualAberto.categoria}
                  </p>

                  <h2 className="text-xl font-black text-slate-900">
                    {manualAberto.titulo}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManualAberto(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <p className="mb-6 text-sm leading-6 text-slate-500">
                {manualAberto.descricao}
              </p>

              <div className="space-y-3">
                {manualAberto.conteudo.map(
                  (passo, index) => (
                    <div
                      key={index}
                      className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-sm leading-6 text-slate-700">
                        {passo}
                      </p>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setManualAberto(null)}
                className="mt-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Fechar manual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}