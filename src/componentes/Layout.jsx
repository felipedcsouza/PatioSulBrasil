
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../biblioteca/AuthContext";
import imagenPatioSul from "../assets/imagenPatioSul.png";

// =======================================================
// ITENS DO MENU
// =======================================================

const menuItems = [
  {
    nome: "Dashboard",
    caminho: "/dashboard",
    icone: "▦",
    permissao: "dashboard",
  },

  {
    nome: "Veículos",
    caminho: "/vehicles",
    icone: "🚗",
    permissao: "vehicles",
  },

  {
    nome: "Veículos liberados",
    caminho: "/releases",
    icone: "✓",
    permissao: "releases",
  },

  {
    nome: "Liberados por leilão",
    caminho: "/auction-release",
    icone: "⚖",
    permissao: "auction",
  },

  {
    nome: "Retirada judicial",
    caminho: "/judicial-retrieval",
    icone: "⚑",
    permissao: "judicial",
  },

  {
    nome: "Outros destinos",
    caminho: "/other-destinations",
    icone: "↗",
    permissao: "other_destinations",
  },

  {
    nome: "Análise",
    caminho: "/analysis",
    icone: "⌕",
    permissao: "analysis",
  },

  {
    nome: "Financeiro",
    caminho: "/financial",
    icone: "$",
    permissao: "financial",
  },

  {
    nome: "Cobranças de Diárias",
    caminho: "/pagamentos-diarias",
    icone: "💳",
    permissao: "financial",
  },

  {
    nome: "Relatórios",
    caminho: "/reports",
    icone: "▤",
    permissao: "reports",
  },

  {
    nome: "Documentos",
    caminho: "/documents",
    icone: "📁",
    permissao: "documents",
  },

  {
    nome: "Notificações",
    caminho: "/notifications",
    icone: "🔔",
    permissao: "notifications",
  },

  {
    nome: "Consulta CNPJ",
    caminho: "/consulta-cnpj",
    icone: "🏢",
    permissao: "consulta_cnpj",
  },

  {
    nome: "Contratos e Tarifas",
    caminho: "/contratos",
    icone: "📄",
    permissao: "contratos",
  },

  {
    nome: "Manuais",
    caminho: "/manuals",
    icone: "▣",
    permissao: "manuals",
  },

  {
    nome: "FAQ / Dúvidas",
    caminho: "/faq",
    icone: "?",
    sempreVisivel: true,
  },

  {
    nome: "Administração",
    caminho: "/admin",
    icone: "⚙",
    permissao: "admin",
  },

  // =====================================================
  // PÁTIOS - SOMENTE MASTER
  // =====================================================

  {
    nome: "Pátios",
    caminho: "/patios",
    icone: "🏢",
    somenteMaster: true,
  },

  {
    nome: "Perfil",
    caminho: "/profile",
    icone: "●",
    sempreVisivel: true,
  },
];

// =======================================================
// FORMATAR CARGO
// =======================================================

function formatarCargo(cargo) {
  const cargos = {
    MASTER: "Master",
    ADMIN: "Administrador",
    OPERADOR: "Operador",
    FINANCEIRO: "Financeiro",
    CONSULTA: "Consulta",
    SEM_CARGO: "Sem cargo",
  };

  return cargos[cargo] || cargo || "Usuário";
}

// =======================================================
// LAYOUT
// =======================================================

