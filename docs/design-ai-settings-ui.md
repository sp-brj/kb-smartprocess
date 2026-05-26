# Design Spec: UI настроек AI Chat в админке

- **Статус:** Дизайн готов, ожидает реализации
- **Автор дизайна:** Muhammad Nurmagomedov + Claude (2026-05-26)
- **Оценка работы:** ~3.5 часа реализация + тесты
- **Связано с:** [ADR-002 (удаление analytics)](adr-002-remove-analytics-dashboard.md), `src/app/api/chat/route.ts`, `src/lib/embedding.ts`

---

## 1. Контекст и зачем это нужно

После перевода AI Chat с Ollama на OpenAI (см. commit `4109126`) все параметры захардкожены в коде или лежат в env-переменных Vercel:

- `OPENAI_API_KEY` — env
- `chatModel: "gpt-4o-mini"` — в `src/app/api/chat/route.ts:156`
- `EMBEDDING_MODEL = "text-embedding-3-small"` — в `src/lib/embedding.ts:3`
- `SYSTEM_PROMPT` — в `src/app/api/chat/route.ts:32-36`
- `MAX_DISTANCE = 0.6` — в `src/app/api/chat/route.ts:38`

**Проблема:** любая правка этих параметров требует PR + ревью + деплой. Для тонкой настройки чата (промпт, threshold релевантности, модель) это слишком тяжело.

**Цель:** вынести runtime-параметры в UI админки (`/settings/ai`) — менять без деплоя.

---

## 2. Что выносим в UI, что оставляем в env

### В UI (через таблицу `AppSetting` в БД)

| Ключ | Тип | Дефолт | Шифровать |
|---|---|---|---|
| `openai.apiKey` | string | — (fallback на `process.env.OPENAI_API_KEY`) | **да, AES-256-GCM** |
| `openai.chatModel` | enum: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo` | `gpt-4o-mini` | нет |
| `openai.embeddingModel` | enum: `text-embedding-3-small`, `text-embedding-3-large` | `text-embedding-3-small` | нет (но смена → re-index) |
| `chat.systemPrompt` | text (до 2000 символов) | текущий из кода | нет |
| `chat.maxDistance` | number 0.1–1.0 | `0.6` | нет |
| `chat.enabled` | boolean | `true` | нет |
| `chat.allowedRoles` | string[] из `["ADMIN", "USER"]` | `["ADMIN", "USER"]` | нет |

### Остаётся в env (Vercel Project Settings)

- `DATABASE_URL`, `DIRECT_URL` — bootstrap-проблема: нельзя хранить в БД к которой ещё не подключились
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — нужны до старта приложения
- `CLOUDINARY_*` — слишком ранний этап boot-up
- `OPENAI_API_KEY` — fallback если в БД пусто
- `SETTINGS_ENCRYPTION_KEY` — новая, 32 байта base64, для шифрования `openai.apiKey`

---

## 3. Модель данных

```prisma
// prisma/schema.prisma

model AppSetting {
  key       String   @id              // "openai.chatModel"
  value     Json                       // {"v": "gpt-4o-mini"} — единый wrapper для типизации
  encrypted Boolean  @default(false)   // true для openai.apiKey
  updatedAt DateTime @updatedAt
  updatedBy String?
  user      User?    @relation(fields: [updatedBy], references: [id], onDelete: SetNull)

  @@index([updatedAt])
}
```

**Почему key-value JSON, а не отдельная колонка под каждый параметр:**
- Гибкость — добавление нового setting не требует миграции
- Типизация — на уровне сервера через Zod (см. ниже)
- Минус: нельзя индексировать по значению (но нам и не нужно)

**История изменений:** в первой итерации **не делаем** отдельный `AppSettingHistory`. Поля `updatedAt` и `updatedBy` дают минимальный audit. Если потом понадобится compliance — добавим отдельную таблицу.

---

## 4. Шифрование чувствительных значений

`openai.apiKey` хранится в БД зашифрованным.

```ts
// src/lib/crypto.ts (новый файл)

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const keyB64 = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!keyB64) throw new Error("SETTINGS_ENCRYPTION_KEY is not set");
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY must be 32 bytes base64");
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(b => b.toString("base64")).join(":");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
```

**Генерация ключа для прода:** `openssl rand -base64 32` → положить в Vercel env как `SETTINGS_ENCRYPTION_KEY`.

**В UI:**
- Существующий ключ отображается как `sk-•••••••a1b2` (показываем prefix `sk-` и последние 4 символа)
- При вводе нового — отправляем сырое значение, бэкенд шифрует и сохраняет
- API **никогда** не возвращает сырое расшифрованное значение наружу — только маску

---

## 5. Чтение настроек из приложения

```ts
// src/lib/settings.ts (новый файл)

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { SETTING_DEFAULTS, type SettingKey, type SettingValue } from "./settings-schema";

