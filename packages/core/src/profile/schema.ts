import * as v from 'valibot';
import {PHOTO_VISIBILITY, PROFILE_VISIBILITY} from '@commonsdb/db/schema';

const optionalText = (max: number, code: string) =>
    v.pipe(
        v.optional(v.string(), ''),
        v.trim(),
        v.maxLength(max, code),
        v.transform((s) => (s === '' ? null : s))
    );

export const ProfileInput = v.object({
    displayName: v.pipe(
        v.string('profile_display_name_required'),
        v.trim(),
        v.nonEmpty('profile_display_name_required'),
        v.maxLength(80, 'profile_display_name_too_long')
    ),
    pronoun: optionalText(40, 'profile_pronoun_too_long'),
    phone: optionalText(40, 'profile_phone_too_long'),
    accessibilityNote: optionalText(1000, 'profile_accessibility_note_too_long'),
    interests: v.optional(v.array(v.string())),
    visibility: v.picklist(PROFILE_VISIBILITY, 'profile_visibility_invalid'),
    photoVisibility: v.picklist(PHOTO_VISIBILITY, 'profile_photo_visibility_invalid'),
    notifyByEmail: v.boolean(),
    notifyNewTasks: v.boolean()
});
export type ProfileInput = v.InferInput<typeof ProfileInput>;

export const OnboardingInput = v.object({
    ...ProfileInput.entries,
    acceptRules: v.literal(true, 'onboarding_rules_not_accepted')
});
export type OnboardingInput = v.InferInput<typeof OnboardingInput>;