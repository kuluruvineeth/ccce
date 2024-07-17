CREATE TABLE `users_to_virtualboxes` (
	`userId` integer NOT NULL,
	`virtualboxId` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`virtualboxId`) REFERENCES `virtualbox`(`id`) ON UPDATE no action ON DELETE no action
);
