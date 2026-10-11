-- Accounts from before personal invites start with the same 3 as a new one (INVITES_PER_PERSON, lib/access.ts)
UPDATE "user" SET "invites_left" = 3 WHERE "invites_left" = 0;
