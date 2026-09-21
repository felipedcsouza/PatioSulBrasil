import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function resposta(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}

export default {
  async fetch(req: Request) {
    // =====================================================
    // CORS
    // =====================================================

    if (req.method === "OPTIONS") {
      return new Response(
        "ok",
        {
          headers: corsHeaders,
        }
      );
    }

    // =====================================================
    // SOMENTE POST
    // =====================================================

    if (req.method !== "POST") {
      return resposta(
        {
          error:
            "Método não permitido.",
        },
        405
      );
    }

    try {
      // ===================================================
      // VARIÁVEIS DO SUPABASE
      // ===================================================

      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL"
        );

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY"
        );

      if (
        !supabaseUrl ||
        !serviceRoleKey
      ) {
        return resposta(
          {
            error:
              "Configuração interna do Supabase incompleta.",
          },
          500
        );
      }

      // ===================================================
      // PEGAR TOKEN
      // ===================================================

      const authHeader =
        req.headers.get(
          "Authorization"
        );

      if (!authHeader) {
        return resposta(
          {
            error:
              "Usuário não autenticado.",
          },
          401
        );
      }

      const token =
        authHeader.replace(
          "Bearer ",
          ""
        );

      if (!token) {
        return resposta(
          {
            error:
              "Token de autenticação inválido.",
          },
          401
        );
      }

      // ===================================================
      // CLIENTE ADMINISTRATIVO
      // ===================================================

      const adminClient =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken:
                false,

              persistSession:
                false,
            },
          }
        );

      // ===================================================
      // DESCOBRIR QUEM ESTÁ LOGADO
      // ===================================================

      const {
        data: dadosUsuario,
        error:
          erroUsuario,
      } =
        await adminClient.auth.getUser(
          token
        );

      if (
        erroUsuario ||
        !dadosUsuario?.user
      ) {
        return resposta(
          {
            error:
              "Sessão inválida ou expirada.",
          },
          401
        );
      }

      const usuarioLogado =
        dadosUsuario.user;

      // ===================================================
      // VERIFICAR SE É MASTER
      // ===================================================

      const {
        data: perfil,
        error: erroPerfil,
      } =
        await adminClient
          .from("profiles")
          .select(
            "id, nome, email, cargo, status"
          )
          .eq(
            "id",
            usuarioLogado.id
          )
          .single();

      if (erroPerfil) {
        console.error(
          "Erro ao buscar perfil:",
          erroPerfil
        );

        return resposta(
          {
            error:
              "Não foi possível verificar as permissões do usuário.",
          },
          500
        );
      }

      if (
        perfil?.cargo !==
          "MASTER" ||
        perfil?.status !==
          "APROVADO"
      ) {
        return resposta(
          {
            error:
              "Somente usuários MASTER podem apagar contas.",
          },
          403
        );
      }

      // ===================================================
      // LER CORPO DA REQUISIÇÃO
      // ===================================================

      let corpo: {
        user_id?: string;
      };

      try {
        corpo =
          await req.json();
      } catch {
        return resposta(
          {
            error:
              "Dados enviados são inválidos.",
          },
          400
        );
      }

      const userId =
        corpo.user_id;

      if (!userId) {
        return resposta(
          {
            error:
              "ID do usuário não informado.",
          },
          400
        );
      }

      // ===================================================
      // NÃO APAGAR A PRÓPRIA CONTA
      // ===================================================

      if (
        userId ===
        usuarioLogado.id
      ) {
        return resposta(
          {
            error:
              "Você não pode apagar sua própria conta MASTER.",
          },
          403
        );
      }

      // ===================================================
      // VERIFICAR SE O USUÁRIO EXISTE
      // ===================================================

      const {
        data:
          usuarioParaExcluir,
        error:
          erroBuscaUsuario,
      } =
        await adminClient.auth.admin.getUserById(
          userId
        );

      if (
        erroBuscaUsuario ||
        !usuarioParaExcluir?.user
      ) {
        return resposta(
          {
            error:
              "Usuário não encontrado.",
          },
          404
        );
      }

      // ===================================================
      // APAGAR CONTA DO AUTH
      // ===================================================

      const {
        error:
          erroExcluir,
      } =
        await adminClient.auth.admin.deleteUser(
          userId
        );

      if (erroExcluir) {
        console.error(
          "Erro ao excluir:",
          erroExcluir
        );

        return resposta(
          {
            error:
              erroExcluir.message ||
              "Não foi possível apagar a conta.",
          },
          500
        );
      }

      // ===================================================
      // SUCESSO
      // ===================================================

      return resposta(
        {
          success: true,

          message:
            "Conta apagada definitivamente com sucesso.",

          user_id:
            userId,
        },
        200
      );
    } catch (error) {
      console.error(
        "Erro inesperado:",
        error
      );

      return resposta(
        {
          error:
            error instanceof Error
              ? error.message
              : "Erro interno do servidor.",
        },
        500
      );
    }
  },
};