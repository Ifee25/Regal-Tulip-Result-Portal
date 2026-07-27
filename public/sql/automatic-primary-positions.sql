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
          lower(trim(class_name)),
          lower(trim(term)),
          lower(trim(coalesce(report->>'session', '')))
        ORDER BY term_average DESC
      ) AS arm_position,
      count(*) OVER (
        PARTITION BY
          lower(trim(class_name)),
          lower(trim(term)),
          lower(trim(coalesce(report->>'session', '')))
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
    WHERE lower(trim(coalesce(report->>'section', ''))) = 'primary'
      OR lower(trim(class_name)) LIKE 'primary %'
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

CREATE OR REPLACE FUNCTION public.recalculate_primary_subject_extremes()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH primary_results AS (
    SELECT
      id,
      lower(trim(class_name)) AS class_key,
      lower(trim(term)) AS term_key,
      lower(trim(coalesce(report->>'session', ''))) AS session_key,
      report
    FROM (
      SELECT
        pupil.id,
        pupil.class_name,
        pupil.term,
        public.normalized_assessment_data(pupil.assessment_data) AS report
      FROM public.students AS pupil
    ) AS normalized_results
    WHERE lower(trim(coalesce(report->>'section', ''))) = 'primary'
      OR lower(trim(class_name)) LIKE 'primary %'
  ),
  subject_scores AS (
    SELECT
      result.class_key,
      result.term_key,
      result.session_key,
      lower(trim(subject.item->>'subject')) AS subject_key,
      (subject.item->>'total')::numeric AS term_total
    FROM primary_results AS result
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(result.report->'primary_subjects') = 'array'
          THEN result.report->'primary_subjects'
        ELSE '[]'::jsonb
      END
    ) AS subject(item)
    WHERE coalesce((subject.item->>'not_offered')::boolean, FALSE) = FALSE
      AND (subject.item ? 'cat' OR subject.item ? 'exam')
      AND subject.item->>'total' ~ '^-?[0-9]+([.][0-9]+)?$'
  ),
  subject_extremes AS (
    SELECT
      class_key,
      term_key,
      session_key,
      subject_key,
      max(term_total) AS highest_score,
      min(term_total) AS lowest_score
    FROM subject_scores
    GROUP BY class_key, term_key, session_key, subject_key
  ),
  rebuilt_reports AS (
    SELECT
      result.id,
      jsonb_set(
        result.report,
        '{primary_subjects}',
        coalesce((
          SELECT jsonb_agg(
            CASE
              WHEN extremes.subject_key IS NULL THEN
                subject.item - 'class_highest_score' - 'class_lowest_score'
              ELSE
                jsonb_set(
                  jsonb_set(
                    subject.item,
                    '{class_highest_score}',
                    to_jsonb(extremes.highest_score),
                    TRUE
                  ),
                  '{class_lowest_score}',
                  to_jsonb(extremes.lowest_score),
                  TRUE
                )
            END
            ORDER BY subject.ordinality
          )
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(result.report->'primary_subjects') = 'array'
                THEN result.report->'primary_subjects'
              ELSE '[]'::jsonb
            END
          ) WITH ORDINALITY AS subject(item, ordinality)
          LEFT JOIN subject_extremes AS extremes
            ON extremes.class_key = result.class_key
            AND extremes.term_key = result.term_key
            AND extremes.session_key = result.session_key
            AND extremes.subject_key = lower(trim(subject.item->>'subject'))
        ), '[]'::jsonb),
        TRUE
      ) AS report
    FROM primary_results AS result
  )
  UPDATE public.students AS pupil
  SET
    assessment_data = rebuilt.report,
    updated_at = now()
  FROM rebuilt_reports AS rebuilt
  WHERE pupil.id = rebuilt.id
    AND public.normalized_assessment_data(pupil.assessment_data) IS DISTINCT FROM rebuilt.report;
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
  PERFORM public.recalculate_primary_subject_extremes();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_primary_positions_after_result_change ON public.students;
CREATE TRIGGER refresh_primary_positions_after_result_change
AFTER INSERT OR DELETE OR UPDATE OF average_score, class_name, term, assessment_data
ON public.students
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_primary_positions_after_result_change();

-- Populate positions for every primary result that was uploaded before this
-- automation was installed.
SELECT public.recalculate_primary_positions();
SELECT public.recalculate_primary_subject_extremes();

-- Return a clear verification summary in the SQL Editor.
SELECT
  count(*) AS primary_results,
  count(*) FILTER (WHERE report->>'position' IS NOT NULL) AS results_with_position,
  count(*) FILTER (WHERE report->>'number_in_class' IS NOT NULL) AS results_with_no_in_class,
  count(*) FILTER (
    WHERE report->>'position' IS NULL OR report->>'number_in_class' IS NULL
  ) AS incomplete_rank_records
FROM (
  SELECT
    class_name,
    public.normalized_assessment_data(assessment_data) AS report
  FROM public.students
) AS saved_results
WHERE lower(trim(coalesce(report->>'section', ''))) = 'primary'
  OR lower(trim(class_name)) LIKE 'primary %';

-- Verify that every subject with at least one entered score has class extrema.
SELECT
  count(*) AS entered_subject_rows,
  count(*) FILTER (
    WHERE subject->>'class_highest_score' IS NOT NULL
      AND subject->>'class_lowest_score' IS NOT NULL
  ) AS rows_with_highest_and_lowest,
  count(*) FILTER (
    WHERE subject->>'class_highest_score' IS NULL
      OR subject->>'class_lowest_score' IS NULL
  ) AS incomplete_extreme_rows
