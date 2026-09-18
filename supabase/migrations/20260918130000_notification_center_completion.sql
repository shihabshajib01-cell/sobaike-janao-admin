-- =============================================================================
-- Notification Center Completion
-- Restores complaint submission alerts, enables Realtime delivery, moves the
-- Security filter server-side, and adds oversight events for newer Admin CMS
-- configuration workflows.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extend the canonical event catalogue for current Admin configuration work.
-- -----------------------------------------------------------------------------
INSERT INTO public.admin_notification_event_catalogue (
  event_key,
  category,
  default_layer,
  default_severity,
  description,
  active
)
VALUES
  ('taxonomy.category_created', 'administration', 'administrative_oversight', 'info', 'Admin category created', true),
  ('taxonomy.category_published', 'administration', 'administrative_oversight', 'info', 'Admin category published', true),
  ('taxonomy.subcategory_created', 'administration', 'administrative_oversight', 'info', 'Admin subcategory created', true),
  ('taxonomy.subcategory_published', 'administration', 'administrative_oversight', 'info', 'Admin subcategory published', true),
  ('taxonomy.subcategory_moved', 'administration', 'administrative_oversight', 'info', 'Admin subcategory moved to another category', true),
  ('reporting_form.published', 'administration', 'administrative_oversight', 'info', 'Reporting form schema published', true),
  ('banner.published', 'administration', 'administrative_oversight', 'info', 'Site banner published', true)
ON CONFLICT (event_key) DO UPDATE
SET category = EXCLUDED.category,
    default_layer = EXCLUDED.default_layer,
    default_severity = EXCLUDED.default_severity,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. Restore complaint.submitted at the data boundary.
