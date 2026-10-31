-- GaleriKita MySQL Schema v1.0
-- Compatible with MySQL 8.0.16+, InnoDB

CREATE DATABASE IF NOT EXISTS `galerikita` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `galerikita`;

-- 1. App Settings (Shared Password, Quotas, Session Version)
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT NOT NULL PRIMARY KEY DEFAULT 1,
  `password_hash` VARCHAR(255) NOT NULL,
  `session_version` INT NOT NULL DEFAULT 1,
  `storage_quota_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 50000000000,
  `used_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `reserved_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `trash_retention_days` INT NOT NULL DEFAULT 30,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sessions (Session tokens hashed with SHA-256)
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `token_hash` VARCHAR(64) NOT NULL UNIQUE,
  `session_version` INT NOT NULL DEFAULT 1,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sessions_token_hash` (`token_hash`),
  INDEX `idx_sessions_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Media (Photos and Videos)
CREATE TABLE IF NOT EXISTS `media` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `original_filename` VARCHAR(255) NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL UNIQUE,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `media_type` ENUM('image', 'video') NOT NULL,
  `duration_seconds` DECIMAL(10,2) NULL,
  `width` INT NULL,
  `height` INT NULL,
  `is_favorite` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME NULL,
  `purge_requested_at` DATETIME NULL,
  `taken_at` DATETIME NULL,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_media_home` (`deleted_at`, `purge_requested_at`, `taken_at`, `uploaded_at`),
  INDEX `idx_media_favorite` (`is_favorite`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Albums
CREATE TABLE IF NOT EXISTS `albums` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `cover_media_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_albums_cover` FOREIGN KEY (`cover_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Album Media (Many-to-Many Membership)
CREATE TABLE IF NOT EXISTS `album_media` (
  `album_id` INT NOT NULL,
  `media_id` INT NOT NULL,
  `added_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`album_id`, `media_id`),
  CONSTRAINT `fk_album_media_album` FOREIGN KEY (`album_id`) REFERENCES `albums` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_album_media_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE,
  INDEX `idx_album_media_media` (`media_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Media Variants (Thumbnails, Posters, Previews)
CREATE TABLE IF NOT EXISTS `media_variants` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT NOT NULL,
  `variant_type` ENUM('thumbnail', 'poster', 'preview') NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL UNIQUE,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `width` INT NULL,
  `height` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_media_variants_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE,
  INDEX `idx_variants_media_type` (`media_id`, `variant_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Upload Sessions (Resumable Upload Tracking & Quota Reservation)
CREATE TABLE IF NOT EXISTS `upload_sessions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `tus_upload_id` VARCHAR(128) NULL UNIQUE,
  `target_album_id` INT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `expected_bytes` BIGINT UNSIGNED NOT NULL,
  `uploaded_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('pending', 'uploading', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  `reserved_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_upload_sessions_album` FOREIGN KEY (`target_album_id`) REFERENCES `albums` (`id`) ON DELETE SET NULL,
  INDEX `idx_upload_status` (`status`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Processing Jobs (Persistent MySQL Queue for Sharp / FFmpeg / Cleanup)
CREATE TABLE IF NOT EXISTS `processing_jobs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT NOT NULL,
  `job_type` ENUM('thumbnail', 'video_poster', 'metadata', 'purge') NOT NULL,
  `status` ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued',
  `attempts` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 3,
  `error_message` TEXT NULL,
  `scheduled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_processing_jobs_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE,
  INDEX `idx_jobs_queue` (`status`, `scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
