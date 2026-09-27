export type ShiftStatus = 'frei' | 'angenommen' | 'gemeldet' | 'bestaetigt';

export type Shift = {
	id: string;
	startsAt: string;
	endsAt: string;
	hours: number;
	status: ShiftStatus;
	assigneeName: string | null;
};

export type Task = {
	id: string;
	title: string;
	description: string;
	urgent: boolean;
	place: string | null;
	categoryId: string;
	shifts: Shift[];
};
