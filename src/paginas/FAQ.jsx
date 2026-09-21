import { useMemo, useState } from "react";

const perguntas = [
  {
    id: 1,
    categoria: "Acesso",
    pergunta: "Como faço para entrar no sistema?",
    resposta:
      "Acesse a tela de login e informe o e-mail e a senha cadastrados. Para acessar os módulos internos, sua conta precisa estar autorizada pela administração.",
  },
  {
    id: 2,
    categoria: "Acesso",
    pergunta: "Esqueci minha senha. O que devo fazer?",
    resposta:
      'Na tela de login, clique em "Esqueci minha senha". Informe o e-mail cadastrado e siga as instruções para redefinição.',
  },
  {
    id: 3,
    categoria: "Acesso",
    pergunta:
      "Por que algumas opções não aparecem no meu menu?",
    resposta:
      "Cada usuário possui permissões específicas. O menu mostra apenas os módulos liberados para sua conta. Caso precise de outro acesso, solicite ao responsável MASTER.",
  },
  {
    id: 4,
    categoria: "Usuários",
    pergunta:
      "Quem pode aprovar ou bloquear funcionários?",
    resposta:
      "O gerenciamento de usuários é realizado pelo usuário MASTER, que pode definir cargo, permissões, situação da conta e pátio do funcionário.",
  },
  {
    id: 5,
    categoria: "Usuários",
    pergunta:
      "Um funcionário pode alterar suas próprias permissões?",
    resposta:
      "Não. As permissões administrativas são controladas pelo MASTER. O usuário comum não pode liberar novos módulos para a própria conta.",
  },
  {
    id: 6,
    categoria: "Pátios",
    pergunta:
      "Como funciona a separação dos usuários por pátio?",
    resposta:
      "Cada funcionário poderá ser vinculado a um pátio. A estrutura permitirá que as informações operacionais sejam apresentadas de acordo com a unidade responsável.",
  },
  {
    id: 7,
    categoria: "Pátios",
    pergunta: "Quem pode cadastrar novos pátios?",
    resposta:
      "A criação e administração dos pátios é destinada ao usuário MASTER.",
  },
  {
    id: 8,
    categoria: "Veículos",
    pergunta: "Como cadastrar um veículo?",
    resposta:
      'Acesse Veículos e depois "Cadastrar veículo". Preencha os dados solicitados, confira as informações e finalize o cadastro. É necessário possuir a permissão correspondente.',
  },
  {
    id: 9,
    categoria: "Veículos",
    pergunta:
      "Quantas fotos posso adicionar ao cadastro?",
    resposta:
      "O cadastro pode receber as fotos previstas pelo sistema. As imagens devem ser utilizadas para documentar corretamente as condições e identificação do veículo.",
  },
  {
    id: 10,
    categoria: "Veículos",
    pergunta:
      "Posso alterar o destino de um veículo?",
    resposta:
      "Sim, desde que sua conta possua a permissão necessária. A alteração é realizada através das funções operacionais disponíveis no sistema.",
  },
  {
    id: 11,
    categoria: "Veículos",
    pergunta: "O que acontece quando excluo um veículo?",
    resposta:
      "Quando utilizada a exclusão normal do sistema, o veículo pode ser encaminhado para a Lixeira. A exclusão definitiva deve ser utilizada somente quando realmente necessária.",
  },
  {
    id: 12,
    categoria: "Dashboard",
    pergunta:
      "Por que meu Dashboard mostra informações diferentes do MASTER?",
    resposta:
      "Os dados apresentados podem variar de acordo com as permissões e o pátio do usuário. O MASTER possui uma visão administrativa mais ampla.",
  },
  {
    id: 13,
    categoria: "Dashboard",
    pergunta:
      "Os dados do Dashboard são atualizados automaticamente?",
    resposta:
      "O Dashboard consulta os registros existentes no sistema. Após movimentações ou novos cadastros, uma atualização da página pode refletir os novos dados.",
  },
  {
    id: 14,
    categoria: "Leilão",
    pergunta:
      "Onde ficam os veículos destinados ao leilão?",
    resposta:
      "Os veículos relacionados ao fluxo de leilão são controlados através da página Liberados por leilão, respeitando o andamento registrado no sistema.",
  },
  {
    id: 15,
    categoria: "Segurança",
    pergunta:
      "Um usuário consegue acessar uma página apenas digitando o endereço?",
    resposta:
      "As rotas protegidas verificam a autenticação e as permissões da conta. Além disso, os dados sensíveis devem permanecer protegidos pelas políticas de segurança do banco de dados.",
  },
];

export default function FAQ() {
  const [pesquisa, setPesquisa] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [aberto, setAberto] = useState(null);

  const categorias = [
    "Todos",
    ...new Set(
      perguntas.map((item) => item.categoria)
    ),
  ];

  const perguntasFiltradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return perguntas.filter((item) => {
      const categoriaCorreta =
        categoria === "Todos" ||
        item.categoria === categoria;

      const pesquisaCorreta =
        !termo ||
        item.pergunta.toLowerCase().includes(termo) ||
        item.resposta.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo);

      return categoriaCorreta && pesquisaCorreta;
    });
  }, [pesquisa, categoria]);

  function alternarPergunta(id) {
    setAberto((atual) =>
      atual === id ? null : id
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">

        {/* CABEÇALHO */}

        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
            ?
          </div>

          <p className="mt-5 text-sm font-bold uppercase tracking-wider text-blue-600">
            Central de ajuda
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
            FAQ / Dúvidas
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Encontre respostas para as principais dúvidas
            sobre o funcionamento do sistema Pátio Sul Brasil.
          </p>
        </div>

        {/* PESQUISA */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
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
                placeholder="Digite sua dúvida..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* QUANTIDADE */}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">
            {perguntasFiltradas.length} pergunta
            {perguntasFiltradas.length !== 1
              ? "s"
              : ""}{" "}
            encontrada
            {perguntasFiltradas.length !== 1
              ? "s"
              : ""}
          </p>
        </div>

        {/* FAQ */}

        {perguntasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">
              🤔
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              Não encontramos essa dúvida
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Tente pesquisar utilizando outras palavras.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {perguntasFiltradas.map((item) => {
              const estaAberto =
                aberto === item.id;

              return (
                <div
                  key={item.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                    estaAberto
                      ? "border-blue-200"
                      : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      alternarPergunta(item.id)
                    }
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <div>
                      <span className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-600">
                        {item.categoria}
                      </span>

                      <h2 className="text-sm font-bold leading-6 text-slate-800 sm:text-base">
                        {item.pergunta}
                      </h2>
                    </div>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold transition ${
                        estaAberto
                          ? "rotate-180 bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      ⌄
                    </div>
                  </button>

                  {estaAberto && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-5">
                      <p className="text-sm leading-7 text-slate-600">
                        {item.resposta}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* AJUDA */}

        <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-center text-white sm:p-8">
          <div className="text-3xl">
            💬
          </div>

          <h2 className="mt-3 text-xl font-black">
            Ainda está com dúvida?
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Caso não encontre sua resposta nesta página,
            entre em contato com o responsável administrativo
            da sua unidade.
          </p>
        </div>
      </div>
    </div>
  );
}