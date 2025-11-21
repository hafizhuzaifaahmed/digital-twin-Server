-- DropForeignKey
ALTER TABLE `Function` DROP FOREIGN KEY `Function_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `building` DROP FOREIGN KEY `building_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `job` DROP FOREIGN KEY `job_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `job` DROP FOREIGN KEY `job_function_id_fkey`;

-- DropForeignKey
ALTER TABLE `job_skill` DROP FOREIGN KEY `job_skill_job_id_fkey`;

-- DropForeignKey
ALTER TABLE `job_task` DROP FOREIGN KEY `job_task_job_id_fkey`;

-- DropForeignKey
ALTER TABLE `job_task` DROP FOREIGN KEY `job_task_task_id_fkey`;

-- DropForeignKey
ALTER TABLE `people` DROP FOREIGN KEY `people_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `people` DROP FOREIGN KEY `people_job_id_fkey`;

-- DropForeignKey
ALTER TABLE `process` DROP FOREIGN KEY `process_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `task_task_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `task_skill` DROP FOREIGN KEY `task_skill_task_skill_task_id_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `user_company_id_fkey`;

-- AlterTable
ALTER TABLE `company` ADD COLUMN `org_type_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `created_by` INTEGER NULL;

-- CreateTable
CREATE TABLE `users_3d` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `company_id` INTEGER NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `users_3d_email_key`(`email`),
    INDEX `users_3d_company_id_fkey`(`company_id`),
    INDEX `users_3d_created_by_fkey`(`created_by`),
    INDEX `users_3d_updated_by_fkey`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `OrganizationType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `company_org_type_id_fkey` ON `company`(`org_type_id`);

-- CreateIndex
CREATE INDEX `user_created_by_fkey` ON `user`(`created_by`);

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_3d` ADD CONSTRAINT `users_3d_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_3d` ADD CONSTRAINT `users_3d_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_3d` ADD CONSTRAINT `users_3d_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_org_type_id_fkey` FOREIGN KEY (`org_type_id`) REFERENCES `OrganizationType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `people` ADD CONSTRAINT `people_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `people` ADD CONSTRAINT `people_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job`(`job_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `building` ADD CONSTRAINT `building_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process` ADD CONSTRAINT `process_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_task_company_id_fkey` FOREIGN KEY (`task_company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job` ADD CONSTRAINT `job_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job` ADD CONSTRAINT `job_function_id_fkey` FOREIGN KEY (`function_id`) REFERENCES `Function`(`function_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_skill` ADD CONSTRAINT `job_skill_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job`(`job_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_task` ADD CONSTRAINT `job_task_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job`(`job_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_task` ADD CONSTRAINT `job_task_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `task`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_skill` ADD CONSTRAINT `task_skill_task_skill_task_id_fkey` FOREIGN KEY (`task_skill_task_id`) REFERENCES `task`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Function` ADD CONSTRAINT `Function_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;
