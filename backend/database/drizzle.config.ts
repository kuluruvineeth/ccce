import type { Config } from 'drizzle-kit';

export default {
	schema: './src/schema.ts',
	out: './drizzle',
	driver: 'd1',
	dbCredentials: {
		wranglerConfigPath: 'wrangler.toml',
		dbName: 'd1-virtualbox',
	},
};
