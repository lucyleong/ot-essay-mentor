CREATE OR REPLACE FUNCTION stamp_bookings_for_session(
  p_session_id uuid,
  p_start_date date,
  p_end_date   date
) RETURNS void AS $$
BEGIN
  UPDATE student_bookings sb
  SET    program_session_id = p_session_id
  FROM   appointment_slots  s
  WHERE  sb.slot_id        = s.id
  AND    s.start_time      >= p_start_date::timestamptz
  AND    s.start_time      <= (p_end_date::timestamptz + interval '1 day')
  AND    sb.program_session_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_essay_file_paths_for_session(
  p_start_date date,
  p_end_date   date
) RETURNS TABLE(file_path text) AS $$
BEGIN
  RETURN QUERY
  SELECT se.file_path
  FROM   student_essays    se
  JOIN   student_bookings  sb ON se.booking_id = sb.id
  JOIN   appointment_slots s  ON sb.slot_id    = s.id
  WHERE  se.essay_type   = 'file_upload'
  AND    se.file_path    IS NOT NULL
  AND    s.start_time   >= p_start_date::timestamptz
  AND    s.start_time   <= (p_end_date::timestamptz + interval '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_essays_for_session(
  p_start_date date,
  p_end_date   date
) RETURNS void AS $$
BEGIN
  DELETE FROM student_essays
  WHERE booking_id IN (
    SELECT sb.id
    FROM   student_bookings  sb
    JOIN   appointment_slots s ON sb.slot_id = s.id
    WHERE  s.start_time >= p_start_date::timestamptz
    AND    s.start_time <= (p_end_date::timestamptz + interval '1 day')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;