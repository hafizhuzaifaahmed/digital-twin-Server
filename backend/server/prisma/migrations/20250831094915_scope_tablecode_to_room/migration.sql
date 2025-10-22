/*
  Warnings:

  - You are about to drop the `Renamedfunction` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[room_id,tableCode]` on the table `table` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Renamedfunction` DROP FOREIGN KEY `Renamedfunction_job_id_fkey`;

-- DropIndex
DROP INDEX `table_tableCode_key` ON `table`;

-- DropTable
DROP TABLE `Renamedfunction`;

-- CreateTable
CREATE TABLE `Function` (
    `function_id` INTEGER NOT NULL AUTO_INCREMENT,
    `functionCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `job_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Function_functionCode_key`(`functionCode`),
    PRIMARY KEY (`function_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `table_room_id_tableCode_key` ON `table`(`room_id`, `tableCode`);

-- AddForeignKey
ALTER TABLE `Function` ADD CONSTRAINT `Function_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job`(`job_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
