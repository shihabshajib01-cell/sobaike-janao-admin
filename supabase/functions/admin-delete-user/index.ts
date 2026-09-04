import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DeleteUserRequestBody {
  user_id: string;
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
      console.error("Missing Supabase environment variables in Edge Function.");
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
    const body: DeleteUserRequestBody = await req.json();
    const cleanUserId = (body.user_id || "").trim().toLowerCase();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!cleanUserId || !uuidRegex.test(cleanUserId)) {
      return new Response(
        JSON.stringify({ error: "A valid user ID is required.", code: "INVALID_USER_ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Block self-deletion
    if (callerUser.id.toLowerCase() === cleanUserId) {
      return new Response(
        JSON.stringify({
          error: "You cannot delete your own administrative account.",
          code: "CANNOT_DELETE_SELF",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create server-side service role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 7. Verify target administrator exists and check Super Admin status
    const { data: targetAdmin, error: targetQueryError } = await supabaseAdmin
      .from("admin_users")
      .select("user_id, is_super_admin, display_name")
      .eq("user_id", cleanUserId)
      .maybeSingle();

    if (targetQueryError) {
      console.error("Error querying target admin user:", targetQueryError);
      return new Response(
        JSON.stringify({ error: "Failed to query administrator details.", code: "DB_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetAdmin) {
      return new Response(
        JSON.stringify({ error: "Administrator account not found.", code: "USER_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Super Admin deletion protection
    if (targetAdmin.is_super_admin) {
      return new Response(
        JSON.stringify({
          error: "Protected system account: Super Administrator cannot be deleted.",
          code: "SUPER_ADMIN_CANNOT_BE_DELETED",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Enforce delegation ceiling: caller cannot delete a user with higher or unassigned scope
    const { data: canManageTarget, error: ceilingError } = await supabaseCaller.rpc(
      "can_manage_user_target",
      { p_target_user_id: cleanUserId }
    );

    if (ceilingError || !canManageTarget) {
      return new Response(
        JSON.stringify({
          error: "Access denied. You cannot manage or delete an administrator with permissions that you do not possess.",
          code: "FORBIDDEN",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Fetch target email and role for audit log details
    let targetEmail: string | null = null;
    try {
      const { data: targetAuthUser } = await supabaseAdmin.auth.admin.getUserById(cleanUserId);
      if (targetAuthUser?.user?.email) {
        targetEmail = targetAuthUser.user.email;
      }
    } catch (e) {
      console.warn("Could not retrieve auth email for audit log:", e);
    }

    let previousRoleId: string | null = null;
    try {
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role_id")
        .eq("user_id", cleanUserId)
        .maybeSingle();
      if (roleRow?.role_id) {
        previousRoleId = roleRow.role_id;
      }
    } catch (e) {
      console.warn("Could not retrieve role_id for audit log:", e);
    }

    // 11. Record audit event: ADMIN_USER_DELETED
    try {
      await supabaseCaller.rpc("log_role_audit_event", {
        p_action: "ADMIN_USER_DELETED",
        p_target_id: cleanUserId,
        p_details: {
          target_user_id: cleanUserId,
          display_name: targetAdmin.display_name,
          email: targetEmail,
          previous_role_id: previousRoleId,
        },
      });
    } catch (auditErr) {
      console.warn("Audit logging warning during user deletion:", auditErr);
    }

    // 12. Delete Auth user via Admin API (cascades admin_users and user_roles via FK)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(cleanUserId);
    if (deleteAuthError) {
      console.error("Auth user deletion failed:", deleteAuthError);
      return new Response(
        JSON.stringify({
          error: deleteAuthError.message || "Failed to delete authentication user.",
          code: "AUTH_DELETION_FAILED",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Explicit cleanup safeguard (in case cascade was not immediate or FK was modified)
    try {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", cleanUserId);
      await supabaseAdmin.from("admin_users").delete().eq("user_id", cleanUserId);
    } catch (cleanupErr) {
      console.warn("Explicit table cleanup safeguard warning:", cleanupErr);
    }

    // 13. Return clean success response
    return new Response(
      JSON.stringify({
        success: true,
        user_id: cleanUserId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Unexpected Edge Function error in admin-delete-user:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
