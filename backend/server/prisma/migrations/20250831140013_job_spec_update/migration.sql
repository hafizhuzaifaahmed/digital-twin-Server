/*
  Warnings:

  - You are about to drop the column `created_at` on the `job` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `job` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `job` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `job_level` table. All the data in the column will be lost.
  - You are about to drop the `_FunctionTojob` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `job_level` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `company_id` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hourlyRate` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobDescription` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobName` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxHoursPerDay` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level_number` to the `job_level` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `job_level` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skill_level_id` to the `job_skill` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_FunctionTojob` DROP FOREIGN KEY `_FunctionTojob_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FunctionTojob` DROP FOREIGN KEY `_FunctionTojob_B_fkey`;

-- DropIndex
DROP INDEX `job_level_title_key` ON `job_level`;

-- AlterTable
ALTER TABLE `job` DROP COLUMN `created_at`,
    DROP COLUMN `title`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `company_id` INTEGER NOT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `hourlyRate` DOUBLE NOT NULL,
    ADD COLUMN `jobDescription` VARCHAR(191) NOT NULL,
    ADD COLUMN `jobName` VARCHAR(191) NOT NULL,
    ADD COLUMN `maxHoursPerDay` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `job_level` DROP COLUMN `title`,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `level_number` INTEGER NOT NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `job_skill` ADD COLUMN `skill_level_id` INTEGER NOT NULL;

-- DropTable
DROP TABLE `_FunctionTojob`;

-- CreateTable
CREATE TABLE `job_function` (
    `job_id` INTEGER NOT NULL,
    `function_id` INTEGER NOT NULL,

    PRIMARY KEY (`job_id`, `function_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skill_level` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skill_id` INTEGER NOT NULL,
    `level_name` VARCHAR(191) NOT NULL,
    `level_number` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `job_level_name_key` ON `job_level`(`name`);

-- AddForeignKey
ALTER TABLE `job_function` ADD CONSTRAINT `job_function_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job`(`job_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_function` ADD CONSTRAINT `job_function_function_id_fkey` FOREIGN KEY (`function_id`) REFERENCES `Function`(`function_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `skill_level` ADD CONSTRAINT `skill_level_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `skill`(`skill_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job` ADD CONSTRAINT `job_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_skill` ADD CONSTRAINT `job_skill_skill_level_id_fkey` FOREIGN KEY (`skill_level_id`) REFERENCES `skill_level`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
