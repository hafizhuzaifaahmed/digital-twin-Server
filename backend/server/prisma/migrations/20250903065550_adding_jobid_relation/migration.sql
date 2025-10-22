-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `task_task_process_id_fkey`;

-- DropIndex
DROP INDEX `task_task_process_id_fkey` ON `task`;

-- AlterTable
ALTER TABLE `task` MODIFY `task_process_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_task_process_id_fkey` FOREIGN KEY (`task_process_id`) REFERENCES `process`(`process_id`) ON DELETE SET NULL ON UPDATE CASCADE;
