-- CreateTable
CREATE TABLE "opportunity_awards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "certificateLevel" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_awards_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "educationLevels" JSONB,
    "citizenshipRequirements" JSONB,
    "schoolNominationRequired" BOOLEAN NOT NULL DEFAULT false,
    "institutionNominationRequired" BOOLEAN NOT NULL DEFAULT false,
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
    "classification" TEXT NOT NULL DEFAULT 'unknown',
    "discoverySource" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_opportunities" ("applicationFee", "applicationUrl", "category", "closesAt", "countryScope", "createdAt", "deadline", "description", "difficultyScore", "discoveredAt", "discoverySource", "eligibleCountries", "feeCurrency", "id", "individualAllowed", "lastVerifiedAt", "legitimacyScore", "maxAge", "maxGrade", "minAge", "minGrade", "name", "officialUrl", "opensAt", "organization", "prizeDescription", "published", "slug", "sourceConfidence", "status", "subcategory", "teamAllowed", "teamSizeMax", "teamSizeMin", "updatedAt", "valueScore") SELECT "applicationFee", "applicationUrl", "category", "closesAt", "countryScope", "createdAt", "deadline", "description", "difficultyScore", "discoveredAt", "discoverySource", "eligibleCountries", "feeCurrency", "id", "individualAllowed", "lastVerifiedAt", "legitimacyScore", "maxAge", "maxGrade", "minAge", "minGrade", "name", "officialUrl", "opensAt", "organization", "prizeDescription", "published", "slug", "sourceConfidence", "status", "subcategory", "teamAllowed", "teamSizeMax", "teamSizeMin", "updatedAt", "valueScore" FROM "opportunities";
DROP TABLE "opportunities";
ALTER TABLE "new_opportunities" RENAME TO "opportunities";
CREATE UNIQUE INDEX "opportunities_slug_key" ON "opportunities"("slug");
CREATE INDEX "opportunities_category_idx" ON "opportunities"("category");
CREATE INDEX "opportunities_deadline_idx" ON "opportunities"("deadline");
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");
CREATE INDEX "opportunities_discoveredAt_idx" ON "opportunities"("discoveredAt");
CREATE TABLE "new_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "educationLevel" TEXT NOT NULL DEFAULT 'high_school',
    "grade" INTEGER,
    "dateOfBirth" DATETIME,
    "collegeYear" INTEGER,
    "major" TEXT,
    "country" TEXT NOT NULL,
    "state" TEXT,
    "city" TEXT,
    "school" TEXT,
    "interests" JSONB NOT NULL,
    "preferredCategories" JSONB NOT NULL,
    "teamPreference" TEXT NOT NULL,
    "hoursPerWeek" INTEGER NOT NULL,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_profiles" ("budgetMax", "budgetMin", "city", "country", "createdAt", "grade", "hoursPerWeek", "id", "interests", "name", "preferredCategories", "school", "state", "teamPreference", "updatedAt", "userId") SELECT "budgetMax", "budgetMin", "city", "country", "createdAt", "grade", "hoursPerWeek", "id", "interests", "name", "preferredCategories", "school", "state", "teamPreference", "updatedAt", "userId" FROM "profiles";
DROP TABLE "profiles";
ALTER TABLE "new_profiles" RENAME TO "profiles";
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "opportunity_awards_opportunityId_idx" ON "opportunity_awards"("opportunityId");
