-- Automatically rank primary pupils after every result insert or score update.
-- POSITION ranks pupils inside an exact arm (for example Primary 2R).
-- Rankings are kept separate by term and academic session.
-- Run this entire file once in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.format_school_position(position_number BIGINT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT position_number::TEXT ||
    CASE
      WHEN position_number % 100 BETWEEN 11 AND 13 THEN 'th'
      WHEN position_number % 10 = 1 THEN 'st'
      WHEN position_number % 10 = 2 THEN 'nd'
      WHEN position_number % 10 = 3 THEN 'rd'
      ELSE 'th'
    END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_primary_positions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH ranked_results AS (
    SELECT
      id,
      rank() OVER (
        PARTITION BY
          lower(class_name),
          lower(term),
          lower(coalesce(assessment_data->>'session', ''))
        ORDER BY average_score DESC
      ) AS arm_position,
      count(*) OVER (
        PARTITION BY
          lower(class_name),
          lower(term),
          lower(coalesce(assessment_data->>'session', ''))
      ) AS pupils_in_arm
    FROM public.students
    WHERE assessment_data->>'section' = 'Primary'
  )
  UPDATE public.students AS pupil
  SET
    assessment_data = jsonb_set(
      jsonb_set(
        coalesce(pupil.assessment_data, '{}'::jsonb) - 'overall_position',
        '{number_in_class}',
        to_jsonb(ranked.pupils_in_arm::TEXT),
        TRUE
      ),
        '{position}',
        to_jsonb(public.format_school_position(ranked.arm_position)),
        TRUE
    ),
    updated_at = now()
  FROM ranked_results AS ranked
  WHERE pupil.id = ranked.id
    AND (
      pupil.assessment_data->>'number_in_class' IS DISTINCT FROM ranked.pupils_in_arm::TEXT
      OR pupil.assessment_data->>'position' IS DISTINCT FROM public.format_school_position(ranked.arm_position)
      OR pupil.assessment_data ? 'overall_position'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_primary_positions_after_result_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Updates performed by the ranking routine must not invoke it recursively.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  PERFORM public.recalculate_primary_positions();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_primary_positions_after_result_change ON public.students;
CREATE TRIGGER refresh_primary_positions_after_result_change
AFTER INSERT OR UPDATE OF average_score, class_name, term, assessment_data
ON public.students
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_primary_positions_after_result_change();

-- Populate positions for every primary result that was uploaded before this
-- automation was installed.
SELECT public.recalculate_primary_positions();
