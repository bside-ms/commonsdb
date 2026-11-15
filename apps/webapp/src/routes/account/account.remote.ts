/*
 * The member's own ledger account. Members only ever see their own.
 */
import { query } from '$app/server';
import { getOwnAccount, getOwnBalance } from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireActor, toHttpError } from '#lib/server/guards.ts';

export const ownAccount = query(async () => getOwnAccount(db, requireActor()).catch(toHttpError));

/** Just the number, for the start page. */
export const ownBalance = query(async () => getOwnBalance(db, requireActor()).catch(toHttpError));
