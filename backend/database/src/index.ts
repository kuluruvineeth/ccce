/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { and, eq, sql } from 'drizzle-orm';
import { user } from './schema';
import { json } from 'itty-router-extras';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import * as schema from './schema';

export interface Env {
	DB: D1Database;
	STORAGE: any;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const success = new Response('Success', { status: 200 });
		const notFound = new Response('Not Found', { status: 404 });
		const methodNotAllowed = new Response('Method Not Allowed', { status: 405 });
		const invalidRequest = new Response('Invalid Request', { status: 400 });
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		console.log(path);

		const db = drizzle(env.DB, { schema });

		if (path === '/api/virtualbox') {
			if (method === 'GET') {
				const params = url.searchParams;
				if (params.has('id')) {
					const id = params.get('id') as string;
					const res = await db.query.virtualbox.findFirst({
						where: (virtualbox, { eq }) => eq(virtualbox.id, id),
						with: {
							usersToVirtualboxes: true,
						},
					});
					return json(res ?? {});
				} else {
					const res = await db.select().from(schema.virtualbox).all();
					return json(res ?? {});
				}
			} else if (method === 'DELETE') {
				const params = url.searchParams;
				if (params.has('id')) {
					const id = params.get('id') as string;
					await db.delete(schema.usersToVirtualboxes).where(eq(schema.usersToVirtualboxes.virtualboxId, id));
					await db.delete(schema.virtualbox).where(eq(schema.virtualbox.id, id));

					const deleteStorageRequest = new Request('https://storage.cestorage.workers.dev/api/project', {
						method: 'DELETE',
						body: JSON.stringify({ virtualboxId: id }),
						headers: { 'Content-Type': 'application/json' },
					});
					const deleteStorageRes = await env.STORAGE.fetch(deleteStorageRequest);
					return success;
				} else {
					return invalidRequest;
				}
			} else if (method === 'POST') {
				const initSchema = z.object({
					id: z.string(),
					name: z.string().optional(),
					visibility: z.enum(['public', 'private']).optional(),
				});

				const body = await request.json();
				const { id, name, visibility } = initSchema.parse(body);

				const vb = await db.update(schema.virtualbox).set({ name, visibility }).where(eq(schema.virtualbox.id, id)).returning().get();

				return success;
			} else if (method === 'PUT') {
				const initSchema = z.object({
					type: z.enum(['react', 'node']),
					name: z.string(),
					userId: z.string(),
					visibility: z.enum(['public', 'private']),
				});

				const body = await request.json();
				const { type, name, userId, visibility } = initSchema.parse(body);

				const vb = await db.insert(schema.virtualbox).values({ type, name, userId, visibility }).returning().get();

				const initStorageRequest = new Request(`https://storage.cestorage.workers.dev/api/init`, {
					method: 'POST',
					body: JSON.stringify({ virtualboxId: vb.id, type }),
					headers: {
						'Content-Type': 'application/json',
					},
				});

				await env.STORAGE.fetch(initStorageRequest);
				return new Response(vb.id, { status: 200 });
			}
		} else if (path === '/api/virtualbox/share') {
			if (method === 'GET') {
				const params = url.searchParams;

				if (params.has('id')) {
					const id = params.get('id') as string;
					const res = await db.query.usersToVirtualboxes.findMany({
						where: (utv, { eq }) => eq(utv.userId, id),
					});

					const owners = await Promise.all(
						res.map(async (r) => {
							const vb = await db.query.virtualbox.findFirst({
								where: (virtualbox, { eq }) => eq(virtualbox.id, r.virtualboxId),
								with: {
									author: true,
								},
							});
							if (!vb) return;
							return { id: vb.id, name: vb.name, type: vb.type, author: vb.author, sharedOn: r.sharedOn };
						})
					);

					return json(owners ?? {});
				} else return invalidRequest;
			} else if (method === 'POST') {
				const shareSchema = z.object({
					virtualboxId: z.string(),
					email: z.string(),
				});

				const body = await request.json();

				const { virtualboxId, email } = shareSchema.parse(body);

				const user = await db.query.user.findFirst({
					where: (user, { eq }) => eq(user.email, email),
					with: {
						virtualbox: true,
						usersToVirtualboxes: true,
					},
				});

				if (!user) {
					return new Response('No user associated with email', { status: 400 });
				}

				if (user.virtualbox.find((vb) => vb.id === virtualboxId)) {
					return new Response('Cannot share with yourself!', { status: 400 });
				}

				if (user.usersToVirtualboxes.find((utv) => utv.virtualboxId === virtualboxId)) {
					return new Response('User already has access.', { status: 400 });
				}

				await db.insert(schema.usersToVirtualboxes).values({ userId: user.id, virtualboxId, sharedOn: new Date() }).get();

				return success;
			} else if (method === 'DELETE') {
				const deleteShareSchema = z.object({
					virtualboxId: z.string(),
					userId: z.string(),
				});

				const body = await request.json();

				const { virtualboxId, userId } = deleteShareSchema.parse(body);

				await db
					.delete(schema.usersToVirtualboxes)
					.where(and(eq(schema.usersToVirtualboxes.userId, userId), eq(schema.usersToVirtualboxes.virtualboxId, virtualboxId)));

				return success;
			} else return methodNotAllowed;
		} else if (path === '/api/virtualbox/generate' && method === 'POST') {
			const generateSchema = z.object({ userId: z.string() });

			const body = await request.json();

			const { userId } = generateSchema.parse(body);

			const dbUser = await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.id, userId),
			});

			if (!dbUser) {
				return new Response('User not found', { status: 400 });
			}

			if (dbUser.generations !== null && dbUser.generations >= 30) {
				return new Response('You reached the maximum # of generations.', { status: 400 });
			}

			await db
				.update(user)
				.set({ generations: sql`${user.generations} + 1` })
				.where(eq(user.id, userId))
				.get();

			return success;
		} else if (path === '/api/user') {
			if (method === 'GET') {
				const params = url.searchParams;

				if (params.has('id')) {
					const id = params.get('id') as string;
					const res = await db.query.user.findFirst({
						where: (user, { eq }) => eq(user.id, id),
						with: {
							virtualbox: true,
							usersToVirtualboxes: true,
						},
					});
					return json(res ?? {});
				} else {
					const res = await db.select().from(user).all();
					return new Response(JSON.stringify(res));
				}
			} else if (method === 'POST') {
				const userSchema = z.object({
					id: z.string(),
					name: z.string(),
					email: z.string().email(),
				});

				const body = await request.json();

				const { id, name, email } = userSchema.parse(body);

				const res = await db.insert(user).values({ id, name, email }).returning().get();
				return json({ res });
			} else return new Response('Method Not Found', { status: 405 });
		} else return new Response('Not Found', { status: 404 });
	},
};
