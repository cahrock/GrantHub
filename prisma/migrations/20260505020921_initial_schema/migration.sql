-- CreateTable
CREATE TABLE `institutions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `shortName` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `institutions_shortName_key`(`shortName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institutionId` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `departments_institutionId_active_idx`(`institutionId`, `active`),
    UNIQUE INDEX `departments_institutionId_code_key`(`institutionId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `funding_agencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institutionId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `shortName` VARCHAR(20) NOT NULL,
    `agencyType` ENUM('FEDERAL', 'STATE', 'PRIVATE_FOUNDATION', 'INDUSTRY', 'INTERNAL') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `funding_agencies_institutionId_active_idx`(`institutionId`, `active`),
    UNIQUE INDEX `funding_agencies_institutionId_shortName_key`(`institutionId`, `shortName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fiscal_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institutionId` INTEGER NOT NULL,
    `label` VARCHAR(10) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `closed` BOOLEAN NOT NULL DEFAULT false,

    INDEX `fiscal_years_institutionId_startDate_idx`(`institutionId`, `startDate`),
    UNIQUE INDEX `fiscal_years_institutionId_label_key`(`institutionId`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institutionId` INTEGER NOT NULL,
    `auth0Sub` VARCHAR(100) NULL,
    `email` VARCHAR(255) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `title` VARCHAR(150) NULL,
    `role` ENUM('PI', 'RESEARCH_ADMIN', 'ADMIN') NOT NULL DEFAULT 'PI',
    `departmentId` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_auth0Sub_key`(`auth0Sub`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_institutionId_role_active_idx`(`institutionId`, `role`, `active`),
    INDEX `users_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institutionId` INTEGER NOT NULL,
    `grantNumber` VARCHAR(30) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `abstract` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `departmentId` INTEGER NOT NULL,
    `fundingAgencyId` INTEGER NOT NULL,
    `fiscalYearId` INTEGER NOT NULL,
    `sponsorAwardId` VARCHAR(100) NULL,
    `totalBudget` DECIMAL(12, 2) NOT NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,

    UNIQUE INDEX `grants_grantNumber_key`(`grantNumber`),
    INDEX `grants_institutionId_status_idx`(`institutionId`, `status`),
    INDEX `grants_departmentId_fiscalYearId_idx`(`departmentId`, `fiscalYearId`),
    INDEX `grants_fundingAgencyId_fiscalYearId_idx`(`fundingAgencyId`, `fiscalYearId`),
    INDEX `grants_fiscalYearId_status_idx`(`fiscalYearId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grant_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grantId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `role` ENUM('LEAD_PI', 'CO_PI', 'COLLABORATOR') NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `grant_roles_userId_idx`(`userId`),
    UNIQUE INDEX `grant_roles_grantId_userId_key`(`grantId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliverables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grantId` INTEGER NOT NULL,
    `fiscalYearId` INTEGER NOT NULL,
    `type` ENUM('PROGRESS_REPORT', 'ANNUAL_REPORT', 'FINAL_REPORT', 'DATASET', 'PUBLICATION', 'MILESTONE') NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REVISION_REQUESTED', 'WITHDRAWN') NOT NULL DEFAULT 'NOT_STARTED',
    `dueDate` DATE NOT NULL,
    `assigneeId` INTEGER NULL,
    `submittedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `deliverables_grantId_status_idx`(`grantId`, `status`),
    INDEX `deliverables_assigneeId_status_idx`(`assigneeId`, `status`),
    INDEX `deliverables_dueDate_status_idx`(`dueDate`, `status`),
    INDEX `deliverables_fiscalYearId_type_idx`(`fiscalYearId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `funding` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grantId` INTEGER NOT NULL,
    `fiscalYearId` INTEGER NOT NULL,
    `plannedAmount` DECIMAL(12, 2) NOT NULL,
    `actualAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(500) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `funding_grantId_fiscalYearId_key`(`grantId`, `fiscalYearId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deliverableId` INTEGER NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` BIGINT NOT NULL,
    `storageKey` VARCHAR(500) NOT NULL,
    `uploadedById` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attachments_deliverableId_idx`(`deliverableId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'GRANT_SUBMIT', 'GRANT_APPROVE', 'GRANT_REJECT', 'GRANT_CLOSE', 'DELIVERABLE_SUBMIT', 'DELIVERABLE_ACCEPT', 'DELIVERABLE_REVISION_REQUESTED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'AI_SEARCH_EXECUTED') NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_log_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `audit_log_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `funding_agencies` ADD CONSTRAINT `funding_agencies_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fiscal_years` ADD CONSTRAINT `fiscal_years_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grants` ADD CONSTRAINT `grants_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grants` ADD CONSTRAINT `grants_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grants` ADD CONSTRAINT `grants_fundingAgencyId_fkey` FOREIGN KEY (`fundingAgencyId`) REFERENCES `funding_agencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grants` ADD CONSTRAINT `grants_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `fiscal_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grants` ADD CONSTRAINT `grants_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grants` ADD CONSTRAINT `grants_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grant_roles` ADD CONSTRAINT `grant_roles_grantId_fkey` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grant_roles` ADD CONSTRAINT `grant_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliverables` ADD CONSTRAINT `deliverables_grantId_fkey` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliverables` ADD CONSTRAINT `deliverables_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `fiscal_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliverables` ADD CONSTRAINT `deliverables_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `funding` ADD CONSTRAINT `funding_grantId_fkey` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `funding` ADD CONSTRAINT `funding_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `fiscal_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_deliverableId_fkey` FOREIGN KEY (`deliverableId`) REFERENCES `deliverables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
