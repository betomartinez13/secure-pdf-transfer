-- CreateTable
CREATE TABLE "Case" (
    "id" SERIAL NOT NULL,
    "caseName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "hash" TEXT NOT NULL,
    "hashVerified" BOOLEAN NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);
