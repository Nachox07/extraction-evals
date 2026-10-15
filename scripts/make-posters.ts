/**
 * Renders examples/synthetic/posters.json to PNG posters, plus items.json and
 * key.json that the scorer reads. Text is drawn from an SVG with sharp, so the
 * posters carry no real venue, logo or photo.
 *
 * Usage: npm run posters
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

interface Spec {
	id: string;
	lines: string[];
	bg: string;
	fg: string;
	publishedAt?: string;
	seenAt?: string;
	key: { event: boolean; day?: string; weekdays?: string[] };
	why: string;
}

const DIR = "examples/synthetic";
const SEEN = "2026-10-08T14:00:00";
const SIZE = 1080;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(p: Spec): string {
	const n = p.lines.length;
	const gap = 130;
	const top = SIZE / 2 - ((n - 1) * gap) / 2;
	const text = p.lines
		.map((l, i) => {
			const size = i === 0 ? 76 : l.length > 24 ? 50 : 60;
			const weight = i === 0 ? 700 : 500;
			return `<text x="50%" y="${top + i * gap}" font-family="Poppins, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${p.fg}" text-anchor="middle" dominant-baseline="middle">${esc(l)}</text>`;
		})
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="100%" height="100%" fill="${p.bg}"/><rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}" fill="none" stroke="${p.fg}" stroke-width="4" opacity="0.5"/>${text}</svg>`;
}

const specs: Spec[] = JSON.parse(readFileSync(join(DIR, "posters.json"), "utf8")).items;
mkdirSync(join(DIR, "posters"), { recursive: true });
const items = [];
const key: Record<string, Spec["key"]> = {};
for (const p of specs) {
	await sharp(Buffer.from(svg(p))).png({ compressionLevel: 9 }).toFile(join(DIR, "posters", `${p.id}.png`));
	items.push({ id: p.id, image: `posters/${p.id}.png`, seenAt: p.seenAt ?? SEEN, publishedAt: p.publishedAt ?? p.seenAt ?? SEEN, city: "Málaga" });
	key[p.id] = p.key;
}
writeFileSync(join(DIR, "items.json"), JSON.stringify(items, null, 1) + "\n");
writeFileSync(join(DIR, "key.json"), JSON.stringify(key, null, 1) + "\n");
console.log(`${specs.length} posters → ${DIR}/posters, items.json, key.json`);
