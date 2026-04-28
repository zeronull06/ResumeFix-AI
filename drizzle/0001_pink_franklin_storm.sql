CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`tier` enum('free','paid') NOT NULL DEFAULT 'free',
	`resumeText` text NOT NULL,
	`jobDescription` text NOT NULL,
	`atsScore` int,
	`missingKeywords` json,
	`suggestions` json,
	`optimizedResume` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
