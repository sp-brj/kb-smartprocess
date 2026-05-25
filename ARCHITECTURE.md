# Архитектура проекта: База знаний + CRM SmartProcess

## Что это за проект

Корпоративный портал для компании SmartProcess:
1. **База знаний** — хранение, организация и поиск внутренней документации с wiki-ссылками
2. **CRM модуль** — управление проектами консалтинга по 1С: клиенты, проекты, задачи, таймлоги, финансы

**Репозиторий:** https://github.com/sp-brj/kb-smartprocess

---

## Технологический стек

| Слой | Технология |
|------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Стили | Tailwind CSS 4, CSS Variables (темы) |
| Backend | Next.js API Routes (Route Handlers) |
| База данных | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Аутентификация | NextAuth.js 4 (Credentials provider) |
| Markdown | react-markdown, remark-gfm, custom remark plugins |
| Тестирование | Playwright (E2E), Page Object Model |
| Деплой | Vercel (предполагается) |

---

## Структура проекта

```
code/
├── prisma/
│   ├── schema.prisma          # Схема БД
│   └── migrations/            # Миграции
├── src/
│   ├── app/
│   │   ├── (auth)/            # Группа auth routes
│   │   │   └── login/         # Страница логина
│   │   ├── (dashboard)/       # Группа защищённых routes
│   │   │   ├── articles/      # Статьи (список, просмотр, редактор)
│   │   │   ├── folders/       # Папки
│   │   │   ├── tags/          # Теги
│   │   │   ├── search/        # Поиск
│   │   │   ├── admin/         # Админ-панель
│   │   │   ├── crm/           # CRM модуль
│   │   │   │   ├── clients/   # Клиенты
│   │   │   │   ├── projects/  # Проекты + канбан
│   │   │   │   ├── tasks/     # Задачи
│   │   │   │   ├── time/      # Таймлоги + отчёты
│   │   │   │   └── page.tsx   # Dashboard CRM
│   │   │   └── layout.tsx     # Layout с сайдбаром
│   │   ├── api/               # API endpoints
│   │   │   ├── articles/      # CRUD статей + versions, backlinks, tags
│   │   │   ├── folders/       # CRUD папок
│   │   │   ├── tags/          # CRUD тегов
│   │   │   ├── clients/       # CRM: клиенты, контакты, реквизиты
│   │   │   ├── projects/      # CRM: проекты
│   │   │   ├── project-statuses/ # CRM: статусы воронки
│   │   │   ├── tasks/         # CRM: задачи, чеклисты
│   │   │   ├── time-entries/  # CRM: учёт времени
│   │   │   ├── payments/      # CRM: оплаты
│   │   │   ├── search/        # Полнотекстовый поиск
│   │   │   ├── share/         # Публичный доступ
│   │   │   └── auth/          # NextAuth + регистрация
│   │   ├── share/             # Публичные страницы (без auth)
│   │   ├── globals.css        # Глобальные стили + темы
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React компоненты
│   │   ├── ArticleContent.tsx # Рендеринг markdown
│   │   ├── ArticleEditor.tsx  # Редактор статей
│   │   ├── ArticlesList.tsx   # Список статей с drag-drop
│   │   ├── Sidebar.tsx        # Навигация + папки + теги
│   │   ├── TagSelector.tsx    # Выбор тегов
│   │   ├── TagCloud.tsx       # Облако тегов
│   │   ├── BacklinksPanel.tsx # Обратные ссылки
│   │   ├── HistoryButton.tsx  # Кнопка истории
│   │   ├── VersionHistoryModal.tsx
│   │   ├── VersionDiffViewer.tsx
│   │   ├── WikilinkAutocomplete.tsx
│   │   └── ...
│   └── lib/
│       ├── prisma.ts          # Prisma client singleton
│       ├── auth.ts            # NextAuth config
│       ├── wikilinks.ts       # Утилиты wiki-ссылок
│       └── remark-wikilinks.ts # Remark плагин
├── e2e/                       # Playwright тесты
│   ├── fixtures/              # Auth и data fixtures
│   ├── pages/                 # Page Objects
│   └── specs/                 # Тестовые спецификации
├── scripts/
│   └── cleanup-test-data.ts   # Очистка тестовых данных
└── public/                    # Статика
```

---

