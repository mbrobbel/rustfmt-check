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
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
            toolchain: stable
            components: rustfmt
            override: true
      - uses: mbrobbel/rustfmt-check@master
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Modes

The plan is to add more output modes:

- Open pull request.
- Add review with suggestions.
- Check mode to fail the job if formatting is required.

Inspired by the actions of the [actions-rs] team.

[Rust]: https://github.com/rust-lang/rust
[rustfmt]: https://github.com/rust-lang/rustfmt
[actions-rs]: https://github.com/actions-rs
