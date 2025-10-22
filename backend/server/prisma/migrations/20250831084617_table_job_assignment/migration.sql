-- CreateTable
CREATE TABLE `table_job` (
    `table_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`table_id`, `job_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `table_job` ADD CONSTRAINT `table_job_table_id_fkey` FOREIGN KEY (`table_id`) REFERENCES `table`(`table_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_job` ADD CONSTRAINT `table_job_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job`(`job_id`) ON DELETE CASCADE ON UPDATE CASCADE;
