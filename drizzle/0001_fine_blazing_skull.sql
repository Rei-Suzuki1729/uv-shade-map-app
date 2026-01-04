CREATE TABLE `favorite_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`latitude` varchar(20) NOT NULL,
	`longitude` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`data` text,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`read_flag` int NOT NULL DEFAULT 0,
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`high_uv_alert` int NOT NULL DEFAULT 1,
	`high_uv_threshold` varchar(10) NOT NULL DEFAULT '6.0',
	`shade_reminder` int NOT NULL DEFAULT 1,
	`shade_reminder_interval` int NOT NULL DEFAULT 30,
	`push_token` varchar(255),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `route_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`start_name` varchar(255),
	`start_lat` varchar(20) NOT NULL,
	`start_lng` varchar(20) NOT NULL,
	`end_name` varchar(255),
	`end_lat` varchar(20) NOT NULL,
	`end_lng` varchar(20) NOT NULL,
	`route_type` varchar(50) NOT NULL,
	`distance` varchar(20),
	`duration` int,
	`shade_percentage` varchar(10),
	`uv_exposure` varchar(20),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `route_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`query` varchar(255) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(20),
	`result_count` int DEFAULT 0,
	`searched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uv_data_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`latitude` varchar(20) NOT NULL,
	`longitude` varchar(20) NOT NULL,
	`uv_index` varchar(10) NOT NULL,
	`uv_max` varchar(10),
	`uv_max_time` varchar(10),
	`ozone` varchar(10),
	`ozone_time` varchar(10),
	`safe_exposure_time` int,
	`fetched_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `uv_data_cache_id` PRIMARY KEY(`id`)
);
