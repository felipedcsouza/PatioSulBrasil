import { Link } from "react-router-dom";
import logoPatioSulBrasil from "../assets/imagenPatioSul.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#211E1F] text-white">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#211E1F]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">

          {/* LOGO */}

      <Link to="/" className="flex items-center">
  <img
    src={logoPatioSulBrasil}
    alt="Pátio Sul Brasil"
    className="h-14 w-auto object-contain"
  />
</Link>

          {/* BOTÕES */}

          <div className="flex items-center gap-3">

            <Link
              to="/register"
              className="hidden rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-[#FFC400] hover:text-[#FFC400] sm:inline-flex"
            >
              Criar conta
            </Link>

            <Link
              to="/login"
              className="rounded-xl bg-[#FFC400] px-5 py-3 text-sm font-black text-[#211E1F] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#FFD43B]"
            >
              Entrar no sistema
            </Link>

          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <main>

        <section className="relative overflow-hidden">

          {/* EFEITOS DE FUNDO */}

          <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-[#FFC400]/10 blur-3xl" />

          <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-[#FFC400]/5 blur-3xl" />

          <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">

            {/* =================================================
                TEXTO
            ================================================== */}

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFC400]/30 bg-[#FFC400]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#FFC400]">
                <span className="h-2 w-2 rounded-full bg-[#FFC400]" />
                Sistema de Gestão
              </div>

              <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.05] sm:text-5xl lg:text-6xl xl:text-7xl">
                Gestão completa para o{" "}
                <span className="text-[#FFC400]">
                  Pátio Sul Brasil.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
                Controle veículos, movimentações, liberações, leilões,
                retiradas judiciais, documentos, pátios, financeiro e
                relatórios em uma única plataforma.
              </p>

              {/* BOTÕES PRINCIPAIS */}

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFC400] px-7 py-4 text-sm font-black text-[#211E1F] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:bg-[#FFD43B]"
                >
                  Acessar sistema
                  <span>→</span>
                </Link>

                <a
                  href="#recursos"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-sm font-black text-white transition hover:border-[#FFC400]/50 hover:bg-[#FFC400]/10 hover:text-[#FFC400]"
                >
                  Conhecer recursos
                </a>

              </div>

              {/* BENEFÍCIOS */}

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-4 text-sm font-semibold text-zinc-400">

                <Beneficio texto="Gestão centralizada" />

                <Beneficio texto="Controle por pátio" />

                <Beneficio texto="Acesso por permissões" />

              </div>

            </div>

            {/* =================================================
                PAINEL VISUAL
            ================================================== */}

            <div className="relative">

              <div className="absolute inset-0 rounded-[40px] bg-[#FFC400]/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#2B2829] p-5 shadow-2xl sm:p-7">

                {/* LOGO GRANDE */}

                <div className="rounded-2xl bg-white p-6 shadow-lg">
                  <img
                    src={logoPatioSulBrasil}
                    alt="Pátio Sul Brasil"
                    className="mx-auto h-auto w-full max-w-[480px] object-contain"
                  />
                </div>

                {/* MINI DASHBOARD */}

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <MiniCard
                    icone="🚗"
                    titulo="Veículos"
                    descricao="Gestão completa"
                  />

                  <MiniCard
                    icone="🏢"
                    titulo="Pátios"
                    descricao="Unidades integradas"
                  />

                  <MiniCard
                    icone="$"
                    titulo="Financeiro"
                    descricao="Receitas e despesas"
                  />

                  <MiniCard
                    icone="▤"
                    titulo="Relatórios"
                    descricao="Dados estratégicos"
                  />

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            RECURSOS
        ====================================================== */}

        <section
          id="recursos"
          className="border-t border-white/10 bg-[#191718]"
        >
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">

            <div className="max-w-3xl">

              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#FFC400]">
                Plataforma completa
              </p>

              <h2 className="mt-4 text-3xl font-black sm:text-4xl lg:text-5xl">
                Tudo que a operação precisa em um só lugar.
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
                Organize toda a operação do pátio com segurança,
                rastreabilidade e controle de acesso para cada usuário.
              </p>

            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              <Recurso
                icone="🚗"
                titulo="Veículos"
                texto="Cadastre, consulte e acompanhe os veículos presentes nos pátios."
              />

              <Recurso
                icone="✓"
                titulo="Liberações"
                texto="Gerencie veículos autorizados para retirada e acompanhe cada etapa."
              />

              <Recurso
                icone="⚖"
                titulo="Leilões"
                texto="Controle veículos destinados a leilão, lotes e retiradas."
              />

              <Recurso
                icone="🏢"
                titulo="Gestão de pátios"
                texto="Separe usuários, veículos e informações entre diferentes unidades."
              />

              <Recurso
                icone="📁"
                titulo="Documentos"
                texto="Centralize documentos importantes organizados por pátio."
              />

              <Recurso
                icone="$"
                titulo="Financeiro"
                texto="Controle receitas, despesas, pagamentos e movimentações financeiras."
              />

              <Recurso
                icone="▤"
                titulo="Relatórios"
                texto="Visualize informações estratégicas da operação e gere relatórios."
              />

              <Recurso
                icone="🔔"
                titulo="Notificações"
                texto="Mantenha usuários e unidades informados sobre acontecimentos importantes."
              />

              <Recurso
                icone="⚙"
                titulo="Administração"
                texto="Controle usuários, cargos, permissões e acessos ao sistema."
              />

            </div>

          </div>
        </section>

        {/* =====================================================
            SEGURANÇA
        ====================================================== */}

        <section className="bg-[#211E1F]">

          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">

            <div>

              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#FFC400]">
                Segurança e organização
              </p>

              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                Cada usuário acessa somente o que precisa.
              </h2>

              <p className="mt-5 max-w-xl leading-8 text-zinc-400">
                O sistema utiliza controle de usuários, cargos, permissões
                e separação por pátio para manter as informações organizadas
                e protegidas.
              </p>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <Destaque
                numero="01"
                titulo="Usuários"
                texto="Acesso individual para cada colaborador."
              />

              <Destaque
                numero="02"
                titulo="Permissões"
                texto="Controle quais módulos cada usuário pode acessar."
              />

              <Destaque
                numero="03"
                titulo="Pátios"
                texto="Organização das informações por unidade."
              />

              <Destaque
                numero="04"
                titulo="Gestão"
                texto="Visão centralizada para administradores."
              />

            </div>

          </div>

        </section>

        {/* =====================================================
            CTA
        ====================================================== */}

        <section className="border-y border-white/10 bg-[#191718]">

          <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFC400] text-2xl font-black text-[#211E1F] shadow-lg">
              →
            </div>

            <h2 className="mt-7 text-3xl font-black sm:text-4xl">
              Pronto para acessar o sistema?
            </h2>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
              Entre com sua conta para acessar o painel e os módulos
              disponíveis para seu usuário.
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#FFC400] px-8 py-4 text-sm font-black text-[#211E1F] shadow-xl transition hover:-translate-y-1 hover:bg-[#FFD43B]"
            >
              Entrar no sistema
            </Link>

          </div>

        </section>

      </main>

      {/* =====================================================
          RODAPÉ
      ====================================================== */}

      <footer className="bg-[#111010]">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-8 text-center sm:flex-row sm:text-left">

          <div>

            <p className="font-black text-white">
              Pátio Sul Brasil
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Sistema de Gestão Operacional
            </p>

          </div>

          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} Pátio Sul Brasil.
            Todos os direitos reservados.
          </p>

        </div>

      </footer>

    </div>
  );
}

