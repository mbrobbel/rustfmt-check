import rustfmt from "../src/rustfmt";
import check from "../src/check";

jest.setTimeout(30000);

test("rustfmt check output is empty when nothing is required", async () => {
  expect(
    await rustfmt(
      ["-l", "--check"],
      "--manifest-path __tests__/formatted/Cargo.toml",
    ),
  ).toEqual([]);
});

test("rustfmt check output fails if formatting is required", async () => {
  try {
    await rustfmt(
      ["-l", "--check"],
      "--manifest-path __tests__/needs-formatting/Cargo.toml",
    );
    throw new Error("rustfmt did not fail");
  } catch (e: any) {
    expect(e.message).toContain(".cargo/bin/cargo' failed with exit code 1");
  }
});

test("rustfmt check output lists files to be formatted", async () => {
  expect(
    await rustfmt(
      ["-l", "--emit", "stdout"],
      "--manifest-path __tests__/needs-formatting/Cargo.toml",
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining("__tests__/needs-formatting/src/main.rs"),
      expect.stringContaining("__tests__/needs-formatting/src/lib.rs"),
    ])
  );
});

test("rustfmt check mode outputs lists of changes", async () => {
  const output = await check(
    "--manifest-path __tests__/needs-formatting/Cargo.toml"
  );
  expect(output.map((result) => result.path)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("__tests__/needs-formatting/src/main.rs"),
      expect.stringContaining("__tests__/needs-formatting/src/lib.rs"),
    ])
  );
  expect(
    output
      .map((result) => result.mismatch)
      .map((mismatch) => mismatch.original_begin_line)
  ).toEqual([1, 1, 8, 10]);
  expect(
    output
      .map((result) => result.mismatch)
      .map((mismatch) => mismatch.expected_begin_line)
  ).toEqual([1, 1, 5, 7]);
});
