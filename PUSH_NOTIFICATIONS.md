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
VAPID_PUBLIC_KEY=BIdhbPfu0Zf-pR8_NsgcDPThj8sdLCe78ZbwEF9DzxFRuf4wTPA7n07hEDn8EB6jsE5M6V0LiDSUQAyRiQZWKZo
VAPID_PRIVATE_KEY=Va234ykx-3vElGeKXTm8ulFypk5Sf2wnpiPNIDXjZP8
VAPID_SUBJECT=mailto:你的信箱
```

## 3. 部署 Edge Function

目前 Supabase 上的 function 名稱是 `super-function`，前端會呼叫這個名稱。

## 4. 使用限制

- iPhone/iPad 通常需要先用 Safari「加入主畫面」，再允許通知。
- 使用者必須在 App 內按「開啟系統通知」。
- 目前由送出訊息/任務的那台裝置呼叫 Edge Function 發通知。
