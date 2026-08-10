-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_opportunities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "officialUrl" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "countryScope" TEXT NOT NULL,
    "eligibleCountries" JSONB,
    "minGrade" INTEGER,
    "maxGrade" INTEGER,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "individualAllowed" BOOLEAN NOT NULL DEFAULT true,
    "teamAllowed" BOOLEAN NOT NULL DEFAULT false,
    "teamSizeMin" INTEGER,
    "teamSizeMax" INTEGER,
    "applicationFee" REAL,
    "feeCurrency" TEXT,
    "prizeDescription" TEXT,
    "deadline" DATETIME,
    "opensAt" DATETIME,
    "closesAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "difficultyScore" INTEGER,
    "valueScore" INTEGER,
    "legitimacyScore" INTEGER,
    "sourceConfidence" INTEGER,
    "discoverySource" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_opportunities" ("applicationFee", "applicationUrl", "category", "closesAt", "countryScope", "createdAt", "deadline", "description", "difficultyScore", "discoveredAt", "discoverySource", "eligibleCountries", "feeCurrency", "id", "individualAllowed", "lastVerifiedAt", "legitimacyScore", "maxAge", "maxGrade", "minAge", "minGrade", "name", "officialUrl", "opensAt", "organization", "prizeDescription", "slug", "sourceConfidence", "status", "subcategory", "teamAllowed", "teamSizeMax", "teamSizeMin", "updatedAt", "valueScore") SELECT "applicationFee", "applicationUrl", "category", "closesAt", "countryScope", "createdAt", "deadline", "description", "difficultyScore", "discoveredAt", "discoverySource", "eligibleCountries", "feeCurrency", "id", "individualAllowed", "lastVerifiedAt", "legitimacyScore", "maxAge", "maxGrade", "minAge", "minGrade", "name", "officialUrl", "opensAt", "organization", "prizeDescription", "slug", "sourceConfidence", "status", "subcategory", "teamAllowed", "teamSizeMax", "teamSizeMin", "updatedAt", "valueScore" FROM "opportunities";
DROP TABLE "opportunities";
ALTER TABLE "new_opportunities" RENAME TO "opportunities";
CREATE UNIQUE INDEX "opportunities_slug_key" ON "opportunities"("slug");
CREATE INDEX "opportunities_category_idx" ON "opportunities"("category");
CREATE INDEX "opportunities_deadline_idx" ON "opportunities"("deadline");
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");
CREATE INDEX "opportunities_discoveredAt_idx" ON "opportunities"("discoveredAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
