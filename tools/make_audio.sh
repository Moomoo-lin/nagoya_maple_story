#!/usr/bin/env bash
# 產生日文小記的離線音檔（macOS 內建 say 指令，不需網路）
# 用法：在專案資料夾執行  bash tools/make_audio.sh
# 產出：audio/<id>.mp3（若沒有 ffmpeg 則產出 .m4a 並自動改網頁副檔名）
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio

# 從 index.html 取出 phrases JSON
python3 - <<'PY' > /tmp/_phrases.tsv
import re,json,io
html=open('index.html',encoding='utf-8').read()
m=re.search(r'<script id="phrases-data" type="application/json">(.*?)</script>',html,re.S)
data=json.loads(m.group(1))
for p in data['phrases']:
    print(p['id']+'\t'+p['ja'])
PY

# 選日文語音：Kyoko（預設）或 Otoya；若有 Siri 日文語音品質更好
VOICE="${VOICE:-Kyoko}"
if ! say -v '?' | grep -q "^$VOICE"; then
  echo "找不到語音 $VOICE，請到 系統設定 > 輔助使用 > 朗讀內容 > 系統語音 > 管理語音 下載日文語音（Kyoko / Otoya）"; exit 1
fi

HAVE_FFMPEG=0; command -v ffmpeg >/dev/null 2>&1 && HAVE_FFMPEG=1
EXT=mp3; [ $HAVE_FFMPEG -eq 1 ] || EXT=m4a

n=0
while IFS=$'\t' read -r id ja; do
  [ -z "$id" ] && continue
  if [ $HAVE_FFMPEG -eq 1 ]; then
    say -v "$VOICE" -r 165 -o "/tmp/_$id.aiff" "$ja"
    ffmpeg -loglevel error -y -i "/tmp/_$id.aiff" -codec:a libmp3lame -b:a 64k -ac 1 -ar 22050 "audio/$id.mp3"
    rm -f "/tmp/_$id.aiff"
  else
    say -v "$VOICE" -r 165 -o "audio/$id.m4a" --data-format=aac "$ja"
  fi
  n=$((n+1))
done < /tmp/_phrases.tsv

if [ "$EXT" = "m4a" ]; then
  sed -i '' "s/'\.mp3'/'.m4a'/g; s/b01\.mp3/b01.m4a/g" index.html
  echo "沒有 ffmpeg，已產出 .m4a 並把 index.html 的副檔名改成 .m4a"
fi
echo "完成：$n 個音檔 → audio/*.$EXT"
