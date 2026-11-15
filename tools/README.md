# nagoya_maple_story

單一 `index.html` 的旅遊行程網站，直接雙擊就能看；放到 GitLab Pages／GitHub Pages 也不用改。

## 日文小記的離線音檔

網站的 🔊 按鈕會先找 `audio/<id>.mp3`，有就直接播放（離線可用）；沒有就退回瀏覽器內建語音（需裝置有日文語音，iPhone 在「設定 > 輔助使用 > 朗讀內容 > 語音」可下載）。

產生音檔，二選一：

**A. Mac 內建語音（離線、免安裝）**

```bash
bash tools/make_audio.sh
# 想換聲音：VOICE=Otoya bash tools/make_audio.sh
```

需要先在「系統設定 > 輔助使用 > 朗讀內容 > 系統語音 > 管理語音」下載日文語音（Kyoko 或 Otoya）。有 ffmpeg 會輸出 mp3，沒有則輸出 m4a 並自動改網頁副檔名。

**B. edge-tts（線上，聲音較自然）**

```bash
pip install edge-tts
python3 tools/make_audio_edge.py
```

兩種都會讀 `index.html` 裡的 `phrases-data`，所以之後在網頁新增句子，重跑一次就好。

## 修改內容

所有資料都在 `index.html` 底部的 `<script>`：

- `DAYS`：每日行程（時間軸、備注、建議餐廳）
- `SHOP`：購物清單
- `GUIDES`：攻略提醒
- `phrases-data`（JSON）：日文小記
- `HOTELS`、`TODO`：住宿與各種清單

打勾狀態存在瀏覽器 localStorage，換裝置不會同步。
