const origRepeat = String.prototype.repeat;
String.prototype.repeat = function patchedRepeat(count, ...rest) {
  if (typeof count === "number" && count < 0) {
    const err = new Error("String.repeat called with negative count");
    err.stack = err.stack
      ?.split("\n")
      .filter((line) => !line.includes("patchedRepeat"))
      .join("\n");
    console.error("[trace-repeat] repeat called with", count, "on", JSON.stringify(String(this)), "\n", err.stack);
  }
  return origRepeat.call(this, count, ...rest);
};
