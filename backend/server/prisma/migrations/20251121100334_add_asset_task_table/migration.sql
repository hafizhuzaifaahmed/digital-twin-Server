-- CreateTable
CREATE TABLE `asset_task` (
    `asset_task_id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `process_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `input` BOOLEAN NOT NULL DEFAULT false,
    `output` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NOT NULL,
    `document_link` VARCHAR(191) NULL,

    INDEX `asset_task_task_id_idx`(`task_id`),
    INDEX `asset_task_process_id_idx`(`process_id`),
    PRIMARY KEY (`asset_task_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asset_task` ADD CONSTRAINT `asset_task_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `task`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_task` ADD CONSTRAINT `asset_task_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `process`(`process_id`) ON DELETE CASCADE ON UPDATE CASCADE;
