/*
  Warnings:

  - You are about to drop the column `backgroundColor` on the `Function` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Function` table. All the data in the column will be lost.
  - You are about to drop the column `overview` on the `Function` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Function` table. All the data in the column will be lost.
  - You are about to drop the column `jobDescription` on the `job` table. All the data in the column will be lost.
  - You are about to drop the column `jobName` on the `job` table. All the data in the column will be lost.
  - You are about to alter the column `maxHoursPerDay` on the `job` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - The primary key for the `job_level` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `job_level_id` on the `job_level` table. All the data in the column will be lost.
  - You are about to drop the column `level_number` on the `job_level` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `job_level` table. All the data in the column will be lost.
  - The primary key for the `skill` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `skill_id` on the `skill` table. All the data in the column will be lost.
  - You are about to drop the column `level_number` on the `skill_level` table. All the data in the column will be lost.
  - You are about to drop the column `skill_id` on the `skill_level` table. All the data in the column will be lost.
  - You are about to alter the column `level_name` on the `skill_level` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(4))`.
  - You are about to drop the `job_function` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[level_name]` on the table `job_level` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `function_id` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `job` table without a default value. This is not possible if the table is not empty.
  - Made the column `job_level_id` on table `job` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `id` to the `job_level` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level_name` to the `job_level` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `skill` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `job` DROP FOREIGN KEY `job_job_level_id_fkey`;

-- DropForeignKey
ALTER TABLE `job_function` DROP FOREIGN KEY `job_function_function_id_fkey`;

-- DropForeignKey
ALTER TABLE `job_function` DROP FOREIGN KEY `job_function_job_id_fkey`;

-- DropForeignKey
ALTER TABLE `job_skill` DROP FOREIGN KEY `job_skill_skill_id_fkey`;

-- DropForeignKey
ALTER TABLE `skill_level` DROP FOREIGN KEY `skill_level_skill_id_fkey`;

-- DropIndex
DROP INDEX `job_job_level_id_fkey` ON `job`;

-- DropIndex
DROP INDEX `job_level_name_key` ON `job_level`;

-- DropIndex
DROP INDEX `job_skill_skill_id_fkey` ON `job_skill`;

-- DropIndex
DROP INDEX `skill_level_skill_id_fkey` ON `skill_level`;

-- AlterTable
ALTER TABLE `Function` DROP COLUMN `backgroundColor`,
    DROP COLUMN `created_at`,
    DROP COLUMN `overview`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `job` DROP COLUMN `jobDescription`,
    DROP COLUMN `jobName`,
    ADD COLUMN `description` VARCHAR(191) NOT NULL,
    ADD COLUMN `function_id` INTEGER NOT NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    MODIFY `job_level_id` INTEGER NOT NULL,
    MODIFY `maxHoursPerDay` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `job_level` DROP PRIMARY KEY,
    DROP COLUMN `job_level_id`,
    DROP COLUMN `level_number`,
    DROP COLUMN `name`,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `level_name` ENUM('NOVICE', 'INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'EXPERT') NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `skill` DROP PRIMARY KEY,
    DROP COLUMN `skill_id`,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `skill_level` DROP COLUMN `level_number`,
    DROP COLUMN `skill_id`,
    MODIFY `level_name` ENUM('NOVICE', 'INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'EXPERT') NOT NULL;

-- DropTable
DROP TABLE `job_function`;

-- CreateIndex
CREATE UNIQUE INDEX `job_level_level_name_key` ON `job_level`(`level_name`);

-- AddForeignKey
ALTER TABLE `job` ADD CONSTRAINT `job_function_id_fkey` FOREIGN KEY (`function_id`) REFERENCES `Function`(`function_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job` ADD CONSTRAINT `job_job_level_id_fkey` FOREIGN KEY (`job_level_id`) REFERENCES `job_level`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_skill` ADD CONSTRAINT `job_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
