# 暹羅留白

手機優先的泰國旅程 PWA，支援每日行程、時間軸、Google Maps、預算、提醒、檢查清單與離線瀏覽。

## 修改行程

所有旅程內容集中在 [`data.js`](./data.js)，修改後重新整理頁面即可看到結果。

## GitHub Pages

將此資料夾推送至 GitHub repository，並在 Settings → Pages 選擇 `main` branch、`/ (root)` 即可公開瀏覽。

## 本地預覽與檢查

在專案目錄執行 `python3 -m http.server 8000 --bind 127.0.0.1`，開啟 http://127.0.0.1:8000。

執行 `node --test tests/site.test.cjs`，檢查六天行程與圖片、勾選紀錄容錯、進度計算、靜態檔案與離線快取隔離。

每日照片由 `data.js` 各天的 `photo` 欄位設定。圖片來源及權利資訊在 `assets/photos/credits.json` 和 `photo-credits.html`；背景藍灰遮罩只影響網頁顯示，不修改圖片原檔。更新資源時同步更新 `index.html` 與 `sw.js` 的版本。
