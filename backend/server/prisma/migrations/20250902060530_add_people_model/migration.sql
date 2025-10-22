/*
  Warnings:

  - You are about to drop the column `email` on the `people` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `people` table. All the data in the column will be lost.
  - You are about to drop the column `people_code` on the `people` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `people` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[people_email]` on the table `people` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `job_id` to the `people` table without a default value. This is not possible if the table is not empty.
  - Added the required column `people_email` to the `people` table without a default value. This is not possible if the table is not empty.
  - Added the required column `people_name` to the `people` table without a default value. This is not possible if the table is not empty.
  - Added the required column `people_surname` to the `people` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `people_people_code_key` ON `people`;

-- AlterTable
ALTER TABLE `people` DROP COLUMN `email`,
    DROP COLUMN `name`,
    DROP COLUMN `people_code`,
    DROP COLUMN `phone`,
    ADD COLUMN `is_manager` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `job_id` INTEGER NOT NULL,
    ADD COLUMN `people_email` VARCHAR(191) NOT NULL,
    ADD COLUMN `people_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `people_phone` VARCHAR(191) NULL,
    ADD COLUMN `people_photo` VARCHAR(191) NULL,
    ADD COLUMN `people_surname` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `people_people_email_key` ON `people`(`people_email`);

-- AddForeignKey
ALTER TABLE `people` ADD CONSTRAINT `people_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job`(`job_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
