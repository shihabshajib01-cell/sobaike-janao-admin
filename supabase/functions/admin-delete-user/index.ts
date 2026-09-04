import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DeleteUserRequestBody {
  user_id?: string;
  target_user_id?: string;
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate environment configuration
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables in admin-delete-user Edge Function.");
      return new Response(
        JSON.stringify({
          error: "Edge Function is misconfigured. Missing server-side credentials.",
          code: "CONFIG_ERROR",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Extract and verify caller Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required.", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client representing the caller (with their JWT)
    const supabaseCaller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user: callerUser }, error: callerAuthError } = await supabaseCaller.auth.getUser();
    if (callerAuthError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session.", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verify caller authorization: must have 'admin_users.manage' or be Super Admin
    const { data: hasManagePermission, error: permError } = await supabaseCaller.rpc(
      "has_permission",
      { p_permission_id: "admin_users.manage" }
    );

    if (permError || !hasManagePermission) {
      return new Response(
        JSON.stringify({
          error: "Access denied. User management authorization required.",
          code: "FORBIDDEN",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Parse and validate request body
    const body: DeleteUserRequestBody = await req.json().catch(() => ({}));
    const targetUserId = (body.user_id || body.target_user_id || "").trim();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!targetUserId || !uuidRegex.test(targetUserId)) {
      return new Response(
        JSON.stringify({ error: "A valid target user ID is required.", code: "INVALID_USER_ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Enforce self-deletion prevention early
    if (targetUserId === callerUser.id) {
      return new Response(
        JSON.stringify({
          error: "Self-deletion is not permitted. Administrators cannot delete their own accounts.",
          code: "CANNOT_DELETE_SELF",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Execute authoritative deletion RPC using caller client
    // This acquires the transaction advisory lock, enforces delegation ceiling,
    // verifies target is not Super Admin, prevents deletion of last role manager,
    // deletes membership and role, and records ADMIN_USER_DELETED audit event.
    const { data: rpcData, error: rpcError } = await supabaseCaller.rpc(
      "admin_delete_user",
      { p_target_user_id: targetUserId }
    );

    if (rpcError) {
      console.error(`admin_delete_user RPC failed for user ${targetUserId}:`, rpcError);
      let status = 400;
      let code = rpcError.code || "DELETE_FAILED";

      if (rpcError.code === "42501") {
        status = 403;
      } else if (rpcError.code === "P0002") {
        status = 404;
      } else if (rpcError.code === "23514") {
        status = 409;
      }

      return new Response(
        JSON.stringify({
          error: rpcError.message || "Failed to delete administrator.",
          code,
          details: rpcError.details,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Revoke and permanently delete auth account via service-role Admin API
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (deleteAuthError) {
        console.warn(
          `Auth user cleanup returned warning for user ${targetUserId} (profile already removed):`,
          deleteAuthError
        );
      }
    } catch (authErr) {
      console.warn(`Auth deleteUser threw for user ${targetUserId} (profile already removed):`, authErr);
    }

    // 9. Return clean success response
    return new Response(
      JSON.stringify({
        success: true,
        deleted_user_id: targetUserId,
        email: rpcData?.email,
        display_name: rpcData?.display_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Unexpected Edge Function error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
