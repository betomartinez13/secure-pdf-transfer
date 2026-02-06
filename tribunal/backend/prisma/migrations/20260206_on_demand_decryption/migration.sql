-- AlterTable: Change from storing decrypted files to encrypted files (on-demand decryption)
-- WARNING: This migration will delete existing case data as the schema changes significantly

-- Delete existing records since they cannot be migrated (decrypted data cannot be re-encrypted)
DELETE FROM "Case";

-- Drop old columns
ALTER TABLE "Case" DROP COLUMN "fileData";
ALTER TABLE "Case" DROP COLUMN "hashVerified";

-- Add new columns for encrypted storage
ALTER TABLE "Case" ADD COLUMN "encryptedFile" BYTEA NOT NULL;
ALTER TABLE "Case" ADD COLUMN "encryptedKey" TEXT NOT NULL;
ALTER TABLE "Case" ADD COLUMN "iv" TEXT NOT NULL;
ALTER TABLE "Case" ADD COLUMN "authTag" TEXT NOT NULL;
