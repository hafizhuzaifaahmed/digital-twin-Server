/*
  Warnings:

  - Added the required column `skill_name` to the `task_skill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `task_skill` ADD COLUMN `skill_name` VARCHAR(191) NOT NULL;
