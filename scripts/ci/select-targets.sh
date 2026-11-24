#!/usr/bin/env bash
# Turn the requested deployment targets into a GitHub Actions matrix.
# Shared, identical copy in blade-master, shop-vite-main and work-dispatch-app.
#
#   REQUESTED  comma separated target names, "all", or empty for the "push" list
#   file       .github/deploy-targets.json: {"push": [...], "targets": [{"name": ...}, ...]}
#
# Writes "matrix" to $GITHUB_OUTPUT. Every target field is available as matrix.<field>.
set -euo pipefail

TARGETS_FILE="${TARGETS_FILE:-.github/deploy-targets.json}" python3 - <<'PY'
import json, os, sys

with open(os.environ["TARGETS_FILE"], encoding="utf-8") as f:
    config = json.load(f)
targets = config["targets"]
requested = os.environ.get("REQUESTED", "").strip() or ",".join(config.get("push", []))
wanted = [name.strip() for name in requested.split(",") if name.strip()]
names = [t["name"] for t in targets]

unknown = [n for n in wanted if n != "all" and n not in names]
chosen = targets if "all" in wanted else [t for t in targets if t["name"] in wanted]
if unknown or not chosen:
    print(f"::error::没有匹配的部署目标：{requested}（可选：{', '.join(names)}, all）")
    sys.exit(1)

matrix = json.dumps({"include": chosen}, ensure_ascii=False, separators=(",", ":"))
with open(os.environ.get("GITHUB_OUTPUT") or "/dev/stdout", "a", encoding="utf-8") as out:
    out.write(f"matrix={matrix}\n")
print("部署目标：" + ", ".join(t["name"] for t in chosen))
PY
