/**
 * Demo categories, mirroring the prototype's areas. Idempotent: does
 * nothing if any super category exists. Run with `pnpm db:seed`.
 * Tasks are not seeded: admins create them (that is the slice 2 demo).
 */
import {createDb} from './client.ts';
import {category, superCategory} from './schema/index.ts';

const TAXONOMY: Record<string, string[]> = {
    'Haus & Hof': ['Reinigung', 'Reparatur', 'Garten'],
    Küche: ['Kochen', 'Abwasch', 'Einkauf'],
    Veranstaltungen: ['Aufbau', 'Tresen', 'Abbau'],
    Verwaltung: ['Büro', 'Kommunikation']
};

process.loadEnvFile('../../.env');
const {db, close} = createDb(process.env.DATABASE_URL!);

try {
    const existing = await db.select({id: superCategory.id}).from(superCategory).limit(1);
    if (existing.length > 0) {
        console.log('categories exist, skipping');
    } else {
        await db.transaction(async (tx) => {
            let sp = 0;
            for (const [name, children] of Object.entries(TAXONOMY)) {
                const [s] = await tx
                    .insert(superCategory)
                    .values({name, position: sp++})
                    .returning({id: superCategory.id});
                await tx
                    .insert(category)
                    .values(children.map((c, i) => ({superCategoryId: s.id, name: c, position: i})));
            }
        });
        console.log('seeded categories');
    }
} finally {
    await close();
}
