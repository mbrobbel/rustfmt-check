interface Result {
    path: string;
    mismatch: Mismatch;
}
interface Mismatch {
    original_begin_line: number;
    original_end_line: number;
    expected_begin_line: number;
    expected_end_line: number;
    original: string;
    expected: string;
}
declare const check: (args?: string, rustfmt_args?: string) => Promise<Result[]>;
export default check;