FROM (
  SELECT jsonb_array_elements(report->'primary_subjects') AS subject
  FROM (
    SELECT
      class_name,
      public.normalized_assessment_data(assessment_data) AS report
    FROM public.students
  ) AS saved_results
  WHERE (
      lower(trim(coalesce(report->>'section', ''))) = 'primary'
      OR lower(trim(class_name)) LIKE 'primary %'
    )
    AND jsonb_typeof(report->'primary_subjects') = 'array'
) AS subject_rows
WHERE coalesce((subject->>'not_offered')::boolean, FALSE) = FALSE
  AND (subject ? 'cat' OR subject ? 'exam');

-- Independently recompute and compare every stored class highest/lowest value.
WITH primary_results AS (
  SELECT
    lower(trim(class_name)) AS class_key,
    lower(trim(term)) AS term_key,
    lower(trim(coalesce(report->>'session', ''))) AS session_key,
    report
  FROM (
    SELECT
      class_name,
      term,
      public.normalized_assessment_data(assessment_data) AS report
    FROM public.students
  ) AS normalized_results
  WHERE lower(trim(coalesce(report->>'section', ''))) = 'primary'
    OR lower(trim(class_name)) LIKE 'primary %'
),
all_subject_rows AS (
  SELECT
    result.class_key,
    result.term_key,
    result.session_key,
    lower(trim(subject.item->>'subject')) AS subject_key,
    CASE
      WHEN subject.item->>'class_highest_score' ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (subject.item->>'class_highest_score')::numeric
      ELSE NULL
    END AS stored_highest,
    CASE
      WHEN subject.item->>'class_lowest_score' ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (subject.item->>'class_lowest_score')::numeric
      ELSE NULL
    END AS stored_lowest,
    CASE
      WHEN coalesce((subject.item->>'not_offered')::boolean, FALSE) = FALSE
        AND (subject.item ? 'cat' OR subject.item ? 'exam')
        AND subject.item->>'total' ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (subject.item->>'total')::numeric
      ELSE NULL
    END AS entered_total
  FROM primary_results AS result
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(result.report->'primary_subjects') = 'array'
        THEN result.report->'primary_subjects'
      ELSE '[]'::jsonb
    END
  ) AS subject(item)
),
expected_extremes AS (
  SELECT
    class_key,
    term_key,
    session_key,
    subject_key,
    max(entered_total) AS expected_highest,
    min(entered_total) AS expected_lowest
  FROM all_subject_rows
  WHERE entered_total IS NOT NULL
  GROUP BY class_key, term_key, session_key, subject_key
),
comparisons AS (
  SELECT
    rows.stored_highest,
    rows.stored_lowest,
    expected.expected_highest,
    expected.expected_lowest
  FROM all_subject_rows AS rows
  INNER JOIN expected_extremes AS expected
    ON expected.class_key = rows.class_key
    AND expected.term_key = rows.term_key
    AND expected.session_key = rows.session_key
    AND expected.subject_key = rows.subject_key
)
SELECT
  count(*) AS subject_cells_checked,
  count(*) FILTER (
    WHERE stored_highest IS NOT DISTINCT FROM expected_highest
      AND stored_lowest IS NOT DISTINCT FROM expected_lowest
  ) AS correct_subject_cells,
  count(*) FILTER (
    WHERE stored_highest IS DISTINCT FROM expected_highest
      OR stored_lowest IS DISTINCT FROM expected_lowest
  ) AS mismatched_subject_cells
FROM comparisons;

-- Independently verify that every primary record is included in the correct
-- arm, term, and session count and rank.
WITH primary_records AS (
  SELECT
    id,
    lower(trim(class_name)) AS class_key,
    lower(trim(term)) AS term_key,
    lower(trim(coalesce(report->>'session', ''))) AS session_key,
    average_score,
    report
  FROM (
    SELECT
      pupil.*,
      public.normalized_assessment_data(pupil.assessment_data) AS report
    FROM public.students AS pupil
  ) AS normalized_results
  WHERE lower(trim(coalesce(report->>'section', ''))) = 'primary'
    OR lower(trim(class_name)) LIKE 'primary %'
),
expected_rankings AS (
  SELECT
    id,
    report,
    rank() OVER (
      PARTITION BY class_key, term_key, session_key
      ORDER BY average_score DESC
    ) AS expected_position,
    count(*) OVER (
      PARTITION BY class_key, term_key, session_key
    ) AS expected_no_in_class
  FROM primary_records
),
ranking_comparisons AS (
  SELECT
    report->>'position' AS stored_position,
    report->>'number_in_class' AS stored_no_in_class,
    public.format_school_position(expected_position) AS expected_position,
    expected_no_in_class::text AS expected_no_in_class
  FROM expected_rankings
)
SELECT
  count(*) AS primary_records_checked,
  count(*) FILTER (
    WHERE stored_position = expected_position
      AND stored_no_in_class = expected_no_in_class
  ) AS correct_ranking_records,
  count(*) FILTER (
    WHERE stored_position IS DISTINCT FROM expected_position
      OR stored_no_in_class IS DISTINCT FROM expected_no_in_class
  ) AS mismatched_ranking_records
FROM ranking_comparisons;
