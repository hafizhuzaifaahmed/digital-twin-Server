/*
  Warnings:

  - You are about to drop the column `name` on the `process` table. All the data in the column will be lost.
  - You are about to drop the column `processCode` on the `process` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[process_code]` on the table `process` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `process_code` to the `process` table without a default value. This is not possible if the table is not empty.
  - Added the required column `process_name` to the `process` table without a default value. This is not possible if the table is not empty.
  - Added the required column `process_overview` to the `process` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `process_processCode_key` ON `process`;

-- AlterTable
ALTER TABLE `process` DROP COLUMN `name`,
    DROP COLUMN `processCode`,
    ADD COLUMN `capacity_requirement_minutes` INTEGER NULL,
    ADD COLUMN `parent_process_id` INTEGER NULL,
    ADD COLUMN `parent_task_id` INTEGER NULL,
    ADD COLUMN `process_code` VARCHAR(191) NOT NULL,
    ADD COLUMN `process_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `process_overview` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `process_task` (
    `process_id` INTEGER NOT NULL,
    `task_id` INTEGER NOT NULL,
    `order` INTEGER NOT NULL,

    PRIMARY KEY (`process_id`, `task_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `process_process_code_key` ON `process`(`process_code`);

-- AddForeignKey
ALTER TABLE `process` ADD CONSTRAINT `process_parent_process_id_fkey` FOREIGN KEY (`parent_process_id`) REFERENCES `process`(`process_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process` ADD CONSTRAINT `process_parent_task_id_fkey` FOREIGN KEY (`parent_task_id`) REFERENCES `task`(`task_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_task` ADD CONSTRAINT `process_task_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `process`(`process_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_task` ADD CONSTRAINT `process_task_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `task`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;
