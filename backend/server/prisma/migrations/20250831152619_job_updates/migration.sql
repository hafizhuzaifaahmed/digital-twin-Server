/*
  Warnings:

  - The primary key for the `skill` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `skill` table. All the data in the column will be lost.
  - Added the required column `skill_id` to the `skill` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `job_skill` DROP FOREIGN KEY `job_skill_skill_id_fkey`;

-- DropIndex
DROP INDEX `job_skill_skill_id_fkey` ON `job_skill`;

-- AlterTable
ALTER TABLE `skill` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `skill_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`skill_id`);

-- AddForeignKey
ALTER TABLE `job_skill` ADD CONSTRAINT `job_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `skill`(`skill_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
