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

-- Earlier portal versions sent assessment_data as a JSON-formatted string.
-- Newer versions send a proper JSON object. This function safely supports both.
CREATE OR REPLACE FUNCTION public.normalized_assessment_data(saved_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF saved_data IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  IF jsonb_typeof(saved_data) = 'string' THEN
    RETURN (saved_data #>> '{}')::jsonb;
  END IF;

  RETURN saved_data;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '{}'::jsonb;
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
      report,
      term_average,
      rank() OVER (
        PARTITION BY
          lower(class_name),
          lower(term),
          lower(coalesce(report->>'session', ''))
        ORDER BY term_average DESC
      ) AS arm_position,
      count(*) OVER (
        PARTITION BY
          lower(class_name),
          lower(term),
          lower(coalesce(report->>'session', ''))
      ) AS pupils_in_arm
    FROM (
      SELECT
        normalized_results.*,
        coalesce(term_scores.term_average, normalized_results.average_score) AS term_average
      FROM (
        SELECT
          pupil.*,
          public.normalized_assessment_data(pupil.assessment_data) AS report
        FROM public.students AS pupil
      ) AS normalized_results
      LEFT JOIN LATERAL (
        SELECT avg((subject->>'total')::numeric) AS term_average
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(normalized_results.report->'primary_subjects') = 'array'
              THEN normalized_results.report->'primary_subjects'
            ELSE '[]'::jsonb
          END
        ) AS subject
        WHERE coalesce((subject->>'not_offered')::boolean, FALSE) = FALSE
          AND (subject ? 'cat' OR subject ? 'exam')
          AND subject->>'total' ~ '^-?[0-9]+([.][0-9]+)?$'
      ) AS term_scores ON TRUE
    ) AS results_with_term_average
    WHERE report->>'section' = 'Primary'
  )
  UPDATE public.students AS pupil
  SET
    assessment_data = jsonb_set(
      jsonb_set(
        ranked.report - 'overall_position',
        '{number_in_class}',
        to_jsonb(ranked.pupils_in_arm::TEXT),
        TRUE
      ),
        '{position}',
        to_jsonb(public.format_school_position(ranked.arm_position)),
        TRUE
    ),
    average_score = ranked.term_average,
    updated_at = now()
  FROM ranked_results AS ranked
  WHERE pupil.id = ranked.id
    AND (
      ranked.report->>'number_in_class' IS DISTINCT FROM ranked.pupils_in_arm::TEXT
      OR ranked.report->>'position' IS DISTINCT FROM public.format_school_position(ranked.arm_position)
      OR ranked.report ? 'overall_position'
      OR jsonb_typeof(pupil.assessment_data) = 'string'
      OR pupil.average_score IS DISTINCT FROM ranked.term_average
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