## Схема базы данных

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │   Article   │     │   Folder    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │◄────│ authorId    │     │ id          │
│ email       │     │ folderId    │────►│ name        │
│ password    │     │ title       │     │ slug        │
│ name        │     │ slug        │     │ parentId    │───┐
│ role        │     │ content     │     │ depth       │   │
└─────────────┘     │ status      │     └─────────────┘◄──┘
      │             │ shareToken  │           │
      │             └─────────────┘           │
      │                   │                   │
      │    ┌──────────────┼──────────────┐    │
      │    │              │              │    │
      ▼    ▼              ▼              ▼    │
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ArticleVersion│   │ ArticleLink │   │ ArticleTag  │
├─────────────┤   ├─────────────┤   ├─────────────┤
│ id          │   │ id          │   │ id          │
│ version     │   │ sourceId    │   │ articleId   │
│ title       │   │ targetId    │   │ tagId       │
│ content     │   │ targetTitle │   └─────────────┘
│ status      │   └─────────────┘          │
│ changeType  │                            │
│ articleId   │                            ▼
│ authorId    │                    ┌─────────────┐
└─────────────┘                    │    Tag      │
                                   ├─────────────┤
                                   │ id          │
                                   │ name        │
                                   │ slug        │
                                   │ color       │
                                   └─────────────┘
