UPDATE "parking_passes"
SET "recurringDays" = '{}'
WHERE "recurringDays" IS NULL;

ALTER TABLE "parking_passes"
ALTER COLUMN "recurringDays" SET DEFAULT '{}';

ALTER TABLE "parking_passes"
ALTER COLUMN "recurringDays" SET NOT NULL;
