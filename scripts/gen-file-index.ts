// 생성: scripts/gen-file-index.ts
import { readdirSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs");
const OUT_FILE = join(OUT_DIR, "FILES_INDEX.md");

// 제외 대상
const IGNORE = new Set(["node_modules", ".next", ".git", ".turbo", "dist", "build"]);
const MAX_DEPTH = 5;

type NodeItem = { name: string; path: string; isDir: boolean; children?: NodeItem[] };

function scan(dir: string, depth = 0): NodeItem[] {
  if (depth > MAX_DEPTH) return [];
  const names = readdirSync(dir, { withFileTypes: true })
    .map((d) => d.name)
    .filter((n) => !IGNORE.has(n));
  const items: NodeItem[] = [];
  for (const name of names) {
    const p = join(dir, name);
    const st = statSync(p);
    const isDir = st.isDirectory();
    const item: NodeItem = { name, path: p, isDir };
    if (isDir) item.children = scan(p, depth + 1);
    items.push(item);
  }
  // 폴더 → 파일 순으로
  items.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
  return items;
}

function renderTree(items: NodeItem[], base: string): string[] {
  const lines: string[] = [];
  function walk(list: NodeItem[], prefix: string) {
    const lastIdx = list.length - 1;
    list.forEach((it, i) => {
      const branch = i === lastIdx ? "└─" : "├─";
      lines.push(`${prefix}${branch} ${it.name}${it.isDir ? "/" : ""}`);
      if (it.isDir && it.children?.length) {
        const nextPrefix = `${prefix}${i === lastIdx ? "   " : "│  "}`;
        walk(it.children, nextPrefix);
      }
    });
  }
  walk(items, "");
  return [relative(base, ROOT) || ".", ...lines];
}

function main() {
  const tree = scan(ROOT);
  const body = renderTree(tree, ROOT).join("\n");
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT_FILE,
    `# 📂 파일 인덱스 (자동 생성)\n\n> ignore: ${[...IGNORE].join(", ")} / depth: ${MAX_DEPTH}\n\n\`\`\`\n${body}\n\`\`\`\n`,
    "utf8"
  );
  console.log("✅ FILES_INDEX.md 업데이트:", OUT_FILE);
}

main();
