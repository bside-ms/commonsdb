import * as v from 'valibot';
import { HoursInput } from '../tasks/schema.ts';
import { optionalText } from '../validation.ts';

/** How long a guest code can be redeemed. Admins can still assign after. */
export const CLAIM_VALID_MONTHS = 3;
/** Leads may record guest work from the Aktion's day until this many days after. */
export const LEAD_DAYS_AFTER = 7;

export const GuestWorkInput = v.object({
	taskId: v.pipe(v.string('task_not_found'), v.uuid('task_not_found')),
	hours: HoursInput,
	guestName: optionalText(80, 'guest_name_too_long')
});

export const RedeemInput = v.object({
	code: v.pipe(v.string('claim_code_required'), v.trim(), v.nonEmpty('claim_code_required'))
});

export const AssignClaimInput = v.object({
	userId: v.pipe(v.string('user_not_found'), v.nonEmpty('user_not_found'))
});
