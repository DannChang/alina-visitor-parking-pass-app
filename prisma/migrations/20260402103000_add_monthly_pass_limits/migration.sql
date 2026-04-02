ALTER TABLE "parking_rules"
ADD COLUMN "monthlyHourBank" INTEGER NOT NULL DEFAULT 72;

ALTER TABLE "parking_rules"
ALTER COLUMN "maxVehiclesPerUnit" SET DEFAULT 3;