// In-memory cache с TTL
const cache = new Map<string, { value: unknown; expiresAt: number }>();
const TTL_MS = 60_000; // 60 секунд

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as SettingValue<K>;
  }

  const row = await prisma.appSetting.findUnique({ where: { key } });

  let value: SettingValue<K>;
  if (row) {
    const raw = (row.value as { v: SettingValue<K> }).v;
    if (row.encrypted && typeof raw === "string") {
      value = decrypt(raw) as SettingValue<K>;
    } else {
      value = raw;
    }
  } else {
    value = SETTING_DEFAULTS[key];
    // Для apiKey — fallback в env
    if (key === "openai.apiKey" && !value) {
      value = (process.env.OPENAI_API_KEY ?? "") as SettingValue<K>;
    }
  }

  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

export function invalidateSettingsCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}
```

**Использование в `src/app/api/chat/route.ts`:**

```ts
const apiKey = await getSetting("openai.apiKey");
const chatModel = await getSetting("openai.chatModel");
const systemPrompt = await getSetting("chat.systemPrompt");
const maxDistance = await getSetting("chat.maxDistance");
const enabled = await getSetting("chat.enabled");
const allowedRoles = await getSetting("chat.allowedRoles");

if (!enabled) {
  return NextResponse.json({ error: "AI Chat отключён" }, { status: 503 });
}

if (!allowedRoles.includes(auth.userRole)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ... дальше используем chatModel, systemPrompt, maxDistance
```

**Zod-схема для типизации:**

```ts
// src/lib/settings-schema.ts (новый файл)

import { z } from "zod";

export const SETTING_SCHEMAS = {
  "openai.apiKey": z.string().min(0),
  "openai.chatModel": z.enum(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]),
  "openai.embeddingModel": z.enum(["text-embedding-3-small", "text-embedding-3-large"]),
  "chat.systemPrompt": z.string().min(10).max(2000),
  "chat.maxDistance": z.number().min(0.1).max(1.0),
  "chat.enabled": z.boolean(),
  "chat.allowedRoles": z.array(z.enum(["ADMIN", "USER"])).min(1),
} as const;

export const SETTING_DEFAULTS = {
  "openai.apiKey": "",
  "openai.chatModel": "gpt-4o-mini" as const,
  "openai.embeddingModel": "text-embedding-3-small" as const,
  "chat.systemPrompt": `Ты — ассистент базы знаний SmartProcess.
Отвечай ТОЛЬКО на основе предоставленного контекста.
Если ответа нет в контексте — скажи "Не нашёл информации по этому вопросу в базе знаний".
В конце ответа укажи источники: названия статей со ссылками.
Отвечай на русском языке, кратко и по делу.`,
  "chat.maxDistance": 0.6,
  "chat.enabled": true,
  "chat.allowedRoles": ["ADMIN", "USER"] as const,
} as const;

// Список ключей, значения которых должны быть зашифрованы
export const ENCRYPTED_KEYS = new Set(["openai.apiKey"]);