-- This trigger covers the legacy, v2 and schema-driven public submission RPCs,
-- plus any future valid insertion path that creates a submitted complaint.
-- Notification failure must never fail the citizen's complaint submission.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_notify_complaint_submitted_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status = 'submitted' THEN
    BEGIN
      PERFORM public.admin_emit_notification(
        p_event_key := 'complaint.submitted',
        p_title_en := 'New complaint submitted: ' || NEW.id,
        p_title_bn := 'নতুন অভিযোগ জমা হয়েছে: ' || NEW.id,
        p_body_en := 'A new citizen complaint is ready for administrative review.',
        p_body_bn := 'একটি নতুন নাগরিক অভিযোগ প্রশাসনিক পর্যালোচনার জন্য প্রস্তুত।',
        p_actor_user_id := NULL,
        p_target_type := 'complaint',
        p_target_id := NEW.id,
        p_target_label := NEW.id,
        p_metadata := jsonb_build_object(
          'complaint_id', NEW.id,
          'segment_id', NEW.segment_id,
          'subcategory_id', NEW.subcategory_id,
          'status', NEW.status,
          'created_at', NEW.created_at
        ),
        p_required_all_permissions := ARRAY['complaints.view'],
        p_required_any_permissions := '{}'::text[],
        p_audience_mode := 'permission',
        p_route := '/complaints/' || NEW.id,
        p_dedupe_key := 'complaint.submitted:' || NEW.id,
        p_exclude_actor := false,
        p_include_super_admin := true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Notification emission failed for complaint.submitted (%): %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_notify_complaint_submitted ON public.complaints;
CREATE TRIGGER trg_admin_notify_complaint_submitted
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.admin_notify_complaint_submitted_trigger();

REVOKE ALL ON FUNCTION public.admin_notify_complaint_submitted_trigger() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Configuration oversight events for the expanded Admin CMS.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_notify_taxonomy_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_name_en TEXT;
  v_name_bn TEXT;
BEGIN
  IF TG_TABLE_NAME = 'segments' THEN
    v_name_en := COALESCE(NULLIF(NEW.name_en, ''), NEW.id);
    v_name_bn := COALESCE(NULLIF(NEW.name_bn, ''), NEW.id);

    IF TG_OP = 'INSERT' THEN
      BEGIN
        PERFORM public.admin_emit_notification(
          p_event_key := 'taxonomy.category_created',
          p_title_en := 'Category created: ' || v_name_en,
          p_title_bn := 'ক্যাটাগরি তৈরি হয়েছে: ' || v_name_bn,
          p_body_en := 'A new reporting category was created in Admin.',
          p_body_bn := 'অ্যাডমিনে একটি নতুন রিপোর্টিং ক্যাটাগরি তৈরি করা হয়েছে।',
          p_actor_user_id := v_actor,
          p_target_type := NULL,
          p_target_id := NEW.id,
          p_target_label := v_name_en,
          p_metadata := jsonb_build_object('category_id', NEW.id, 'config_status', NEW.config_status),
          p_required_all_permissions := ARRAY['categories.manage'],
          p_required_any_permissions := '{}'::text[],
          p_audience_mode := 'permission',
          p_route := '/categories',
          p_dedupe_key := 'taxonomy.category_created:' || NEW.id,
          p_exclude_actor := true,
          p_include_super_admin := true
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification emission failed for taxonomy.category_created (%): %', NEW.id, SQLERRM;
      END;
    ELSIF TG_OP = 'UPDATE'
      AND NEW.config_status = 'published'
      AND (
        OLD.config_status IS DISTINCT FROM 'published'
        OR OLD.active IS DISTINCT FROM true
      )
    THEN
      BEGIN
        PERFORM public.admin_emit_notification(
          p_event_key := 'taxonomy.category_published',
          p_title_en := 'Category published: ' || v_name_en,
          p_title_bn := 'ক্যাটাগরি প্রকাশিত হয়েছে: ' || v_name_bn,
          p_body_en := 'A reporting category is now active on the public platform.',
          p_body_bn := 'একটি রিপোর্টিং ক্যাটাগরি এখন পাবলিক প্ল্যাটফর্মে সক্রিয়।',
          p_actor_user_id := v_actor,
          p_target_type := NULL,
          p_target_id := NEW.id,
          p_target_label := v_name_en,
          p_metadata := jsonb_build_object('category_id', NEW.id, 'active', NEW.active, 'config_status', NEW.config_status),
          p_required_all_permissions := ARRAY['categories.manage'],
          p_required_any_permissions := '{}'::text[],
          p_audience_mode := 'permission',
          p_route := '/categories',
          p_dedupe_key := 'taxonomy.category_published:' || NEW.id || ':' || COALESCE(NEW.updated_at::text, now()::text),
          p_exclude_actor := true,
          p_include_super_admin := true
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification emission failed for taxonomy.category_published (%): %', NEW.id, SQLERRM;
      END;
    END IF;

    RETURN NEW;
  END IF;

  -- subcategories
  v_name_en := COALESCE(NULLIF(NEW.name_en, ''), NEW.id);
  v_name_bn := COALESCE(NULLIF(NEW.name_bn, ''), NEW.id);

  IF TG_OP = 'INSERT' THEN
    BEGIN
      PERFORM public.admin_emit_notification(
        p_event_key := 'taxonomy.subcategory_created',
        p_title_en := 'Subcategory created: ' || v_name_en,
        p_title_bn := 'সাবক্যাটাগরি তৈরি হয়েছে: ' || v_name_bn,
        p_body_en := 'A new reporting subcategory was created in Admin.',
        p_body_bn := 'অ্যাডমিনে একটি নতুন রিপোর্টিং সাবক্যাটাগরি তৈরি করা হয়েছে।',
        p_actor_user_id := v_actor,
        p_target_type := NULL,
        p_target_id := NEW.id,
        p_target_label := v_name_en,
        p_metadata := jsonb_build_object('subcategory_id', NEW.id, 'category_id', NEW.segment_id),
        p_required_all_permissions := ARRAY['categories.manage'],
        p_required_any_permissions := '{}'::text[],
        p_audience_mode := 'permission',
        p_route := '/categories',
        p_dedupe_key := 'taxonomy.subcategory_created:' || NEW.id,
        p_exclude_actor := true,
        p_include_super_admin := true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Notification emission failed for taxonomy.subcategory_created (%): %', NEW.id, SQLERRM;
    END;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.segment_id IS DISTINCT FROM OLD.segment_id THEN
      BEGIN
        PERFORM public.admin_emit_notification(
          p_event_key := 'taxonomy.subcategory_moved',
          p_title_en := 'Subcategory moved: ' || v_name_en,
          p_title_bn := 'সাবক্যাটাগরি স্থানান্তর হয়েছে: ' || v_name_bn,
          p_body_en := 'A reporting subcategory was moved to another category.',
          p_body_bn := 'একটি রিপোর্টিং সাবক্যাটাগরি অন্য ক্যাটাগরিতে স্থানান্তর করা হয়েছে।',
          p_actor_user_id := v_actor,
          p_target_type := NULL,
          p_target_id := NEW.id,
          p_target_label := v_name_en,
          p_metadata := jsonb_build_object(
            'subcategory_id', NEW.id,
            'previous_category_id', OLD.segment_id,
            'category_id', NEW.segment_id
          ),
          p_required_all_permissions := ARRAY['categories.manage'],
          p_required_any_permissions := '{}'::text[],
          p_audience_mode := 'permission',
          p_route := '/categories',
          p_dedupe_key := 'taxonomy.subcategory_moved:' || NEW.id || ':' || OLD.segment_id || ':' || NEW.segment_id || ':' || COALESCE(NEW.updated_at::text, now()::text),
          p_exclude_actor := true,
          p_include_super_admin := true
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification emission failed for taxonomy.subcategory_moved (%): %', NEW.id, SQLERRM;
      END;
    END IF;

    IF NEW.config_status = 'published'
      AND (
        OLD.config_status IS DISTINCT FROM 'published'
        OR OLD.active IS DISTINCT FROM true
      )
    THEN
      BEGIN
        PERFORM public.admin_emit_notification(
          p_event_key := 'taxonomy.subcategory_published',
          p_title_en := 'Subcategory published: ' || v_name_en,
          p_title_bn := 'সাবক্যাটাগরি প্রকাশিত হয়েছে: ' || v_name_bn,
          p_body_en := 'A reporting subcategory is now active on the public platform.',
          p_body_bn := 'একটি রিপোর্টিং সাবক্যাটাগরি এখন পাবলিক প্ল্যাটফর্মে সক্রিয়।',
          p_actor_user_id := v_actor,
          p_target_type := NULL,
          p_target_id := NEW.id,
          p_target_label := v_name_en,
          p_metadata := jsonb_build_object('subcategory_id', NEW.id, 'category_id', NEW.segment_id),
          p_required_all_permissions := ARRAY['categories.manage'],
          p_required_any_permissions := '{}'::text[],
          p_audience_mode := 'permission',
          p_route := '/categories',
          p_dedupe_key := 'taxonomy.subcategory_published:' || NEW.id || ':' || COALESCE(NEW.updated_at::text, now()::text),
          p_exclude_actor := true,
          p_include_super_admin := true
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification emission failed for taxonomy.subcategory_published (%): %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_notify_segments ON public.segments;
CREATE TRIGGER trg_admin_notify_segments
AFTER INSERT OR UPDATE ON public.segments
FOR EACH ROW
EXECUTE FUNCTION public.admin_notify_taxonomy_trigger();

DROP TRIGGER IF EXISTS trg_admin_notify_subcategories ON public.subcategories;
CREATE TRIGGER trg_admin_notify_subcategories
AFTER INSERT OR UPDATE ON public.subcategories
FOR EACH ROW
EXECUTE FUNCTION public.admin_notify_taxonomy_trigger();

REVOKE ALL ON FUNCTION public.admin_notify_taxonomy_trigger() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_notify_reporting_form_published_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    BEGIN
      PERFORM public.admin_emit_notification(
        p_event_key := 'reporting_form.published',
        p_title_en := 'Reporting form published: ' || NEW.scope_id,
        p_title_bn := 'রিপোর্টিং ফর্ম প্রকাশিত হয়েছে: ' || NEW.scope_id,
        p_body_en := 'A new reporting form version is now active for public submissions.',
        p_body_bn := 'পাবলিক সাবমিশনের জন্য রিপোর্টিং ফর্মের একটি নতুন সংস্করণ এখন সক্রিয়।',
        p_actor_user_id := COALESCE(NEW.published_by, auth.uid()),
        p_target_type := NULL,
        p_target_id := NEW.scope_id,
        p_target_label := NEW.scope_id,
        p_metadata := jsonb_build_object(
          'schema_id', NEW.id,
          'scope_type', NEW.scope_type,
          'scope_id', NEW.scope_id,
          'version', NEW.version,
          'engine_mode', NEW.engine_mode
        ),
        p_required_all_permissions := ARRAY['categories.manage'],
        p_required_any_permissions := '{}'::text[],
        p_audience_mode := 'permission',
        p_route := '/categories',
        p_dedupe_key := 'reporting_form.published:' || NEW.id::text,
        p_exclude_actor := true,
        p_include_super_admin := true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Notification emission failed for reporting_form.published (%): %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_notify_reporting_form_published ON public.reporting_form_schemas;
CREATE TRIGGER trg_admin_notify_reporting_form_published
AFTER UPDATE ON public.reporting_form_schemas
FOR EACH ROW
EXECUTE FUNCTION public.admin_notify_reporting_form_published_trigger();

REVOKE ALL ON FUNCTION public.admin_notify_reporting_form_published_trigger() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_notify_banner_published_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.published_at IS NOT NULL
     AND NEW.published_at IS DISTINCT FROM OLD.published_at
     AND NEW.published_content IS DISTINCT FROM OLD.published_content
  THEN
    BEGIN
      PERFORM public.admin_emit_notification(
        p_event_key := 'banner.published',
        p_title_en := 'Banner published: ' || NEW.category_key,
        p_title_bn := 'ব্যানার প্রকাশিত হয়েছে: ' || NEW.category_key,
        p_body_en := 'Published banner content was updated for a public category.',
        p_body_bn := 'একটি পাবলিক ক্যাটাগরির প্রকাশিত ব্যানার কনটেন্ট আপডেট করা হয়েছে।',
        p_actor_user_id := COALESCE(NEW.published_by, auth.uid()),
        p_target_type := NULL,
        p_target_id := NEW.category_key,
        p_target_label := NEW.category_key,
        p_metadata := jsonb_build_object('category_key', NEW.category_key, 'version', NEW.version),
        p_required_all_permissions := ARRAY['banners.manage'],
        p_required_any_permissions := '{}'::text[],
        p_audience_mode := 'permission',
        p_route := '/banners',
        p_dedupe_key := 'banner.published:' || NEW.category_key || ':' || NEW.version::text,
        p_exclude_actor := true,
        p_include_super_admin := true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Notification emission failed for banner.published (%): %', NEW.category_key, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_notify_banner_published ON public.site_banners;
CREATE TRIGGER trg_admin_notify_banner_published
AFTER UPDATE ON public.site_banners
FOR EACH ROW
EXECUTE FUNCTION public.admin_notify_banner_published_trigger();

REVOKE ALL ON FUNCTION public.admin_notify_banner_published_trigger() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Make the Security tab a true server-side filter.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_notifications(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamp with time zone DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_unread_only boolean DEFAULT false,
  p_category text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  event_group_id uuid,
  event_key text,
  category text,
  layer text,
  severity text,
  audience_mode text,
  actor_user_id uuid,
  actor_display_name text,
  target_type text,
  target_id text,
  target_label text,
  title_en text,
  title_bn text,
  body_en text,
  body_bn text,
  metadata jsonb,
  route text,
  created_at timestamp with time zone,
  read_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id UUID;
  v_safe_limit INTEGER;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Active administrator required' USING ERRCODE = '42501';
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  v_safe_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  RETURN QUERY
  SELECT
    n.id,
    n.event_group_id,
    n.event_key,
    n.category,
    n.layer,
    n.severity,
    n.audience_mode,
    n.actor_user_id,
    n.actor_display_name,
    n.target_type,
    n.target_id,
    n.target_label,
    n.title_en,
    n.title_bn,
    n.body_en,
    n.body_bn,
    n.metadata,
    n.route,
    n.created_at,
    n.read_at
  FROM public.admin_notifications n
  WHERE n.recipient_user_id = v_caller_id
    AND public.admin_notification_can_currently_view(
      n.recipient_user_id,
      n.audience_mode,
      n.required_all_permissions,
      n.required_any_permissions,
      n.target_type,
      n.target_id
    )
    AND (p_unread_only IS NOT TRUE OR n.read_at IS NULL)
    AND (
      p_category IS NULL
      OR (
        p_category = 'security'
        AND (
          n.severity = 'security'
          OR n.layer = 'security_privilege'
          OR n.event_key IN ('admin.role_changed', 'role.permissions_changed')
          OR n.category = 'security'
        )
      )
      OR (
        p_category <> 'security'
        AND n.category = p_category
      )
    )
    AND (
      p_before_created_at IS NULL
      OR (n.created_at, n.id) < (
        p_before_created_at,
        COALESCE(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
      )
    )
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT v_safe_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_notifications(INTEGER, TIMESTAMPTZ, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_notifications(INTEGER, TIMESTAMPTZ, UUID, BOOLEAN, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Enable Postgres Changes for the per-recipient notification table.
-- RLS remains authoritative; authenticated already has SELECT and anon does not.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
END;
$$;

COMMIT;
