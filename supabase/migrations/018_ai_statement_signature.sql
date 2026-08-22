-- Records the typed name a student enters to acknowledge the AI-use statement
-- shown at the end of the booking form. Nullable since existing bookings and
-- non-form paths (walk-in check-in, admin-created bookings, mentor transfers)
-- don't collect this.
ALTER TABLE student_bookings ADD COLUMN ai_statement_signature text;