```

### Основные модели

| Модель | Назначение |
|--------|------------|
| User | Пользователи (ADMIN/EDITOR/READER роли) |
| ApiKey | API ключи для внешней авторизации |
| Article | Статьи базы знаний |
| Folder | Папки для организации (до 3 уровней вложенности) |
| Tag | Теги для категоризации |
| ArticleTag | Связь статья-тег (many-to-many) |
| ArticleLink | Wiki-ссылки между статьями |
| ArticleVersion | История изменений статей |

---

## Основной функционал

### 1. Аутентификация
- Вход по email/password (NextAuth Credentials)
- **API Key авторизация** для внешних клиентов (Bearer token)
- Роли: ADMIN, EDITOR, READER
- Middleware защищает `/articles`, `/folders`, `/admin`
- Регистрация через `/api/auth/register`

#### API Key авторизация
- Создание ключей: `POST /api/api-keys`
- Формат токена: `kb_<random>` (68 символов)
- Разрешения: `read`, `write`, `admin`
- Ключ показывается **только при создании**
- Хранится bcrypt хеш, не сам ключ
- Использование: `Authorization: Bearer kb_xxx...`

### 2. Статьи
- CRUD операции
- Markdown с GFM (таблицы, чекбоксы, код)
- Статусы: DRAFT (черновик), PUBLISHED (опубликовано)
- Публичный доступ по shareToken (`/share/[token]`)

### 3. Папки
- Иерархическая структура (до 3 уровней)
- Drag-and-drop статей между папками
- Автоматический slug из названия

### 4. Wiki-ссылки
- Синтаксис: `[[Название статьи]]` или `[[статья|текст]]`
- Автодополнение при вводе `[[`
- Панель обратных ссылок (Backlinks)
- Подсветка битых ссылок

### 5. Теги
- Мультиселект при редактировании
- Создание "на лету"
- Облако тегов в сайдбаре
- Фильтрация статей по тегу

### 6. История изменений
- Автосохранение версий при изменении
- Визуальный diff между версиями
- Откат к любой версии

### 7. Поиск
- Полнотекстовый поиск по заголовкам и контенту
- PostgreSQL `ILIKE`

### 8. Темы
- Светлая/тёмная тема
- CSS Variables + Tailwind
- Сохранение в localStorage

---

## CRM Модуль

### Клиенты (`/crm/clients`)
- Полная карточка: название, ИНН, КПП, ОГРН, адреса
- Контакты: несколько контактных лиц с телефонами и email
- Банковские реквизиты: несколько счетов
- Статус: ACTIVE, POTENTIAL, ARCHIVED

### Проекты (`/crm/projects`)
- Воронка статусов: Лид → Переговоры → Договор → В работе → Завершён → Отменён
- Типы: Внедрение, Консалтинг, Доработка, Сопровождение
- Бюджет и плановые/фактические даты
- Привязка к клиенту и менеджеру

### Задачи (`/crm/tasks`)
- Канбан-доска: TODO → IN_PROGRESS → REVIEW → DONE
- Приоритеты: LOW, MEDIUM, HIGH, URGENT
- Чеклисты внутри задач
- Привязка к проекту и исполнителю

### Учёт времени (`/crm/time`)
- Журнал времени с быстрым добавлением
- Типы работ: Консультация, Разработка, Обучение, Тестирование, и др.
- Отчёт с группировкой по проекту/сотруднику/типу/дню
- Флаг billable для выставления счетов

### Финансы
- Оплаты по проектам: Аванс, Этап, Финал
- Статусы: Ожидается, Получена, Отменена
- Сводка бюджет vs оплачено vs остаток

### CRM API Endpoints

| Группа | Endpoints |
|--------|-----------|
| Клиенты | `GET/POST /api/clients`, `GET/PATCH/DELETE /api/clients/[id]` |
| Контакты | `GET/POST /api/clients/[id]/contacts`, `PATCH/DELETE .../contacts/[contactId]` |
| Реквизиты | `GET/POST /api/clients/[id]/bank-accounts`, `PATCH/DELETE .../bank-accounts/[accountId]` |
| Статусы | `GET/POST /api/project-statuses`, `PATCH/DELETE /api/project-statuses/[id]` |
| Проекты | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/[id]`, `PATCH .../status` |
| Задачи | `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/[id]`, `PATCH .../status` |
| Чеклист | `GET/POST /api/tasks/[id]/checklist`, `PATCH/DELETE .../checklist/[itemId]` |
| Время | `GET/POST /api/time-entries`, `GET/PATCH/DELETE .../[id]`, `GET .../report` |
| Оплаты | `GET/POST /api/payments`, `GET/PATCH/DELETE /api/payments/[id]` |

---

## API Endpoints (База знаний)

### Статьи
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/articles` | Список статей |
| POST | `/api/articles` | Создать статью |
| GET | `/api/articles/[id]` | Получить статью |
| PATCH | `/api/articles/[id]` | Обновить статью |
| DELETE | `/api/articles/[id]` | Удалить статью |
| GET | `/api/articles/suggestions` | Автодополнение wiki |
| GET | `/api/articles/[id]/backlinks` | Обратные ссылки |
| GET/PUT/POST | `/api/articles/[id]/tags` | Теги статьи |
| POST | `/api/articles/[id]/share` | Создать shareToken |

### Версии
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/articles/[id]/versions` | Список версий |
| GET | `/api/articles/[id]/versions/[versionId]` | Конкретная версия |
| GET | `/api/articles/[id]/versions/[versionId]/diff` | Diff версий |
| POST | `/api/articles/[id]/versions/[versionId]/revert` | Откат |

### Папки
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/folders` | Список папок (дерево) |
| POST | `/api/folders` | Создать папку |
| PATCH | `/api/folders/[id]` | Обновить папку |
| DELETE | `/api/folders/[id]` | Удалить папку |

### Теги
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/tags` | Список тегов |
| POST | `/api/tags` | Создать тег |
| PATCH | `/api/tags/[id]` | Обновить тег |
| DELETE | `/api/tags/[id]` | Удалить тег |

### API Keys
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/api-keys` | Список ключей пользователя |
| POST | `/api/api-keys` | Создать ключ (возвращает key!) |
| GET | `/api/api-keys/[id]` | Информация о ключе |
| PATCH | `/api/api-keys/[id]` | Обновить (name, permissions, isActive) |
| DELETE | `/api/api-keys/[id]` | Удалить ключ |

### Прочее
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/search?q=...` | Поиск |
| GET | `/api/share/[token]` | Публичная статья |
| POST | `/api/import/markdown` | Импорт MD файлов |
| GET/PATCH/DELETE | `/api/admin/users/[id]` | Управление пользователями |

---

## Паттерны и соглашения

### Frontend
- **Server Components** по умолчанию, `"use client"` только для интерактивности
- **Перезагрузка данных** через `reloadCount` state + `useEffect`
- **data-testid** атрибуты для E2E тестов

### API
- Авторизация через `authenticateRequest()` из `@/lib/api-auth`
- Поддержка сессий NextAuth и Bearer токенов (API Key)
- Проверка разрешений через `hasPermission(auth, "read"|"write"|"admin")`
- Ответы: `{ error: "message" }` с соответствующим HTTP кодом
- Транзакции Prisma для связанных операций

### Стили
- CSS Variables для тем (`:root` и `.dark`)
- Tailwind классы: `bg-card`, `text-foreground`, `text-muted-foreground`
- Компонентные классы: `.wikilink`, `.tag-badge`

---

## Переменные окружения

```env
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

---

## Запуск проекта

```bash
# Установка зависимостей
npm install

# Миграции БД
npx prisma migrate dev

# Запуск dev-сервера
npm run dev

# Сборка
npm run build

# E2E тесты
npx playwright test --project=chromium

# Очистка тестовых данных
npx tsx scripts/cleanup-test-data.ts
```

---

## Что можно улучшить (backlog)

- [ ] Избранные статьи
- [ ] Уведомления об изменениях
- [ ] Комментарии к статьям
- [ ] Экспорт в PDF
- [ ] Шаблоны статей
- [ ] Полнотекстовый поиск через pg_trgm или Elasticsearch
- [ ] Права доступа на уровне папок
- [ ] Интеграция с Active Directory / LDAP