/* =========================================================
   BENEFÍCIO
========================================================= */

function Beneficio({ texto }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFC400] text-xs font-black text-[#211E1F]">
        ✓
      </span>

      <span>{texto}</span>
    </div>
  );
}

/* =========================================================
   MINI CARD
========================================================= */

function MiniCard({ icone, titulo, descricao }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#211E1F] p-4">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFC400] text-base font-black text-[#211E1F]">
        {icone}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
        {titulo}
      </p>

      <p className="mt-1 text-base font-black text-white sm:text-lg">
        {descricao}
      </p>

    </div>
  );
}

/* =========================================================
   RECURSO
========================================================= */

function Recurso({ icone, titulo, texto }) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-[#211E1F] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#FFC400]/40">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFC400] text-xl font-black text-[#211E1F]">
        {icone}
      </div>

      <h3 className="mt-5 text-lg font-black text-white">
        {titulo}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {texto}
      </p>

    </div>
  );
}

/* =========================================================
   DESTAQUE
========================================================= */

function Destaque({ numero, titulo, texto }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#2B2829] p-5">

      <span className="text-sm font-black text-[#FFC400]">
        {numero}
      </span>

      <h3 className="mt-3 text-lg font-black">
        {titulo}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {texto}
      </p>

    </div>
  );
}