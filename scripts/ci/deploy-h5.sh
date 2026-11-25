#!/usr/bin/env bash
# 在服务器上发布报工 H5。由 scripts/ci/deploy.ps1 在解压后的部署包目录中调用：
#
#   bash deploy-h5.sh <发布目录>            发布部署包里的新版本
#   bash deploy-h5.sh <发布目录> rollback   切回上一版（再执行一次会切回来）
#
# 发布目录以 /work 结尾时使用 site-work（/work/ 子路径构建），否则使用 site-root。
# 先备份当前文件，发布后确认 Nginx 已经返回新版本入口文件；任何一步失败都自动恢复。
# 每次发布成功后，发布前的版本保存在 ~/ci-deploy-state/ 下，供 rollback 使用。
set -euo pipefail

deploy_path="${1:?缺少发布目录}"
deploy_path="${deploy_path%/}"
mode="${2:-deploy}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backup="$here/backup"
local_url="${H5_LOCAL_URL:-http://127.0.0.1:8081}"
container=vue-frontend-nginx
state="$HOME/ci-deploy-state/h5$(tr '/' '_' <<<"$deploy_path")"

case "$deploy_path" in
  */work) site="$here/site-work"; prefix=/work ;;
  /*/*)   site="$here/site-root"; prefix='' ;;
  *) echo "发布目录必须是具体的绝对路径：$deploy_path" >&2; exit 1 ;;
esac
if [[ "$mode" == rollback ]]; then
  [[ -s "$state/index.html" ]] || { echo '服务器上没有保存的上一版，无法回滚' >&2; exit 1; }
  rm -rf -- "$here/previous"
  cp -a "$state" "$here/previous"
  site="$here/previous"
  echo "切回上一版"
elif [[ "$mode" != deploy ]]; then
  echo "不支持的模式：$mode" >&2; exit 1
fi
test -s "$site/index.html" || { echo "部署包缺少 $site/index.html" >&2; exit 1; }
echo "发布用户：$(id -un)，目录：$deploy_path"

# 旧版本可能由 root 手工发布，非 root 用户无法覆盖时用免密 sudo 修正归属。
if [[ -d "$deploy_path" ]] && { [[ ! -w "$deploy_path" ]] || find "$deploy_path" -mindepth 1 ! -writable -print -quit | grep -q .; }; then
  sudo -n true 2>/dev/null || { echo "$(id -un) 无法写入 $deploy_path，且没有免密 sudo" >&2; exit 1; }
  sudo -n chown -R "$(id -u):$(id -g)" "$deploy_path"
fi

has_backup=false
if [[ -d "$deploy_path" ]]; then
  mkdir -p "$backup"
  cp -a "$deploy_path/." "$backup/"
  has_backup=true
fi

replace_with() {
  mkdir -p "$deploy_path"
  find "$deploy_path" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  cp -a "$1/." "$deploy_path/"
}

restore() {
  echo '发布失败，恢复上一版本' >&2
  if [[ "$has_backup" == true ]]; then replace_with "$backup" || true; fi
  if [[ -n "${container_backup:-}" ]]; then
    docker run --rm --entrypoint sh -v "$mount_source:/target" "$image" -c \
      'rm -rf /target/work && mkdir -p /target/work && cp -a "$1/." /target/work/' sh "$container_backup" || true
  fi
}
trap 'rc=$?; [[ $rc -eq 0 ]] || restore; exit $rc' EXIT

replace_with "$site"

# 检查 index.html 引用的 js/css 都已经落盘。
while IFS= read -r asset; do
  relative="${asset#/}"
  relative="${relative#work/}"
  test -s "$deploy_path/$relative" || { echo "缺少资源文件：$relative" >&2; exit 1; }
done < <(grep -oE '(src|href)="/[^"]+\.(js|css)"' "$deploy_path/index.html" | sed -E 's/^(src|href)="([^"]+)"/\2/')

has_container=false
if command -v docker >/dev/null 2>&1 && docker inspect "$container" >/dev/null 2>&1; then
  has_container=true
fi

# 前端容器挂载的目录如果不是发布目录的上级（另有一份线上目录），把 /work 同步过去。
if [[ "$has_container" == true && "$prefix" == /work ]]; then
  mount_source="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/usr/share/nginx/html"}}{{.Source}}{{end}}{{end}}' "$container")"
  if [[ -n "$mount_source" && "$(realpath -m "$mount_source/work")" != "$(realpath -m "$deploy_path")" ]]; then
    image="$(docker inspect --format '{{.Config.Image}}' "$container")"
    container_backup="/target/.work-backups/$(date -u +%Y%m%d%H%M%S)"
    echo "同步到容器挂载目录：$mount_source/work"
    tar -C "$site" -cf - . | docker run --rm -i --entrypoint sh -v "$mount_source:/target" "$image" -c '
      set -eu
      mkdir -p "$1"
      if [ -d /target/work ]; then cp -a /target/work/. "$1/"; fi
      rm -rf /target/work && mkdir -p /target/work && tar -xf - -C /target/work
      test -s /target/work/index.html
      ls -1dt /target/.work-backups/* 2>/dev/null | tail -n +4 | xargs -r rm -rf
    ' sh "$container_backup"
  fi
fi

if [[ "$has_container" == true ]]; then
  docker exec "$container" nginx -t
fi

# 确认 Nginx 返回的就是刚发布的版本；第一次不一致时重启一次前端容器再确认。
expected="$(grep -oE "src=\"${prefix}/assets/index-[^\"]+\\.js\"" "$deploy_path/index.html" | head -n 1 || true)"
served_entry() {
  curl -fsS --max-time 10 "$local_url${prefix}/?release=$(date +%s)" 2>/dev/null \
    | grep -oE "src=\"${prefix}/assets/index-[^\"]+\\.js\"" | head -n 1 || true
}
actual=''
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  actual="$(served_entry)"
  [[ -n "$expected" && "$actual" == "$expected" ]] && break
  if [[ "$attempt" == 5 && "$has_container" == true ]]; then
    echo "Nginx 仍返回旧版本，重启 $container"
    docker restart "$container" >/dev/null
  fi
  sleep 2
done
echo "期望入口：$expected"
echo "实际入口：$actual"
if [[ -z "$expected" || "$actual" != "$expected" ]]; then
  echo "Nginx 没有返回刚发布的文件，请检查 $container 的挂载目录" >&2
  exit 1
fi

# 保存发布前的版本，供下次回滚使用。
if [[ "$has_backup" == true && -s "$backup/index.html" ]]; then
  mkdir -p "$(dirname "$state")"
  rm -rf -- "$state.new"
  cp -a "$backup" "$state.new"
  rm -rf -- "$state"
  mv "$state.new" "$state"
fi

echo "发布完成：$deploy_path"
