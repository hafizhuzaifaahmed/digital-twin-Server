/*
  Warnings:

  - A unique constraint covering the columns `[floor_id,row,column]` on the table `room` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `column` to the `room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `row` to the `room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `room` ADD COLUMN `cellType` ENUM('EMPTY', 'ELEVATOR', 'STAIRS') NOT NULL DEFAULT 'EMPTY',
    ADD COLUMN `column` INTEGER NOT NULL,
    ADD COLUMN `row` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `table` ADD COLUMN `capacity` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `orientation` ENUM('HORIZONTAL', 'VERTICAL') NOT NULL DEFAULT 'HORIZONTAL';

-- CreateIndex
CREATE UNIQUE INDEX `room_floor_id_row_column_key` ON `room`(`floor_id`, `row`, `column`);