function Layout() {
  const [menuAberto, setMenuAberto] =
    useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const {
    user,
    perfil,
    logout,
    temPermissao,
    isMaster,
    loading,
  } = useAuth();

  // =====================================================
  // FECHAR MENU AO TROCAR DE PÁGINA
  // =====================================================

  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  function fecharMenu() {
    setMenuAberto(false);
  }

  // =====================================================
  // FILTRAR MENU POR PERMISSÃO
  // =====================================================

  const menuPermitido = useMemo(() => {
    return menuItems.filter((item) => {
      // MASTER VÊ TUDO
      if (isMaster) {
        return true;
      }

      // ITEM EXCLUSIVO DO MASTER
      if (item.somenteMaster) {
        return false;
      }

      // ITENS VISÍVEIS PARA TODO USUÁRIO APROVADO
      if (item.sempreVisivel) {
        return true;
      }

      // DEMAIS ITENS DEPENDEM DA PERMISSÃO
      return temPermissao(
        item.permissao
      );
    });
  }, [
    perfil,
    isMaster,
    temPermissao,
  ]);

  // =====================================================
  // SAIR DO SISTEMA
  // =====================================================

  async function sairSistema() {
    try {
      await logout();

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );
    }
  }

  // =====================================================
  // CARREGANDO
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 font-semibold text-slate-500">
            Carregando sistema...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* =================================================
          CABEÇALHO MOBILE
      ================================================== */}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#FFC400] bg-[#211E1F] px-4 shadow-md md:hidden">

        {/* BOTÃO HAMBÚRGUER */}

        <button
          type="button"
          onClick={() =>
            setMenuAberto(true)
          }
          aria-label="Abrir menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#FFC400]/40 bg-[#2b2829] text-[#FFC400] transition hover:bg-[#343132]"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line
              x1="4"
              y1="6"
              x2="20"
              y2="6"
            />

            <line
              x1="4"
              y1="12"
              x2="20"
              y2="12"
            />

            <line
              x1="4"
              y1="18"
              x2="20"
              y2="18"
            />
          </svg>
        </button>

        {/* LOGO MOBILE */}

        <div className="flex flex-1 justify-center px-3">
          <div className="flex h-12 w-full max-w-[190px] items-center justify-center rounded-lg bg-white px-3 py-1 shadow-sm">
            <img
              src={imagenPatioSul}
              alt="Pátio Sul Brasil"
              className="max-h-10 w-auto max-w-full object-contain"
            />
          </div>
        </div>

        {/* USUÁRIO MOBILE */}

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFC400] text-sm font-black text-[#211E1F] shadow-sm">
          {perfil?.nome
            ?.charAt(0)
            ?.toUpperCase() ||
            user?.email
              ?.charAt(0)
              ?.toUpperCase() ||
            "U"}
        </div>
      </header>

      {/* =================================================
          FUNDO ESCURO MOBILE
      ================================================== */}

      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={fecharMenu}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          w-72
          flex-col
          border-r
          border-[#343132]
          bg-[#211E1F]
          transition-transform
          duration-300

          md:translate-x-0

          ${
            menuAberto
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* ===============================================
            LOGO
        ================================================ */}

        <div className="flex h-28 items-center justify-between border-b border-[#343132] bg-white px-4">

          <div className="flex min-w-0 flex-1 items-center justify-center pr-2">
            <img
              src={imagenPatioSul}
              alt="Pátio Sul Brasil"
              className="max-h-20 w-auto max-w-[225px] object-contain"
            />
          </div>

          {/* FECHAR MOBILE */}

          <button
            type="button"
            onClick={fecharMenu}
            aria-label="Fechar menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#211E1F] transition hover:bg-[#FFC400]/20 md:hidden"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
              />

              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
              />
            </svg>
          </button>

        </div>

        {/* ===============================================
            INFORMAÇÕES DO USUÁRIO
        ================================================ */}

        <div className="border-b border-[#343132] p-4">

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#2b2829] p-3 shadow-sm">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFC400] font-black text-[#211E1F]">
              {perfil?.nome
                ?.charAt(0)
                ?.toUpperCase() ||
                user?.email
                  ?.charAt(0)
                  ?.toUpperCase() ||
                "U"}
            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-black text-white">

                {isMaster &&
                  "👑 "}

                {perfil?.nome ||
                  "Usuário"}

              </p>

              <p className="truncate text-xs text-slate-400">

                {perfil?.email ||
                  user?.email}

              </p>

              <span className="mt-1 inline-flex rounded-full bg-[#FFC400] px-2 py-0.5 text-[10px] font-black uppercase text-[#211E1F]">

                {formatarCargo(
                  perfil?.cargo
                )}

              </span>

            </div>

          </div>

        </div>

        {/* ===============================================
            LINKS
        ================================================ */}

        <nav className="flex-1 overflow-y-auto p-4">

          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-[#A7AAAC]">
            Navegação
          </p>

          <div className="space-y-1">

            {menuPermitido.map(
              (item) => (

                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  onClick={fecharMenu}
                  className={({
                    isActive,
                  }) =>
                    `
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-3
                      text-sm
                      font-semibold
                      transition

                      ${
                        isActive
                          ? "bg-[#FFC400] text-[#211E1F] shadow-sm"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }
                    `
                  }
                >

                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base">
                    {item.icone}
                  </span>

                  <span>
                    {item.nome}
                  </span>

                </NavLink>

              )
            )}

          </div>

          {/* =============================================
              LIXEIRA
          ============================================== */}

          {(isMaster ||
            temPermissao(
              "excluir_veiculo"
            )) && (

            <div className="mt-6 border-t border-[#343132] pt-4">

              <NavLink
                to="/lixeira"
                onClick={fecharMenu}
                className={({
                  isActive,
                }) =>
                  `
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-3
                    text-sm
                    font-semibold
                    transition

                    ${
                      isActive
                        ? "bg-red-600 text-white"
                        : "text-slate-300 hover:bg-red-500/15 hover:text-red-300"
                    }
                  `
                }
              >

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15">
                  🗑️
                </span>

                <span>
                  Lixeira
                </span>

              </NavLink>

            </div>

          )}

        </nav>

        {/* ===============================================
            RODAPÉ
        ================================================ */}

        <div className="border-t border-[#343132] p-4">

          <button
            type="button"
            onClick={sairSistema}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FFC400]/30 bg-[#2b2829] px-4 py-3 text-sm font-bold text-[#FFC400] transition hover:bg-[#FFC400] hover:text-[#211E1F]"
          >

            <span>
              ↪
            </span>

            <span>
              Sair
            </span>

          </button>

          <p className="mt-3 text-center text-[10px] font-semibold tracking-wide text-slate-500">
            Sistema de Gestão • Pátio Sul Brasil
          </p>

        </div>

      </aside>

      {/* =================================================
          CONTEÚDO
      ================================================== */}

      <main className="min-h-screen md:ml-72">

        <div className="min-w-0">
          <Outlet />
        </div>

      </main>

    </div>
  );
}

export default Layout;