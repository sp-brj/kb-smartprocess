# Онбординг разработчика — sp-kb

База знаний SmartProcess: https://kb.smartprocess.ru

Деплой автоматический: пуш в `main` → Vercel задеплоит за ~1 минуту. **Будь осторожен — это production.**

---

## 1. Получи доступы (тебе их выдадут)

- [ ] **GitHub**: collaborator в `sp-brj/kb-smartprocess` (Write)
- [ ] **Vercel**: член команды проекта `kb-smartprocess`
- [ ] **Supabase**: член организации, проект с БД
- [ ] **Cloudflare** (опционально, для DNS): аккаунт с доступом к зоне `smartprocess.ru`
- [ ] **Anthropic** (Claude Code): свой личный аккаунт / API-ключ, не общий

---

## 2. Поставь инструменты

```bash
# Node.js (LTS, проверь у владельца какая версия в проде)
node -v   # должно быть 20.x или 22.x

# Claude Code
npm install -g @anthropic-ai/claude-code
claude login   # под СВОИМ аккаунтом

# VS Code расширения (рекомендуется)
# - ESLint (dbaeumer.vscode-eslint)
# - Prisma (Prisma.prisma)
# - Playwright Test (ms-playwright.playwright)
# - Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
```

---

## 3. Склонируй и запусти

```bash
git clone git@github.com:sp-brj/kb-smartprocess.git
cd kb-smartprocess

# Зависимости
npm install

# Окружение
cp .env.example .env.local
# Открой .env.local и заполни ключи (см. ниже откуда брать)

# Браузеры для Playwright
npx playwright install chromium

# Запуск
npm run dev
# → http://localhost:3000
```

### Откуда брать ключи для `.env.local`

| Переменная | Где взять |
|---|---|
| `DATABASE_URL` | Supabase → Project → Connection String (Pooler). Можно использовать **production-базу для чтения**, для записи — лучше своя ветка |
| `NEXTAUTH_SECRET` | Сгенерировать: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` для локалки |
| `CLOUDINARY_*` | cloudinary.com → Dashboard. Можно дать общие ключи проекта |
| `OPENAI_API_KEY` | Личный или общий ключ OpenAI (для AI-чата: embeddings + gpt-4o-mini) |

⚠️ **Никогда не коммить `.env.local`** — он в `.gitignore`.

---

## 4. Прочитай ключевые файлы

Это базовый контекст, без него код будет «не в стиле проекта»:

1. **`ARCHITECTURE.md`** — что за приложение, БД, API, структура
2. **`.claude/CLAUDE.md`** — правила работы с этим проектом (читает Claude Code сам, но и ты тоже прочитай)
3. **`README.md`** — команды
4. **`prisma/schema.prisma`** — модели БД

---

## 5. Рабочий цикл

```bash
# Перед началом задачи
git pull origin main
git checkout -b feat/название-задачи

# Разработка
npm run dev

# Перед коммитом — ОБЯЗАТЕЛЬНО
npm run build                                  # сборка должна пройти
npx playwright test --project=chromium         # E2E на chromium
npx tsx scripts/cleanup-test-data.ts           # очистка тестовых данных

# Коммит и пуш
git add .
git commit -m "feat: описание"
git push origin feat/название-задачи
```

### Деплой

Два варианта:

1. **Через PR (рекомендуется)**: пушь ветку → создай PR → Vercel сделает preview-деплой на отдельном URL → проверь → мержь в `main` → авто-деплой в prod
2. **Прямо в main** (только для мелких правок): пуш в `main` сразу же уходит в production

Откат: Vercel Dashboard → Deployments → найти прошлый рабочий → Promote to Production.

---

## 6. Claude Code в этом проекте

Claude Code сам прочитает `.claude/CLAUDE.md` при старте — там описаны правила (auth checklist, ESLint quirks, паттерны компонентов, что делать после задачи).

Полезные команды/скиллы:
- `/init` — если когда-то понадобится пересоздать CLAUDE.md
- `/review` — ревью PR
- `/test` — прогнать тесты

---

## 7. Куда смотреть когда что-то сломалось

| Симптом | Куда |
|---|---|
| Локально не запускается | `.env.local` — все ключи заполнены? `npm install` свежий? |
| Билд падает на Vercel | Vercel → Deployments → логи. Часто — ESLint в strict mode (см. CLAUDE.md, секция «React Hooks») |
| 500 в API | Vercel → Functions → Logs |
| База не отвечает | Supabase → Project → Logs. Возможно — pool exhaustion |
| Тесты падают только в проде | Pool Supabase. Запускай локально: `npm run test:e2e` |

---

## 8. Что НЕ делать

- ❌ Не коммить `.env*` (кроме `.env.example`)
- ❌ Не править production-данные в Supabase напрямую через SQL без бэкапа
- ❌ Не пушить в `main` массивные изменения без preview-деплоя
- ❌ Не использовать общие API-ключи Anthropic — заведи свой
- ❌ Не отключай pre-commit хуки через `--no-verify`

---

## Контакты

- Владелец: Muhammad Nurmagomedov (muhammad.nurmagomedov@gmail.com)
- Репозиторий: https://github.com/sp-brj/kb-smartprocess
- Production: https://kb.smartprocess.ru
