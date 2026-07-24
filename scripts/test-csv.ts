// CSV round-trip test: values with commas, quotes, and newlines must survive
// toCsv → parseCsv unchanged, and Excel BOM / CRLF must parse cleanly.
import { parseCsv, toCsv } from "../src/lib/csv";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const rows = [
    ["SKU", "Name", "Price", "Note"],
    ["AV-001", "Hammer Coral", "45.00", "Bright, waves nicely"],
    ["AV-002", 'Zoa "Utter Chaos"', "89.99", "Comma, in, note"],
    ["AV-003", "Multi\nline\nname", "12", ""],
    ["AV-004", "Trailing quote\"", "0", "ends,with,commas,"],
  ];

  const csv = toCsv(rows);
  const parsed = parseCsv(csv);

  assert(parsed.length === rows.length, `row count ${parsed.length} != ${rows.length}`);
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows[i].length; j++) {
      assert(
        parsed[i][j] === String(rows[i][j]),
        `cell [${i}][${j}] "${parsed[i][j]}" != "${rows[i][j]}"`,
      );
    }
  }
  console.log("  ✓ round-trip preserves commas, quotes, newlines");

  // BOM + CRLF (Excel-style) input
  const excel = "﻿SKU,Price\r\nAV-1,10\r\nAV-2,20\r\n";
  const p2 = parseCsv(excel);
  assert(p2.length === 3 && p2[0][0] === "SKU", "BOM/CRLF header parse");
  assert(p2[1][0] === "AV-1" && p2[2][1] === "20", "BOM/CRLF data parse");
  console.log("  ✓ Excel BOM + CRLF handled");

  // Blank lines are skipped
  const blanks = parseCsv("A,B\n\n\nC,D\n");
  assert(blanks.length === 2, `blank-line skip (${blanks.length})`);
  console.log("  ✓ blank lines skipped");

  console.log("CSV test passed.");
}

try {
  main();
  process.exit(0);
} catch (e) {
  console.error("CSV test FAILED:", e);
  process.exit(1);
}
