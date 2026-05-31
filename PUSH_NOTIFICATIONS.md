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

Android/iOS 原生推播另外需要 Firebase service account。建議用一個 secret 放完整 JSON：

```text
FIREBASE_SERVICE_ACCOUNT_JSON={整份 Firebase service account JSON}
```

也可以拆成三個 secret：

```text
FIREBASE_PROJECT_ID=你的 Firebase project id
FIREBASE_CLIENT_EMAIL=service account client_email
FIREBASE_PRIVATE_KEY=service account private_key
```

## 3. Android App 設定

Firebase Android App 的 package name 要用：

```text
com.hphomepixel.myfamilyteam
```

下載 `google-services.json` 後放到：

```text
android/app/google-services.json
```

這個檔案已經被 `.gitignore` 排除，不要推到 GitHub。

## 4. 部署 Edge Function

目前 Supabase 上的 function 名稱是 `super-function`，前端會呼叫這個名稱。

`supabase/functions/super-function/index.ts` 會同時送：

- `push_subscriptions`：網頁/PWA Web Push
- `native_push_tokens`：Android FCM，之後也可接 iOS FCM/APNs

## 5. 使用限制

- iPhone/iPad 通常需要先用 Safari「加入主畫面」，再允許通知。
- 使用者必須在 App 內按「開啟系統通知」。
- 目前由送出訊息/任務的那台裝置呼叫 Edge Function 發通知。
