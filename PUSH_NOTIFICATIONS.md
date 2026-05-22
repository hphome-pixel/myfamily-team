# 系統推播通知設定

這版已加入前端訂閱通知、Service Worker 接收通知，以及 Supabase Edge Function 範本。

## 1. 建立資料表

到 Supabase SQL Editor 執行：

```sql
-- 貼上 supabase_push_setup.sql 的內容
```

## 2. 設定 Supabase Secrets

到 Supabase Project Settings 或用 Supabase CLI 設定：

```text
VAPID_PUBLIC_KEY=前端 app.js 內的 VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=請使用這次產生的 private key，勿放進 GitHub
VAPID_SUBJECT=mailto:你的信箱
```

## 3. 部署 Edge Function

部署 `supabase/functions/send-push`。

## 4. 使用限制

- iPhone/iPad 通常需要先用 Safari「加入主畫面」，再允許通知。
- 使用者必須在 App 內按「開啟系統通知」。
- 目前由送出訊息/任務的那台裝置呼叫 Edge Function 發通知。
