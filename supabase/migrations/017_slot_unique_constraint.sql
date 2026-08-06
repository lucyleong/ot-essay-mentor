-- Prevent double-booking: ensure only one active (non-cancelled) booking per slot
CREATE UNIQUE INDEX IF NOT EXISTS student_bookings_slot_id_unique
  ON student_bookings (slot_id)
  WHERE cancelled_at IS NULL;