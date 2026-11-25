#!/usr/bin/env bash
# Turn the requested deployment targets into a GitHub Actions matrix.
# Shared, identical copy in blade-master, shop-vite-main and work-dispatch-app.
#
#   REQUESTED        target chosen when running the workflow by hand:
#                    a server name, "all", or "default"/empty
#   DEFAULT_TARGETS  repository variable DEPLOY_TARGETS, e.g. "server-120,myvps";
#                    used for pushes and for "default". Falls back to "default" in the file.
#   file             .github/deploy-targets.json: {"default": [...], "targets": [{"name": ...}, ...]}
#
# Writes "matrix" to $GITHUB_OUTPUT. Every target field is available as matrix.<field>.
set -euo pipefail

TARGETS_FILE="${TARGETS_FILE:-.github/deploy-targets.json}" python3 - <<'PY'
import json, os, sys

with open(os.environ["TARGETS_FILE"], encoding="utf-8") as f:
    config = json.load(f)
targets = config["targets"]
names = [t["name"] for t in targets]

requested = os.environ.get("REQUESTED", "").strip()
if requested in ("", "default"):
    requested = os.environ.get("DEFAULT_TARGETS", "").strip() or ",".join(config.get("default", []))
wanted = [name.strip() for name in requested.split(",") if name.strip()]

unknown = [n for n in wanted if n != "all" and n not in names]
chosen = targets if "all" in wanted else [t for t in targets if t["name"] in wanted]
if unknown or not chosen:
    print(f"::error::本仓库不部署到 {requested}。可选服务器：{', '.join(names)}，或 all")
    sys.exit(1)

matrix = json.dumps({"include": chosen}, ensure_ascii=False, separators=(",", ":"))
with open(os.environ.get("GITHUB_OUTPUT") or "/dev/stdout", "a", encoding="utf-8") as out:
    out.write(f"matrix={matrix}\n")
print("部署目标：" + ", ".join(t["name"] for t in chosen))
PY
