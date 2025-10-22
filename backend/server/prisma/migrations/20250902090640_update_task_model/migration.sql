/*
  Warnings:

  - You are about to drop the column `name` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `process_id` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `taskCode` on the `task` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[task_code]` on the table `task` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `task_capacity_minutes` to the `task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_code` to the `task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_company_id` to the `task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_name` to the `task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_overview` to the `task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_process_id` to the `task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `task_process_id_fkey`;

-- DropIndex
DROP INDEX `task_process_id_fkey` ON `task`;

-- DropIndex
DROP INDEX `task_taskCode_key` ON `task`;

-- AlterTable
ALTER TABLE `task` DROP COLUMN `name`,
    DROP COLUMN `process_id`,
    DROP COLUMN `taskCode`,
    ADD COLUMN `task_capacity_minutes` INTEGER NOT NULL,
    ADD COLUMN `task_code` VARCHAR(191) NOT NULL,
    ADD COLUMN `task_company_id` INTEGER NOT NULL,
    ADD COLUMN `task_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `task_overview` TEXT NOT NULL,
    ADD COLUMN `task_process_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `task_skill` (
    `task_skill_task_id` INTEGER NOT NULL,
    `task_skill_skill_id` INTEGER NOT NULL,
    `task_skill_level_id` INTEGER NOT NULL,

    PRIMARY KEY (`task_skill_task_id`, `task_skill_skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `task_task_code_key` ON `task`(`task_code`);

-- AddForeignKey
ALTER TABLE `task_skill` ADD CONSTRAINT `task_skill_task_skill_task_id_fkey` FOREIGN KEY (`task_skill_task_id`) REFERENCES `task`(`task_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_skill` ADD CONSTRAINT `task_skill_task_skill_skill_id_fkey` FOREIGN KEY (`task_skill_skill_id`) REFERENCES `skill`(`skill_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_skill` ADD CONSTRAINT `task_skill_task_skill_level_id_fkey` FOREIGN KEY (`task_skill_level_id`) REFERENCES `skill_level`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_task_company_id_fkey` FOREIGN KEY (`task_company_id`) REFERENCES `company`(`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_task_process_id_fkey` FOREIGN KEY (`task_process_id`) REFERENCES `process`(`process_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
