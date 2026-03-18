ALTER TABLE "residents"
ADD COLUMN "strataLotNumber" TEXT,
ADD COLUMN "assignedStallNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[];
