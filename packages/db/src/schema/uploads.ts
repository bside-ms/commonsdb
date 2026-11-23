import { relations, sql } from 'drizzle-orm';
import {
	check,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { UPLOAD_KINDS } from '@commonsdb/media/kinds';
import { user } from './auth.ts';

/**
 * Something someone uploaded (ARCHITECTURE "Uploads"). Generic on purpose:
 * images now, documents/audio/video later, without a schema change.
 * Entities point at an upload (task image, profile picture), never at a
 * stored file. Who may see an upload follows from what points at it.
 */
export const upload = pgTable(
	'upload',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		kind: text('kind', { enum: UPLOAD_KINDS }).notNull(),
		/** Detected from the file's bytes, not the browser's claim. */
		mime: text('mime').notNull(),
		/** As the uploader named it; shown on downloads later. */
		originalName: text('original_name'),
		/** Size of what was uploaded (the stored variants differ). */
		bytes: integer('bytes').notNull(),
		/** Kind-specific facts: { width, height } for images; later duration, pages. */
		meta: jsonb('meta').$type<Record<string, number | string>>().notNull().default({}),
		uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('upload_kind_check', sql`${t.kind} in ('image', 'document', 'audio', 'video')`),
		check('upload_bytes_check', sql`${t.bytes} > 0`)
	]
);

/**
 * What is stored for an upload: one row per variant. Images: 'large' and
 * 'thumb' (WebP). Later: 'original', 'preview' (PDF page 1), 'poster'.
 */
export const uploadFile = pgTable(
	'upload_file',
	{
		uploadId: uuid('upload_id')
			.notNull()
			.references(() => upload.id, { onDelete: 'cascade' }),
		variant: text('variant').notNull(),
		/** Opaque key in FileStorage. */
		storageKey: text('storage_key').notNull().unique(),
		mime: text('mime').notNull(),
		bytes: integer('bytes').notNull(),
		/** Set for images, so pages can reserve the space (no layout jump). */
		width: integer('width'),
		height: integer('height')
	},
	// the primary key starts with upload_id, so it also serves lookups by upload
	(t) => [primaryKey({ columns: [t.uploadId, t.variant] })]
);

export const uploadRelations = relations(upload, ({ many, one }) => ({
	files: many(uploadFile),
	uploader: one(user, { fields: [upload.uploadedBy], references: [user.id] })
}));

export const uploadFileRelations = relations(uploadFile, ({ one }) => ({
	upload: one(upload, { fields: [uploadFile.uploadId], references: [upload.id] })
}));

export type Upload = typeof upload.$inferSelect;
export type UploadFile = typeof uploadFile.$inferSelect;
