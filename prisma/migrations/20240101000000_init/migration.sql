-- CreateEnum
CREATE TYPE "KeywordType" AS ENUM ('CORE', 'SUBFIELD', 'EXCLUDE');
CREATE TYPE "SourceType" AS ENUM ('ARXIV', 'CROSSREF', 'PUBMED', 'WEB_OF_SCIENCE', 'SCOPUS', 'MOCK');
CREATE TYPE "ActionType" AS ENUM ('READ', 'NOT_INTERESTED', 'BOOKMARKED', 'IDEA_GENERATED');
CREATE TYPE "DigestStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "RunType" AS ENUM ('DAILY_COLLECT', 'WEEKLY_RETRAIN');
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "digestEmail" TEXT,
    "digestTime" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

CREATE TABLE "UserKeyword" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "type" "KeywordType" NOT NULL DEFAULT 'CORE',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserKeyword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserKeyword_userId_term_key" ON "UserKeyword"("userId", "term");
CREATE INDEX "UserKeyword_userId_isActive_idx" ON "UserKeyword"("userId", "isActive");

CREATE TABLE "Paper" (
    "id" TEXT NOT NULL,
    "doi" TEXT,
    "title" TEXT NOT NULL,
    "titleNorm" TEXT NOT NULL,
    "authors" TEXT[],
    "abstract" TEXT,
    "summaryJa" TEXT,
    "shortSummaryJa" TEXT,
    "journal" TEXT,
    "publishedAt" TIMESTAMP(3),
    "year" INTEGER,
    "pdfUrl" TEXT,
    "sourceCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Paper_doi_key" ON "Paper"("doi");

CREATE TABLE "PaperSource" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "source" "SourceType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT,
    "rawData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaperSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaperSource_source_externalId_key" ON "PaperSource"("source", "externalId");
CREATE INDEX "PaperSource_paperId_idx" ON "PaperSource"("paperId");

CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "runId" TEXT,
    "date" DATE NOT NULL,
    "rank" INTEGER NOT NULL,
    "keywordMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedbackScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ideaSignalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reasonTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Recommendation_userId_paperId_date_key" ON "Recommendation"("userId", "paperId", "date");
CREATE INDEX "Recommendation_userId_date_idx" ON "Recommendation"("userId", "date");

CREATE TABLE "UserPaperAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "action" "ActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPaperAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPaperAction_userId_paperId_action_key" ON "UserPaperAction"("userId", "paperId", "action");
CREATE INDEX "UserPaperAction_userId_action_idx" ON "UserPaperAction"("userId", "action");

CREATE TABLE "DailyDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "emailTo" TEXT,
    "status" "DigestStatus" NOT NULL DEFAULT 'PENDING',
    "paperCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyDigest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyDigest_userId_date_key" ON "DailyDigest"("userId", "date");

CREATE TABLE "RecommendationRun" (
    "id" TEXT NOT NULL,
    "type" "RunType" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "papersCollected" INTEGER NOT NULL DEFAULT 0,
    "papersDeduped" INTEGER NOT NULL DEFAULT 0,
    "recommendationsGenerated" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "log" TEXT,
    CONSTRAINT "RecommendationRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserKeyword" ADD CONSTRAINT "UserKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaperSource" ADD CONSTRAINT "PaperSource_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RecommendationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserPaperAction" ADD CONSTRAINT "UserPaperAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPaperAction" ADD CONSTRAINT "UserPaperAction_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyDigest" ADD CONSTRAINT "DailyDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
