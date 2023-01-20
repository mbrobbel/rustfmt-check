# rustfmt-check

GitHub Action to format [Rust] code using [rustfmt].

This action can be used to keep [Rust] code formatted correctly. A commit is pushed when formatting is required.

## Arguments

See [action.yml](./action.yml).

## Example

```
on: push

name: Rustfmt

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: dtolnay/rust-toolchain@stable
      - uses: mbrobbel/rustfmt-check@master
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

[rust]: https://github.com/rust-lang/rust
[rustfmt]: https://github.com/rust-lang/rustfmt
