import { createId } from '@paralleldrive/cuid2';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const user = sqliteTable('user', {
	id: text('id')
		.$defaultFn(() => createId())
		.primaryKey()
		.unique(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	image: text('image'),
	generations: integer('generations').default(0),
});

export type User = typeof user.$inferSelect;

export const userRelations = relations(user, ({ many }) => ({
	virtualbox: many(virtualbox),
	usersToVirtualboxes: many(usersToVirtualboxes),
}));

export const virtualbox = sqliteTable('virtualbox', {
	id: text('id')
		.$defaultFn(() => createId())
		.primaryKey()
		.unique(),
	name: text('name').notNull(),
	type: text('type', { enum: ['react', 'node'] }).notNull(),
	visibility: text('visibility', { enum: ['public', 'private'] }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
});

export type Virtualbox = typeof virtualbox.$inferSelect;

export const virtualBoxRelations = relations(virtualbox, ({ one, many }) => ({
	author: one(user, {
		fields: [virtualbox.userId],
		references: [user.id],
		relationName: 'virtualbox',
	}),
	usersToVirtualboxes: many(usersToVirtualboxes),
}));

export const usersToVirtualboxes = sqliteTable('users_to_virtualboxes', {
	userId: text('userId')
		.notNull()
		.references(() => user.id),
	virtualboxId: text('virtualboxId')
		.notNull()
		.references(() => virtualbox.id),
	sharedOn: integer('sharedOn', { mode: 'timestamp_ms' }),
});

export const usersToVirtualboxesRelations = relations(usersToVirtualboxes, ({ one }) => ({
	group: one(virtualbox, {
		fields: [usersToVirtualboxes.virtualboxId],
		references: [virtualbox.id],
	}),
	user: one(user, {
		fields: [usersToVirtualboxes.userId],
		references: [user.id],
	}),
}));
