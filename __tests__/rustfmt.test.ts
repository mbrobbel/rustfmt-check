import rustfmt from "../src/rustfmt";

jest.setTimeout(30000);

test("rustfmt check output is empty when nothing is required", async () => {
  expect(
    await rustfmt(
      ["-l", "--check"],
      "--manifest-path __tests__/formatted/Cargo.toml"
    )
  ).toEqual([]);
});

test("rustfmt check output fails if formatting is required", async () => {
  try {
    await rustfmt(
      ["-l", "--check"],
      "--manifest-path __tests__/needs-formatting/Cargo.toml"
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
      "--manifest-path __tests__/needs-formatting/Cargo.toml"
    )
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining("__tests__/needs-formatting/src/main.rs"),
    ])
  );
});
