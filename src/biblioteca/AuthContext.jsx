import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../API/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // BUSCAR PERFIL DO USUÁRIO
  // =====================================================

  async function buscarPerfil(userId) {
    if (!userId) {
      setPerfil(null);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        nome,
        email,
        status,
        cargo,
        permissoes,
        patio_id,
        created_at,
        updated_at
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Erro ao buscar perfil:",
        error
      );

      throw new Error(
        error.message ||
          "Não foi possível carregar o perfil do usuário."
      );
    }

    if (!data) {
      return null;
    }

    setPerfil(data);

    return data;
  }

  // =====================================================
  // VALIDAR ACESSO
  // =====================================================

  async function validarAcesso(usuario) {
    const dadosPerfil =
      await buscarPerfil(usuario.id);

    if (!dadosPerfil) {
      await supabase.auth.signOut();

      setUser(null);
      setPerfil(null);

      throw new Error(
        "Seu perfil de acesso ainda não foi criado."
      );
    }

    // ===================================================
    // CONTA AGUARDANDO APROVAÇÃO
    // ===================================================

    if (
      dadosPerfil.status === "PENDENTE"
    ) {
      await supabase.auth.signOut();

      setUser(null);
      setPerfil(null);

      throw new Error(
        "Sua conta está aguardando aprovação do administrador."
      );
    }

    // ===================================================
    // CONTA BLOQUEADA
    // ===================================================

    if (
      dadosPerfil.status === "BLOQUEADO"
    ) {
      await supabase.auth.signOut();

      setUser(null);
      setPerfil(null);

      throw new Error(
        "Sua conta está bloqueada. Procure o administrador do sistema."
      );
    }

    // ===================================================
    // QUALQUER OUTRO STATUS NÃO AUTORIZADO
    // ===================================================

    if (
      dadosPerfil.status !== "APROVADO"
    ) {
      await supabase.auth.signOut();

      setUser(null);
      setPerfil(null);

      throw new Error(
        "Sua conta não está autorizada a acessar o sistema."
      );
    }

    // ===================================================
    // VALIDAR PÁTIO
    // ===================================================

    const usuarioEhMaster =
      dadosPerfil.cargo === "MASTER";

    if (
      !usuarioEhMaster &&
      !dadosPerfil.patio_id
    ) {
      await supabase.auth.signOut();

      setUser(null);
      setPerfil(null);

      throw new Error(
        "Sua conta ainda não está vinculada a um pátio. Entre em contato com o administrador."
      );
    }

    // ===================================================
    // USUÁRIO LIBERADO
    // ===================================================

    setUser(usuario);
    setPerfil(dadosPerfil);

    return {
      user: usuario,
      perfil: dadosPerfil,
    };
  }

  // =====================================================
  // RESTAURAR LOGIN SALVO
  // =====================================================

  useEffect(() => {
    let ativo = true;

    async function iniciarSessao() {
      try {
        setLoading(true);

        const {
          data: { session },
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        // Não existe login salvo
        if (!session?.user) {
          if (!ativo) {
            return;
          }

          setUser(null);
          setPerfil(null);

          return;
        }

        const usuario =
          session.user;

        // =================================================
        // BUSCAR PERFIL DA SESSÃO SALVA
        // =================================================

        const {
          data,
          error: perfilError,
        } =
          await supabase
            .from("profiles")
            .select(`
              id,
              nome,
              email,
              status,
              cargo,
              permissoes,
              patio_id,
              created_at,
              updated_at
            `)
            .eq("id", usuario.id)
            .maybeSingle();

        if (perfilError) {
          throw perfilError;
        }

        if (!ativo) {
          return;
        }

        // =================================================
        // PERFIL INEXISTENTE
        // =================================================

        if (!data) {
          await supabase.auth.signOut();

          setUser(null);
          setPerfil(null);

          return;
        }

        // =================================================
        // SOMENTE USUÁRIO APROVADO
        // =================================================

        if (
          data.status !== "APROVADO"
        ) {
          await supabase.auth.signOut();

          setUser(null);
          setPerfil(null);

          return;
        }

        // =================================================
        // USUÁRIO COMUM PRECISA TER PÁTIO
        // MASTER POSSUI ACESSO GLOBAL
        // =================================================

        const usuarioEhMaster =
          data.cargo === "MASTER";

        if (
          !usuarioEhMaster &&
          !data.patio_id
        ) {
          await supabase.auth.signOut();

          setUser(null);
          setPerfil(null);

          return;
        }

        // =================================================
        // RESTAURAR USUÁRIO
        // =================================================

        setUser(usuario);
        setPerfil(data);
      } catch (error) {
        console.error(
          "Erro ao restaurar sessão:",
          error
        );

        if (ativo) {
          setUser(null);
          setPerfil(null);
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    iniciarSessao();

    // ===================================================
    // OBSERVAR ALTERAÇÕES NA AUTENTICAÇÃO
    // ===================================================

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!ativo) {
            return;
          }

          if (
            event === "SIGNED_OUT" ||
            !session?.user
          ) {
            setUser(null);
            setPerfil(null);

            return;
          }

          setUser(session.user);
        }
      );

    return () => {
      ativo = false;

      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================

  async function login({
    email,
    password,
  }) {
    try {
      setLoading(true);

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        const mensagem =
          error.message
            ?.toLowerCase() || "";

        // =================================================
        // E-MAIL OU SENHA INCORRETOS
        // =================================================

        if (
          mensagem.includes(
            "invalid login credentials"
          )
        ) {
          throw new Error(
            "E-mail ou senha incorretos."
          );
        }

        // =================================================
        // E-MAIL NÃO CONFIRMADO
        // =================================================

        if (
          mensagem.includes(
            "email not confirmed"
          )
        ) {
          throw new Error(
            "Seu e-mail ainda não foi confirmado."
          );
        }

        throw error;
      }

      if (!data?.user) {
        throw new Error(
          "Não foi possível autenticar o usuário."
        );
      }

      return await validarAcesso(
        data.user
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async function logout() {
    try {
      setLoading(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );

      throw error;
    } finally {
      setUser(null);
      setPerfil(null);
      setLoading(false);
    }
  }

  // =====================================================
  // ATUALIZAR PERFIL
  // =====================================================

  async function refreshPerfil() {
    if (!user?.id) {
      setPerfil(null);

      return null;
    }

    return await buscarPerfil(
      user.id
    );
  }

  // =====================================================
  // VERIFICAR PERMISSÃO
  // =====================================================

  function temPermissao(
    permissao
  ) {
    if (!perfil) {
      return false;
    }

    // ===================================================
    // MASTER PODE ACESSAR TUDO
    // ===================================================

    if (
      perfil.status === "APROVADO" &&
      perfil.cargo === "MASTER"
    ) {
      return true;
    }

    // ===================================================
    // CONTA NÃO APROVADA
    // ===================================================

    if (
      perfil.status !== "APROVADO"
    ) {
      return false;
    }

    // ===================================================
    // VERIFICAR ARRAY DE PERMISSÕES
    // ===================================================

    if (
      !Array.isArray(
        perfil.permissoes
      )
    ) {
      return false;
    }

    return perfil.permissoes.includes(
      permissao
    );
  }

  // =====================================================
  // VERIFICAR SE USUÁRIO PERTENCE AO PÁTIO
  // =====================================================

  function pertenceAoPatio(
    patioId
  ) {
    if (!perfil) {
      return false;
    }

    // MASTER possui acesso a todos os pátios
    if (
      perfil.status === "APROVADO" &&
      perfil.cargo === "MASTER"
    ) {
      return true;
    }

    if (!perfil.patio_id) {
      return false;
    }

    return (
      String(perfil.patio_id) ===
      String(patioId)
    );
  }

  // =====================================================
  // ESTADOS AUXILIARES
  // =====================================================

  const isAuthenticated =
    Boolean(user) &&
    perfil?.status ===
      "APROVADO";

  const isMaster =
    perfil?.status ===
      "APROVADO" &&
    perfil?.cargo ===
      "MASTER";

  const patioId =
    isMaster
      ? null
      : perfil?.patio_id ||
        null;

  // =====================================================
  // CONTEXTO
  // =====================================================

  const value = useMemo(
    () => ({
      // Usuário autenticado
      user,

      // Perfil completo do banco
      perfil,

      // Pátio atual
      patioId,

      // Funções de autenticação
      login,
      logout,

      // Atualizar perfil
      refreshPerfil,

      // Permissões
      temPermissao,

      // Controle de pátio
      pertenceAoPatio,

      // Estados
      isAuthenticated,
      isMaster,

      // Loading
      loading,

      // Compatibilidade com outros componentes
      carregando: loading,
      isLoading: loading,
    }),
    [
      user,
      perfil,
      patioId,
      loading,
      isAuthenticated,
      isMaster,
    ]
  );

  // =====================================================
  // PROVIDER
  // =====================================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =======================================================
// HOOK useAuth
// =======================================================

export function useAuth() {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth deve ser usado dentro de AuthProvider"
    );
  }

  return ctx;
}