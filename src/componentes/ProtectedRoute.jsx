import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../biblioteca/AuthContext";
import { setAuthReturnTo } from "../biblioteca/authReturnTo";

export default function ProtectedRoute({
  children,
  permissao = null,
}) {
  const {
    isAuthenticated,
    temPermissao,
    isMaster,
    loading,
  } = useAuth();

  const location = useLocation();

  // =====================================================
  // AGUARDAR SUPABASE RESTAURAR A SESSÃO
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 font-semibold text-slate-500">
            Verificando acesso...
          </p>

        </div>
      </div>
    );
  }

  // =====================================================
  // USUÁRIO NÃO ESTÁ LOGADO
  // =====================================================

  if (!isAuthenticated) {
    setAuthReturnTo(
      location.pathname
    );

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // =====================================================
  // VERIFICAR PERMISSÃO DA PÁGINA
  // =====================================================

  if (permissao) {
    const autorizado =
      isMaster ||
      temPermissao(permissao);

    if (!autorizado) {
      return (
        <Navigate
          to="/profile"
          replace
        />
      );
    }
  }

  // =====================================================
  // ACESSO AUTORIZADO
  // =====================================================

  return children;
}