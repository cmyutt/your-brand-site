// CODPATCH: release tag helper — creates & pushes git tag (idempotent)
import { execSync } from "node:child_process";

function run(cmd: string) {
  return execSync(cmd, { stdio: "inherit" });
}
function param(name: string) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : null;
}

function buildDefaultTag() {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const tag = `admin-v${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return tag;
}

(async () => {
  run("git rev-parse --is-inside-work-tree");
  run("git fetch --tags");

  const input = param("tag");
  const tag = input || buildDefaultTag();

  // 이미 있으면 재생성하지 않고 그냥 푸시만 시도
  try {
    execSync(`git rev-parse ${tag}`, { stdio: "ignore" });
    console.log(`[release] tag already exists: ${tag} → pushing`);
  } catch {
    run(`git tag -a ${tag} -m "Release ${tag}"`);
  }
  run(`git push origin ${tag}`);
  console.log(`[release] done: ${tag}`);
})();

