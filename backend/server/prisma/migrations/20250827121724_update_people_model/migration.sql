/*
  Warnings:

  - A unique constraint covering the columns `[people_code]` on the table `people` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `people_code` to the `people` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `people` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `people_code` VARCHAR(191) NOT NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `people_people_code_key` ON `people`(`people_code`);
