-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "opportunities" (
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

-- CreateTable
CREATE TABLE "opportunity_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT,
    "retrievedAt" DATETIME NOT NULL,
    "cleanedText" TEXT,
    "contentHash" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_sources_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunity_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "requirements" JSONB,
    "judgingCriteria" JSONB,
    "submissionRequirements" JSONB,
    "stages" JSONB,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "opportunity_requirements_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "past_winners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "year" INTEGER,
    "winnerName" TEXT,
    "projectTitle" TEXT,
    "description" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "past_winners_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_opportunity_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'interested',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_opportunity_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_opportunity_state_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunity_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "explanation" TEXT,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_scores_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunity_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discovery_candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT,
    "domain" TEXT,
    "discoveredByQuery" TEXT,
    "discoveryProvider" TEXT,
    "extractedName" TEXT,
    "legitimacyConfidence" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "opportunityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "discovery_candidates_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scraperType" TEXT NOT NULL,
    "source" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "discoveredCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "logs" JSONB
);

-- CreateTable
CREATE TABLE "opportunity_change_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scrapeRunId" TEXT,
    CONSTRAINT "opportunity_change_history_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_slug_key" ON "opportunities"("slug");

-- CreateIndex
CREATE INDEX "opportunities_category_idx" ON "opportunities"("category");

-- CreateIndex
CREATE INDEX "opportunities_deadline_idx" ON "opportunities"("deadline");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_discoveredAt_idx" ON "opportunities"("discoveredAt");

-- CreateIndex
CREATE INDEX "opportunity_sources_opportunityId_idx" ON "opportunity_sources"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_requirements_opportunityId_key" ON "opportunity_requirements"("opportunityId");

-- CreateIndex
CREATE INDEX "past_winners_opportunityId_idx" ON "past_winners"("opportunityId");

-- CreateIndex
CREATE INDEX "user_opportunity_state_userId_idx" ON "user_opportunity_state"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_opportunity_state_userId_opportunityId_key" ON "user_opportunity_state"("userId", "opportunityId");

-- CreateIndex
CREATE INDEX "opportunity_scores_userId_idx" ON "opportunity_scores"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_scores_opportunityId_userId_key" ON "opportunity_scores"("opportunityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_candidates_url_key" ON "discovery_candidates"("url");

-- CreateIndex
CREATE INDEX "discovery_candidates_state_idx" ON "discovery_candidates"("state");

-- CreateIndex
CREATE INDEX "scrape_runs_scraperType_idx" ON "scrape_runs"("scraperType");

-- CreateIndex
CREATE INDEX "opportunity_change_history_opportunityId_idx" ON "opportunity_change_history"("opportunityId");
