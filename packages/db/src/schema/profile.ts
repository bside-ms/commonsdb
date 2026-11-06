import {relations, sql} from 'drizzle-orm';
import {boolean, check, jsonb, pgTable, text, timestamp} from 'drizzle-orm/pg-core';
import {user} from './auth.ts';

export const PROFILE_VISIBILITY = ['members', 'admins'] as const;
export const PHOTO_VISIBILITY = ['members', 'admins', 'nobody'] as const;

/**
 * The human-facing person. One per user, created on first login.
 */
export const profile = pgTable(
    'profile',
    {
        userId: text('user_id')
            .primaryKey()
            .references(() => user.id, {onDelete: 'cascade'}),
        displayName: text('display_name').notNull(),
        pronoun: text('pronoun'),
        phone: text('phone'),
        /** Free text, shown to admins organising a shift. NOT A MEDICAL RECORD */
        accessibilityNote: text('accessibility_note'),
        /** Super-category ids. JSON until categories exist (slice 2). */
        interests: jsonb('interests').$type<string[]>().notNull().default([]),
        visibility: text('visibility', {enum: PROFILE_VISIBILITY}).notNull().default('members'),
        photoVisibility: text('photo_visibility', {enum: PHOTO_VISIBILITY})
            .notNull()
            .default('members'),
        notifyByEmail: boolean('notify_by_email').notNull().default(true),
        notifyNewTasks: boolean('notify_new_tasks').notNull().default(false),
        onboardedAt: timestamp('onboarded_at', {withTimezone: true}),
        rulesAcceptedAt: timestamp('rules_accepted_at', {withTimezone: true}),
        createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', {withTimezone: true})
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date())
    },
    (t) => [
        check('profile_visibility_check', sql`
            ${t.visibility}
            in ('members', 'admins')
        `),
        check(
            'profile_photo_visibility_check',
            sql`
                ${t.photoVisibility}
                in ('members', 'admins', 'nobody')
            `
        )
    ]
);

export const profileRelations = relations(profile, ({one}) => ({
    user: one(user, {fields: [profile.userId], references: [user.id]})
}));

export type Profile = typeof profile.$inferSelect;