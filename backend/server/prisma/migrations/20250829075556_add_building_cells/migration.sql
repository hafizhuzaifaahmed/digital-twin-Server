-- CreateTable
CREATE TABLE `building_cell` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `building_id` INTEGER NOT NULL,
    `row` INTEGER NOT NULL,
    `column` INTEGER NOT NULL,
    `type` ENUM('EMPTY', 'ELEVATOR', 'STAIRS') NOT NULL DEFAULT 'EMPTY',

    UNIQUE INDEX `building_cell_building_id_row_column_key`(`building_id`, `row`, `column`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `building_cell` ADD CONSTRAINT `building_cell_building_id_fkey` FOREIGN KEY (`building_id`) REFERENCES `building`(`building_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
