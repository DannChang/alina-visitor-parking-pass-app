CREATE TYPE "TimeBankPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "parking_rules"
ADD COLUMN "timeBankPeriod" "TimeBankPeriod" NOT NULL DEFAULT 'MONTHLY';
