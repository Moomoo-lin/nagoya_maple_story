#!/usr/bin/env python3
"""用 edge-tts（微軟線上語音，品質較好）產生日文音檔。
需網路，執行一次就好，之後網站離線可用。
  pip install edge-tts
  python3 tools/make_audio_edge.py
"""
import re, json, asyncio, pathlib
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICE = "ja-JP-NanamiNeural"   # 女聲；男聲可改 ja-JP-KeitaNeural

html = (ROOT / "index.html").read_text(encoding="utf-8")
m = re.search(r'<script id="phrases-data" type="application/json">(.*?)</script>', html, re.S)
phrases = json.loads(m.group(1))["phrases"]
(ROOT / "audio").mkdir(exist_ok=True)

async def main():
    for p in phrases:
        out = ROOT / "audio" / f"{p['id']}.mp3"
        await edge_tts.Communicate(p["ja"], VOICE, rate="-10%").save(str(out))
        print("ok", out.name, p["ja"])
    print(f"完成 {len(phrases)} 個音檔")

asyncio.run(main())