export type SettingKey = keyof typeof SETTING_SCHEMAS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_SCHEMAS)[K]>;
```

---

## 6. API контракт

### `GET /api/admin/settings` (ADMIN only)

Возвращает все настройки. Чувствительные значения — маскированы.

```json
{
  "openai.apiKey": { "value": "sk-•••••••a1b2", "encrypted": true, "masked": true },
  "openai.chatModel": { "value": "gpt-4o-mini" },
  "openai.embeddingModel": { "value": "text-embedding-3-small" },
  "chat.systemPrompt": { "value": "Ты — ассистент базы знаний..." },
  "chat.maxDistance": { "value": 0.6 },
  "chat.enabled": { "value": true },
  "chat.allowedRoles": { "value": ["ADMIN", "USER"] }
}
```

### `PATCH /api/admin/settings` (ADMIN only)

Принимает один или несколько ключей. Сервер валидирует через Zod, шифрует чувствительные, сохраняет.

```json
{
  "chat.maxDistance": 0.5,
  "openai.chatModel": "gpt-4o"
}
```

Если в payload пустая строка для `openai.apiKey` — **не** трогаем сохранённое значение (это маска без изменения). Чтобы реально удалить ключ — отдельная команда `DELETE /api/admin/settings/openai.apiKey`.

Ответ:
```json
{ "updated": ["chat.maxDistance", "openai.chatModel"] }
```

После успешного сохранения — вызвать `invalidateSettingsCache()`.

### `POST /api/admin/reindex` (ADMIN only)

Запускает `indexArticles()` логику синхронно (на 200 статьях ~30-60 сек). Возвращает прогресс по мере выполнения через Server-Sent Events или просто ждёт и возвращает итог.

```json
{ "indexed": 198, "skipped": 2, "failed": 0, "durationMs": 42100 }
```

⚠️ Vercel serverless имеет таймаут 60 сек на Hobby tier и 300 сек на Pro. Если статей много — нужен фоновый процесс (не делаем в первой итерации, предполагаем что 200 статей укладываются в 60 сек).

---

## 7. UI: `/settings/ai`

**Доступ:** только `ADMIN`. Если не админ — `redirect("/settings")`.

**Структура страницы:**

```
┌── Настройки AI Chat ────────────────────────┐
│                                              │
│ Статус                                       │
│  [✓] Чат включён                            │
│  Доступен ролям:                            │
│   [✓] ADMIN   [✓] USER                       │
│                                              │
│ ── OpenAI ──                                │
│  API Key                                     │
│   ┌────────────────────────┐                │
│   │ sk-•••••••a1b2         │ [Изменить]    │
│   └────────────────────────┘                │
│                                              │
│  Модель чата                                │
│   ( ) gpt-4o-mini (быстро, дёшево)          │
│   (•) gpt-4o (точнее, дороже ×30)           │
│   ( ) gpt-4-turbo                            │
│                                              │
│  Модель эмбеддингов                         │
│   (•) text-embedding-3-small (1536 dim)      │
│   ( ) text-embedding-3-large (3072 dim)      │
│   ⚠️ Смена модели требует ре-индекса всех    │
│      статей. После сохранения станет         │
│      доступна кнопка "Запустить ре-индекс". │
│                                              │
│ ── Поведение ──                             │
│  Системный prompt                            │
│   ┌──────────────────────────────────────┐  │
│   │ Ты — ассистент базы знаний...        │  │
│   │ ...                                   │  │
│   └──────────────────────────────────────┘  │
│   1247 / 2000 символов                       │
│                                              │
│  Threshold релевантности                    │
│   [▬▬▬▬▬▬●▬▬▬]  0.6                          │
│   Меньше = строже отбор контекста            │
│                                              │
│              [Отмена]  [Сохранить]           │
│                                              │
│ ── Обслуживание ──                          │
│                                              │
│  [Запустить ре-индексацию статей]           │
│  Последний ре-индекс: 2026-05-26 12:34       │
│                                              │
└──────────────────────────────────────────────┘
```

**Поведение:**
- При изменении полей — кнопка "Сохранить" активируется
- Валидация через Zod на клиенте + сервере
- Toast-уведомления об успехе/ошибке
- "Изменить" у API Key — открывает inline-input, при пустом значении после Cancel ничего не меняется
- "Запустить ре-индекс" — модалка с подтверждением + прогресс-бар

**Компоненты (использовать существующий design system проекта):**
- `Card`, `Input`, `Textarea`, `Select`, `Switch`, `Slider`, `Button`, `Modal`, `Toast`
- Если каких-то нет — добавить, не копипастить inline стили

---

## 8. Безопасность

1. **API key возвращается только маской.** Никаких "show full" кнопок.
2. **Только ADMIN.** Проверка в middleware + явная проверка в API route.
3. **Rate limiting.** Не обязательно в первой итерации, но желательно — 10 запросов/мин на PATCH (предотвращает брутфорс через подбор валидных значений).
4. **CSRF.** Использовать `authenticateRequest` (уже есть), проверка origin.
5. **Audit log.** Логировать каждое изменение API key в отдельную таблицу или хотя бы в `console.log` с userId — будет видно в Vercel logs.
6. **Не светить error stack traces** в ответах API в production.

---

## 9. Порядок реализации (по веткам/коммитам)

Рекомендуется делать на отдельной ветке `feat/ai-settings-ui`, итеративно, с коммитом после каждого шага:

1. **Schema + migration** (коммит `feat: add AppSetting model`)
   - Добавить модель в `prisma/schema.prisma`
   - Сгенерировать миграцию `npx prisma migrate dev --name add_app_setting`

2. **Crypto + Settings library** (коммит `feat: add settings library with encryption`)
   - `src/lib/crypto.ts`
   - `src/lib/settings-schema.ts`
   - `src/lib/settings.ts`
   - Unit-тесты на encrypt/decrypt round-trip

3. **API routes** (коммит `feat: settings + reindex API routes`)
   - `src/app/api/admin/settings/route.ts` (GET, PATCH)
   - `src/app/api/admin/reindex/route.ts` (POST)
   - Интеграционные тесты — создать setting, прочитать, обновить, проверить шифрование

4. **Интеграция в chat** (коммит `refactor: read AI Chat config from settings`)
   - Переделать `src/app/api/chat/route.ts` чтобы читать через `getSetting()`
   - Сохранить fallback на env для `openai.apiKey`
   - Проверить что чат работает без записей в БД (используя дефолты)

5. **UI** (коммит `feat: /settings/ai page`)
   - `src/app/(dashboard)/settings/ai/page.tsx`
   - Добавить ссылку в навигацию настроек (для ADMIN)
   - E2E-тест: открыть страницу, изменить maxDistance, проверить что значение применилось

6. **Деплой + env vars в Vercel** (коммит `chore: docs for SETTINGS_ENCRYPTION_KEY`)
   - Сгенерировать ключ: `openssl rand -base64 32`
   - Добавить в Vercel Project Settings → Environment Variables → `SETTINGS_ENCRYPTION_KEY`
   - Обновить `.env.example`
   - Обновить `ONBOARDING.md`

---

## 10. Тесты

**Unit:**
- `crypto.ts`: encrypt → decrypt возвращает исходное значение
- `crypto.ts`: decrypt с битым tag — кидает ошибку
- `settings.ts`: при отсутствии записи в БД возвращает default
- `settings.ts`: при наличии записи возвращает её (с расшифровкой если encrypted)
- `settings.ts`: cache TTL работает (мокаем Date.now)
- `settings-schema.ts`: каждый ключ имеет default, валидный по своей схеме

**API:**
- `GET /api/admin/settings` без auth → 401
- `GET /api/admin/settings` от не-ADMIN → 403
- `PATCH /api/admin/settings` с невалидным значением → 400
- `PATCH /api/admin/settings` с валидным значением → 200 + значение в БД
- `PATCH /api/admin/settings` с openai.apiKey → значение зашифровано в БД
- `GET /api/admin/settings` после save apiKey → возвращается маска

**E2E (Playwright):**
- ADMIN открывает `/settings/ai` → видит все поля
- USER пытается открыть → redirect
- ADMIN меняет `chat.maxDistance` → значение применяется в чате
- ADMIN меняет model → следующий запрос идёт к новой модели
- ADMIN жмёт «Ре-индекс» → видит прогресс, по завершении чанки в БД

---

## 11. Acceptance criteria

Фича считается готовой, когда:

- [ ] Миграция `add_app_setting` применена в production Supabase
- [ ] `SETTINGS_ENCRYPTION_KEY` добавлен в Vercel env vars
- [ ] `/settings/ai` доступна только для ADMIN
- [ ] Все 7 настроек редактируются через UI и применяются без редеплоя
- [ ] `openai.apiKey` хранится в БД зашифрованным, в UI показывается маска
- [ ] Изменение модели эмбеддингов запускает ре-индексацию (или предлагает её)
- [ ] Build проходит, E2E тесты зелёные
- [ ] `ARCHITECTURE.md` дополнен разделом про AppSetting
- [ ] Этот документ обновлён со статусом «реализовано» + ссылкой на коммит

---

## 12. Что НЕ делаем в первой итерации (out of scope)

Эти улучшения логичны, но добавляют сложности — оставляем на потом:

- **Multi-tenant.** Сейчас один SmartProcess KB — один набор настроек. Если когда-то будут разные арендаторы — добавим `tenantId` в `AppSetting`.
- **Audit log изменений.** Хранить полную историю кто и что менял.
- **Diff preview.** Показывать что изменится перед save.
- **Test connection.** Кнопка "Проверить API key" — отправлять тестовый запрос в OpenAI и показывать ответ.
- **A/B prompts.** Хранить несколько версий системного prompt и переключаться между ними.
- **Per-user overrides.** Дать пользователю переопределять prompt/модель для своих запросов.
- **Background reindex** с прогресс-баром через polling/SSE.

Если что-то из этого реально понадобится — пиши отдельный design spec и реализуй за новую итерацию.

---

## 13. Связанные документы

- [ADR-002: Удаление analytics dashboard](adr-002-remove-analytics-dashboard.md) — тот же подход «вырезать неиспользуемое и упростить»
- `src/lib/embedding.ts` — текущая реализация на OpenAI
- `src/app/api/chat/route.ts` — где захардкожены параметры сейчас
- `src/lib/api-auth.ts` — паттерн авторизации API для админских endpoint
- `ONBOARDING.md` — после реализации обновить раздел env vars

---

## 14. Вопросы, которые могут возникнуть у разработчика

**Q: Почему не использовать Vercel Edge Config?**
A: Это привязка к Vercel. Зашифрованные значения там хранить нельзя. Свой `AppSetting` в Postgres — переносимо и аудитируемо.

**Q: Почему не next-runtime-env / unstable_after?**
A: Не решает проблему — настройки всё равно в env, для смены нужен редеплой. Мы хотим UI.

**Q: Можно ли кэш сделать дольше TTL?**
A: 60 сек — компромисс между свежестью и нагрузкой на БД. При сохранении через UI кэш инвалидируется явно — пользователь видит изменения мгновенно. Сторонние правки (прямо в БД) подхватятся за минуту.

**Q: Что если SETTINGS_ENCRYPTION_KEY потерян?**
A: Все зашифрованные значения (сейчас только `openai.apiKey`) станут нечитаемыми. Решение: бэкап ключа в Bitwarden + при ротации ключа — миграция данных с расшифровкой старым и шифрованием новым. В первой итерации ротацию не делаем.

**Q: Нужен ли валидатор API ключа OpenAI на стороне сервера?**
A: Опционально — можно при PATCH делать тестовый запрос `openai.models.list()` и если 401 — возвращать ошибку. Не блокер, добавить если время есть.
