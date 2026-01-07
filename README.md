# Сайт для Базы Знаний (kb.smartprocess.ru)

Закрытая база знаний на Next.js 15 + Prisma + PostgreSQL (Supabase).

## Стек технологий

- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **База данных**: PostgreSQL (Supabase), Prisma ORM
- **Тестирование**: Playwright (E2E)

## Команды для разработки

### Запуск dev-сервера
```bash
cd "10_Проекты (CHANGE)/Сайт для БЗ/code"
npm run dev
```
Сайт будет доступен на http://localhost:3000

### Сборка для продакшена
```bash
npm run build
```

### Запуск продакшен-сервера
```bash
npm run start
```

---

## База данных (Prisma)

### Применить миграции
```bash
npx prisma migrate dev
```

### Создать новую миграцию
```bash
npx prisma migrate dev --name <название_миграции>
```

### Открыть Prisma Studio (GUI для БД)
```bash
npx prisma studio
```

### Сгенерировать Prisma Client
```bash
npx prisma generate
```

---

## Тестирование (Playwright)

### Запуск всех E2E тестов
```bash
npm run test:e2e
```

### Запуск тестов с UI (интерактивно)
```bash
npm run test:e2e:ui
```

### Запуск тестов с браузером (видно выполнение)
```bash
npm run test:e2e:headed
```

### Очистка тестовых данных после тестов
```bash
npm run test:cleanup
```
Удаляет только тестовые данные:
- Пользователей с email `*@example.com`
- Статьи/папки с timestamp в названии (13 цифр)

### Полный цикл тестирования
```bash
npm run test:e2e && npm run test:cleanup
```

---

## Структура E2E тестов

```
e2e/
├── helpers.ts        # Общие функции (login)
├── auth.spec.ts      # Авторизация (4 теста)
├── articles.spec.ts  # CRUD статей (4 теста)
├── folders.spec.ts   # Папки (2 теста)
├── search.spec.ts    # Поиск (2 теста)
└── share.spec.ts     # Публичный шаринг (1 тест)
```

Всего: **13 тестов**

---

## Переменные окружения

Файл `.env`:
```env
DATABASE_URL="postgresql://..."  # Supabase connection string
NEXTAUTH_SECRET="..."            # Секрет для NextAuth
NEXTAUTH_URL="http://localhost:3000"
```

---

## Дополнительные команды

### Lint
```bash
npm run lint
```

### Установить зависимости
```bash
npm install
```

### Установить Playwright браузеры
```bash
npx playwright install chromium
```

---

## Для AI-ассистента

При работе с этим проектом:

1. **Рабочая директория**: `10_Проекты (CHANGE)/Сайт для БЗ/code`
2. **Перед тестами**: dev-сервер должен быть запущен (`npm run dev`)
3. **После тестов**: запустить очистку (`npm run test:cleanup`)
4. **Миграции**: после изменения `prisma/schema.prisma` → `npx prisma migrate dev`

### Частые сценарии

| Задача | Команда |
|--------|---------|
| Запустить dev | `npm run dev` |
| Прогнать тесты | `npm run test:e2e:headed` |
| Очистить тестовые данные | `npm run test:cleanup` |
| Обновить схему БД | `npx prisma migrate dev` |
| Посмотреть данные в БД | `npx prisma studio` |
