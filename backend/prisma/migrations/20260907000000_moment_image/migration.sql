-- AlterTable: add optional illustrative image to a moment (comic strip /
-- cartoon / picture) shown on the projector and on students' phones.
ALTER TABLE "Moment" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Moment" ADD COLUMN "imageAlt" TEXT;
