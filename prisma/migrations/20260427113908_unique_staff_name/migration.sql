CREATE UNIQUE INDEX IF NOT EXISTS "StaffUser_firstName_lower_unique"
ON "StaffUser" (LOWER("firstName"));
