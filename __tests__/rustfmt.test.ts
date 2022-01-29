import rustfmt from "../src/rustfmt";

test("rustfmt check output is empty when nothing is required", async () => {
  expect(
    await rustfmt(["-l", "--check"], "--manifest-path __tests__/Cargo.toml")
  ).toEqual([]);
});

test("rustfmt check output fails if formatting is required", async () => {
  try {
    await rustfmt(["-l", "--check"]);
  } catch (e: any) {
    expect(e.message).toContain(".cargo/bin/cargo' failed with exit code 1");
  }
});

test("rustfmt check output lists files to be formatted", async () => {
  expect(await rustfmt(["-l", "--emit", "stdout"])).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`${process.cwd()}/src/main.rs`),
    ])
  );
});
