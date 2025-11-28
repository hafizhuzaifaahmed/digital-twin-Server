-- AlterTable: Modify process_task to support child processes
-- Drop old primary key and foreign keys
ALTER TABLE `process_task` DROP FOREIGN KEY IF EXISTS `process_task_process_id_fkey`;
ALTER TABLE `process_task` DROP FOREIGN KEY IF EXISTS `process_task_task_id_fkey`;

-- Drop old primary key
ALTER TABLE `process_task` DROP PRIMARY KEY;

-- Add new columns
ALTER TABLE `process_task` ADD COLUMN `process_task_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `child_process_id` INTEGER NULL,
    MODIFY `task_id` INTEGER NULL,
    ADD PRIMARY KEY (`process_task_id`);

-- Create indexes
CREATE INDEX `process_task_process_id_fkey` ON `process_task`(`process_id`);
CREATE INDEX `process_task_task_id_fkey` ON `process_task`(`task_id`);
CREATE INDEX `process_task_child_process_fkey` ON `process_task`(`child_process_id`);
