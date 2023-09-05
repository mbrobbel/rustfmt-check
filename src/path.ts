import { normalize, relative } from "path";

export const normalize_path = (path: string): string => {
  return normalize(relative(`${process.env.GITHUB_WORKSPACE}`, path)).replace(
    "/\\/g",
    "/",
  );
};
