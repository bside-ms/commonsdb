/*
 * What the task form and the series form share: the posted shape of the
 * template fields (title ... shifts) and how to fill them from stored data.
 * TemplateFields.svelte renders them.
 */
import type { AdminSeries, AdminShift, LinkView } from '@commonsdb/core';
import type { RichTextDoc } from '@commonsdb/richtext';
import { hoursValue } from '#lib/format.ts';

/** One shift row: id for existing shifts, '' for new ones; times '' = none. */
export type ShiftFormData = {
	id: string;
	startsTime: string;
	endsTime: string;
	hours: string;
};

/** The template part of TaskFormData and SeriesFormData. */
export type TemplateFormData = {
	title: string;
	categoryId: string;
	description?: string;
	urgent?: boolean;
	selfService?: boolean;
	place?: string;
	contact?: string;
	bring?: string;
	physicalDemands?: string;
	shifts: ShiftFormData[];
	/** Wiki pages as keys 'builtin:<page id>'. */
	links?: string[];
	/** A new photo; stored by the remote function, core only sees its id. */
	image?: File;
	removeImage?: boolean;
	/** The current photo's upload id ('' = none), posted back to keep it. */
	imageId?: string;
	imageAlt?: string;
};

export type TemplateInitial = Required<Omit<TemplateFormData, 'image' | 'removeImage'>> & {
	description: string;
	/** Titles of the stored links, for the list before anything changes. */
	linkViews: LinkView[];
};

export const EMPTY_SHIFT: ShiftFormData = { id: '', startsTime: '', endsTime: '', hours: '' };

/** Initial values from a stored task or series; defaults for a new one. */
export function templateInitial(
	source?: {
		title: string;
		categoryId: string;
		description: RichTextDoc | null;
		urgent: boolean;
		selfService: boolean;
		place: string | null;
		contact: string | null;
		bring: string | null;
		physicalDemands: string | null;
		links?: LinkView[];
		imageId?: string | null;
		imageAlt?: string | null;
	},
	shifts?: (AdminShift | AdminSeries['shiftTemplates'][number])[]
): TemplateInitial {
	return {
		title: source?.title ?? '',
		categoryId: source?.categoryId ?? '',
		description: source?.description ? JSON.stringify(source.description) : '',
		urgent: source?.urgent ?? false,
		selfService: source?.selfService ?? false,
		place: source?.place ?? '',
		contact: source?.contact ?? '',
		bring: source?.bring ?? '',
		physicalDemands: source?.physicalDemands ?? '',
		shifts: shifts?.length
			? shifts.map((s) => ({
					id: 'id' in s ? s.id : '',
					startsTime: s.startsTime ?? '',
					endsTime: s.endsTime ?? '',
					hours: hoursValue(s.hoursTenths)
				}))
			: [EMPTY_SHIFT],
		imageId: source?.imageId ?? '',
		imageAlt: source?.imageAlt ?? '',
		links: source?.links?.map((l) => l.key) ?? [],
		linkViews: source?.links ?? []
	};
}
