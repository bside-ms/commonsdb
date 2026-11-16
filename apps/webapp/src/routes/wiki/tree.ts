import type { WikiTreeItem } from '@commonsdb/core';

export type TreeNode = WikiTreeItem & { depth: number; children: TreeNode[] };

/** The flat page list (already ordered) as nested nodes. */
export function nest(items: WikiTreeItem[]): TreeNode[] {
	const byParent = new Map<string | null, WikiTreeItem[]>();
	for (const item of items) {
		byParent.set(item.parentId, [...(byParent.get(item.parentId) ?? []), item]);
	}
	const build = (parentId: string | null, depth: number): TreeNode[] =>
		(byParent.get(parentId) ?? []).map((item) => ({
			...item,
			depth,
			children: build(item.id, depth + 1)
		}));
	return build(null, 1);
}

/** Pages a new or moved page may go under, as select options ("— " per level). */
export function parentOptions(
	items: WikiTreeItem[],
	{ maxDepth, exclude, levels = 1 }: { maxDepth: number; exclude?: string; levels?: number }
) {
	const out: { value: string; label: string }[] = [];
	const walk = (nodes: TreeNode[]) => {
		for (const n of nodes) {
			if (n.id === exclude) continue; // not into itself or below
			if (n.depth + levels <= maxDepth) {
				out.push({ value: n.id, label: `${'— '.repeat(n.depth - 1)}${n.title}` });
			}
			walk(n.children);
		}
	};
	walk(nest(items));
	return out;
}
