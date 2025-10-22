/*
  Warnings:

  - A unique constraint covering the columns `[level_rank]` on the table `job_level` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[level_rank]` on the table `skill_level` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Function` ADD COLUMN `backgroundColor` VARCHAR(191) NULL,
    ADD COLUMN `overview` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `job_level` ADD COLUMN `level_rank` INTEGER NULL;

-- AlterTable
ALTER TABLE `skill_level` ADD COLUMN `level_rank` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `job_level_level_rank_key` ON `job_level`(`level_rank`);

-- CreateIndex
CREATE UNIQUE INDEX `skill_level_level_rank_key` ON `skill_level`(`level_rank`);
