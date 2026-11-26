"""Fail when a Windows PowerShell workflow step contains non-ASCII characters.

Windows PowerShell 5.1 (`shell: powershell`) reads the generated step script with the
runner's ANSI code page (GBK on a Chinese Windows). Chinese text in the script is then
decoded wrongly and can swallow a closing quote, so the whole step fails to parse.
Keep PowerShell steps ASCII-only; YAML comments outside `run:` are fine.

No third-party packages: steps are found by indentation, which is how our workflows are
written (`- name:` items under `steps:`, `run: |` blocks indented below the key).

Shared, identical copy in blade-master, shop-vite-main and work-dispatch-app.
Usage: python3 scripts/ci/check-workflows.py [.github/workflows/*.yml ...]
"""
import glob
import re
import sys


def indent(line):
    return len(line) - len(line.lstrip(" "))


def steps_of(lines):
    """Yield (first_line_number, step_lines) for every list item under a `steps:` key."""
    i = 0
    while i < len(lines):
        if re.match(r"^\s*steps:\s*$", lines[i]):
            base = indent(lines[i])
            i += 1
            current, start, item_indent = [], 0, None
            while i < len(lines):
                line = lines[i]
                if line.strip() and indent(line) <= base:
                    break
                m = re.match(r"^(\s*)- ", line)
                if m and (item_indent is None or len(m.group(1)) == item_indent):
                    if current:
                        yield start, current
                    item_indent, current, start = len(m.group(1)), [line], i + 1
                elif current:
                    current.append(line)
                i += 1
            if current:
                yield start, current
            continue
        i += 1


def job_default_shells(lines):
    """Map line number -> default run shell of the job that contains it."""
    shells, shell = {}, ""
    for number, line in enumerate(lines, 1):
        if re.match(r"^  [A-Za-z0-9_-]+:\s*$", line):
            shell = ""
        m = re.match(r"^\s+shell:\s*(.+)$", line)
        if m and number > 1 and re.match(r"^\s*run:\s*$", lines[number - 2]):
            shell = m.group(1)
        shells[number] = shell
    return shells


problems = []
files = sys.argv[1:] or sorted(glob.glob(".github/workflows/*.yml") + glob.glob(".github/workflows/*.yaml"))
for path in files:
    lines = open(path, encoding="utf-8").read().split("\n")
    defaults = job_default_shells(lines)
    for start, step in steps_of(lines):
        text = "\n".join(step)
        m = re.search(r"^\s*-?\s*shell:\s*(.+)$", text, re.M)
        shell = m.group(1) if m else defaults.get(start, "")
        if "powershell" not in shell:
            continue
        name = re.search(r"name:\s*(.+)", text)
        in_run, run_indent = False, 0
        for offset, line in enumerate(step):
            m = re.match(r"^(\s*)(-\s+)?run:\s*(.*)$", line)
            if m:
                in_run, run_indent = True, len(m.group(1)) + len(m.group(2) or "")
                body = [m.group(3)] if m.group(3) not in ("|", ">", "|-", ">-", "") else []
            elif in_run and line.strip() and indent(line) <= run_indent:
                in_run = False
                continue
            elif in_run:
                body = [line]
            else:
                continue
            for part in body:
                if any(ord(ch) > 127 for ch in part):
                    problems.append(f"{path}:{start + offset} step '{name.group(1).strip() if name else '?'}': {part.strip()[:80]}")

if problems:
    print("::error::Windows PowerShell steps must be ASCII-only (non-ASCII text breaks parsing on the runner):")
    for problem in problems:
        print("  " + problem)
    sys.exit(1)
print(f"PowerShell steps are ASCII-only ({len(files)} workflow file(s) checked)")
