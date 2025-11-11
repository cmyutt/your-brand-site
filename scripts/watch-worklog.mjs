import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const worklogPath = path.resolve(process.cwd(), "codex-worklog.md");

if (!fs.existsSync(worklogPath)) {
  console.error("codex-worklog.md 파일을 찾을 수 없어요.");
  process.exit(1);
}

const printWorklog = () => {
  const contents = fs.readFileSync(worklogPath, "utf8");
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  process.stdout.write("=== codex-worklog.md (실시간 보기) ===\n\n");
  process.stdout.write(contents);
  process.stdout.write("\n\n변경 사항을 감시 중입니다. 중단하려면 Ctrl+C 를 누르세요.\n");
};

printWorklog();

let timer = null;

fs.watch(worklogPath, () => {
  clearTimeout(timer);
  timer = setTimeout(printWorklog, 75);
});
