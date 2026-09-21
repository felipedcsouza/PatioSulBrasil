import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./componentes/ProtectedRoute";
import ScrollToTop from "./componentes/ScrollToTop";
import Layout from "./componentes/Layout";

import PageNotFound from "./biblioteca/PageNotFound";

// =======================================================
// PÁGINAS PÚBLICAS
// =======================================================

import Landing from "./paginas/Landing";
import Login from "./paginas/Login";
import Register from "./paginas/Register";
import ConfirmEmail from "./paginas/ConfirmEmail";
import ForgotPassword from "./paginas/ForgotPassword";
import ResetPassword from "./paginas/ResetPassword";
import OAuthConsent from "./paginas/OAuthConsent";

// =======================================================
// PÁGINAS PROTEGIDAS
// =======================================================

import Dashboard from "./paginas/Dashboard";

import Vehicles from "./paginas/Vehicles";
import CadastrarVeiculo from "./paginas/CadastrarVeiculo";
import VehicleDetail from "./paginas/VehicleDetail";
import Lixeira from "./paginas/Lixeira";

import Releases from "./paginas/Releases";
import AuctionRelease from "./paginas/AuctionRelease";
import JudicialRetrieval from "./paginas/JudicialRetrieval";
import OtherDestinations from "./paginas/OtherDestinations";

import Analysis from "./paginas/Analysis";
import Financial from "./paginas/Financial";
import PagamentosDiarias from "./paginas/PagamentosDiarias";
import Reports from "./paginas/Reports";

import Documents from "./paginas/Documents";
import Notifications from "./paginas/Notifications";
import ConsultaCNPJ from "./paginas/ConsultaCNPJ";
import Contratos from "./paginas/Contratos";

import Manuals from "./paginas/Manuals";
import FAQ from "./paginas/FAQ";

import Admin from "./paginas/Admin";
import Patios from "./paginas/Patios";
import Profile from "./paginas/Profile";

// =======================================================
// APP
// =======================================================

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>

        {/* =================================================
            ROTAS PÚBLICAS
        ================================================== */}

        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/landing"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/confirm-email"
          element={<ConfirmEmail />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/oauth-consent"
          element={<OAuthConsent />}
        />

        {/* =================================================
            ÁREA PROTEGIDA
        ================================================== */}

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >

          {/* ===============================================
              DASHBOARD
          ================================================ */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute permissao="dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              VEÍCULOS
          ================================================ */}

          <Route
            path="/vehicles"
            element={
              <ProtectedRoute permissao="vehicles">
                <Vehicles />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles/new"
            element={
              <ProtectedRoute permissao="cadastrar_veiculo">
                <CadastrarVeiculo />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles/:id"
            element={
              <ProtectedRoute permissao="vehicles">
                <VehicleDetail />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              LIXEIRA
          ================================================ */}

          <Route
            path="/lixeira"
            element={
              <ProtectedRoute permissao="excluir_veiculo">
                <Lixeira />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              VEÍCULOS LIBERADOS
          ================================================ */}

          <Route
            path="/releases"
            element={
              <ProtectedRoute permissao="releases">
                <Releases />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              LEILÃO
          ================================================ */}

          <Route
            path="/auction-release"
            element={
              <ProtectedRoute permissao="auction">
                <AuctionRelease />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              RETIRADA JUDICIAL
          ================================================ */}

          <Route
            path="/judicial-retrieval"
            element={
              <ProtectedRoute permissao="judicial">
                <JudicialRetrieval />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              OUTROS DESTINOS
          ================================================ */}

          <Route
            path="/other-destinations"
            element={
              <ProtectedRoute permissao="other_destinations">
                <OtherDestinations />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              ANÁLISE
          ================================================ */}

          <Route
            path="/analysis"
            element={
              <ProtectedRoute permissao="analysis">
                <Analysis />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              FINANCEIRO
          ================================================ */}

          <Route
            path="/financial"
            element={
              <ProtectedRoute permissao="financial">
                <Financial />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              COBRANÇAS E PAGAMENTOS DE DIÁRIAS
          ================================================ */}

          <Route
            path="/pagamentos-diarias"
            element={
              <ProtectedRoute permissao="financial">
                <PagamentosDiarias />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              RELATÓRIOS
          ================================================ */}

          <Route
            path="/reports"
            element={
              <ProtectedRoute permissao="reports">
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              DOCUMENTOS
          ================================================ */}

          <Route
            path="/documents"
            element={
              <ProtectedRoute permissao="documents">
                <Documents />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              NOTIFICAÇÕES
          ================================================ */}

          <Route
            path="/notifications"
            element={
              <ProtectedRoute permissao="notifications">
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              CONSULTA CNPJ
          ================================================ */}

          <Route
            path="/consulta-cnpj"
            element={
              <ProtectedRoute permissao="consulta_cnpj">
                <ConsultaCNPJ />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              CONTRATOS E TARIFAS
          ================================================ */}

          <Route
            path="/contratos"
            element={
              <ProtectedRoute permissao="contratos">
                <Contratos />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              MANUAIS
          ================================================ */}

          <Route
            path="/manuals"
            element={
              <ProtectedRoute permissao="manuals">
                <Manuals />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              FAQ
          ================================================ */}

          <Route
            path="/faq"
            element={<FAQ />}
          />

          {/* ===============================================
              ADMINISTRAÇÃO
          ================================================ */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute permissao="admin">
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              PÁTIOS
          ================================================ */}

          <Route
            path="/patios"
            element={
              <ProtectedRoute permissao="admin">
                <Patios />
              </ProtectedRoute>
            }
          />

          {/* ===============================================
              PERFIL
          ================================================ */}

          <Route
            path="/profile"
            element={<Profile />}
          />

        </Route>

        {/* =================================================
            PÁGINA NÃO ENCONTRADA
        ================================================== */}

        <Route
          path="*"
          element={<PageNotFound />}
        />

      </Routes>
    </BrowserRouter>
  );
}