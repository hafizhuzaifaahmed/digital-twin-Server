-- DropForeignKey
ALTER TABLE `building_cell` DROP FOREIGN KEY `building_cell_building_id_fkey`;

-- DropForeignKey
ALTER TABLE `floor` DROP FOREIGN KEY `floor_building_id_fkey`;

-- DropForeignKey
ALTER TABLE `room` DROP FOREIGN KEY `room_floor_id_fkey`;

-- DropForeignKey
ALTER TABLE `table` DROP FOREIGN KEY `table_room_id_fkey`;

-- DropIndex
DROP INDEX `floor_building_id_fkey` ON `floor`;

-- DropIndex
DROP INDEX `table_room_id_fkey` ON `table`;

-- AddForeignKey
ALTER TABLE `building_cell` ADD CONSTRAINT `building_cell_building_id_fkey` FOREIGN KEY (`building_id`) REFERENCES `building`(`building_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `floor` ADD CONSTRAINT `floor_building_id_fkey` FOREIGN KEY (`building_id`) REFERENCES `building`(`building_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_floor_id_fkey` FOREIGN KEY (`floor_id`) REFERENCES `floor`(`floor_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table` ADD CONSTRAINT `table_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`room_id`) ON DELETE CASCADE ON UPDATE CASCADE;
