/*
  Warnings:

  - You are about to drop the column `job_id` on the `Function` table. All the data in the column will be lost.
  - Added the required column `company_id` to the `Function` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Function` DROP FOREIGN KEY `Function_job_id_fkey`;

-- DropIndex
DROP INDEX `Function_job_id_fkey` ON `Function`;

-- AlterTable
ALTER TABLE `Function` DROP COLUMN `job_id`,
    ADD COLUMN `backgroundColor` VARCHAR(191) NULL,
    ADD COLUMN `company_id` INTEGER NOT NULL,
    ADD COLUMN `overview` VARCHAR(191) NULL,
    ADD COLUMN `parent_function_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `_FunctionTojob` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_FunctionTojob_AB_unique`(`A`, `B`),
    INDEX `_FunctionTojob_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Function` ADD CONSTRAINT `Function_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Function` ADD CONSTRAINT `Function_parent_function_id_fkey` FOREIGN KEY (`parent_function_id`) REFERENCES `Function`(`function_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FunctionTojob` ADD CONSTRAINT `_FunctionTojob_A_fkey` FOREIGN KEY (`A`) REFERENCES `Function`(`function_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FunctionTojob` ADD CONSTRAINT `_FunctionTojob_B_fkey` FOREIGN KEY (`B`) REFERENCES `job`(`job_id`) ON DELETE CASCADE ON UPDATE CASCADE;
