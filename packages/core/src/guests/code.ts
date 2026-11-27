import { createHash, randomInt } from 'node:crypto';

/** No 0/O, 1/I/L: read off a paper slip without guessing. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** 'K7QM-R2XW'. 31^8 ≈ 8.5·10¹¹ codes; redeeming needs an account. */
export function newClaimCode(): string {
	let s = '';
	for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
	return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Case and dashes/spaces don't matter when typing it in. */
export const normalizeCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const hashCode = (code: string) =>
	createHash('sha256').update(normalizeCode(code)).digest('hex');
