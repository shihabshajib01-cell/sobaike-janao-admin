BEGIN;

DO $$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN
    SELECT c.id,c.segment_id,c.subcategory_id,c.status,c.created_at
    FROM public.complaints c
    WHERE c.status='submitted'
  LOOP
    BEGIN
      PERFORM public.admin_emit_notification(
        p_event_key := 'complaint.submitted',
        p_title_en := 'New complaint submitted: ' || v_row.id,
        p_title_bn := 'নতুন অভিযোগ জমা হয়েছে: ' || v_row.id,
        p_body_en := 'A citizen complaint is waiting for administrative review.',
        p_body_bn := 'একটি নাগরিক অভিযোগ প্রশাসনিক পর্যালোচনার অপেক্ষায় রয়েছে।',
        p_actor_user_id := NULL,
        p_target_type := 'complaint',
        p_target_id := v_row.id,
        p_target_label := v_row.id,
        p_metadata := jsonb_build_object(
          'complaint_id', v_row.id,
          'segment_id', v_row.segment_id,
          'subcategory_id', v_row.subcategory_id,
          'status', v_row.status,
          'created_at', v_row.created_at,
          'backfilled', true
        ),
        p_required_all_permissions := ARRAY['complaints.view'],
        p_required_any_permissions := '{}'::text[],
        p_audience_mode := 'permission',
        p_route := '/complaints/' || v_row.id,
        p_dedupe_key := 'complaint.submitted:' || v_row.id,
        p_exclude_actor := false,
        p_include_super_admin := true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Backfill notification failed for complaint.submitted (%): %', v_row.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMIT;
