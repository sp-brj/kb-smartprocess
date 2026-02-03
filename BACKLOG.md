# Беклог: CRM модуль для управления проектами

> Расширение базы знаний до корпоративного портала с управлением проектами консалтинга по 1С

## Фаза 1: Фундамент ✅

### Prisma Schema
- [x] Добавить модель `Client` (название, ИНН, КПП, ОГРН, адреса, статус)
- [x] Добавить модель `ClientContact` (имя, должность, телефон, email, isPrimary)
- [x] Добавить модель `ClientBankAccount` (банк, БИК, р/с, к/с)
- [x] Добавить модель `ProjectStatus` (название, цвет, порядок, тип)
- [x] Добавить модель `Project` (название, клиент, статус, тип, даты, бюджет, менеджер)
- [x] Добавить модель `Task` (проект, название, статус, приоритет, исполнитель, дедлайн)
- [x] Добавить модель `ChecklistItem` (задача, текст, completed)
- [x] Добавить модель `TimeEntry` (проект, задача, дата, duration, тип работы, billable)
- [x] Добавить модель `Payment` (проект, сумма, дата, тип, статус)
- [x] Добавить связи в модель `User` (managedProjects, assignedTasks, timeEntries)
- [x] Применить изменения к БД `npx prisma db push`

### Seed данные
- [x] Создать скрипт `scripts/seed-project-statuses.ts`
- [x] Добавить статусы: Лид, Переговоры, Договор, В работе, Завершён, Отменён

### API статусов проектов
- [x] `GET /api/project-statuses` — список статусов
- [x] `POST /api/project-statuses` — создать статус (ADMIN)
- [x] `PATCH /api/project-statuses/[id]` — обновить статус
- [x] `DELETE /api/project-statuses/[id]` — удалить статус

---

## Фаза 2: Клиенты ✅

### API
- [x] `GET /api/clients` — список клиентов с фильтрацией (status, search)
- [x] `POST /api/clients` — создать клиента
- [x] `GET /api/clients/[id]` — детали клиента
- [x] `PATCH /api/clients/[id]` — обновить клиента
- [x] `DELETE /api/clients/[id]` — архивировать клиента
- [x] `GET /api/clients/[id]/contacts` — контакты клиента
- [x] `POST /api/clients/[id]/contacts` — добавить контакт
- [x] `PATCH /api/clients/[id]/contacts/[contactId]` — обновить контакт
- [x] `DELETE /api/clients/[id]/contacts/[contactId]` — удалить контакт
- [x] `GET /api/clients/[id]/bank-accounts` — банковские реквизиты
- [x] `POST /api/clients/[id]/bank-accounts` — добавить реквизиты
- [x] `PATCH /api/clients/[id]/bank-accounts/[accountId]` — обновить реквизиты
- [x] `DELETE /api/clients/[id]/bank-accounts/[accountId]` — удалить реквизиты

### UI
- [x] Создать layout `/crm/layout.tsx` с навигацией CRM
- [x] Страница `/crm/page.tsx` — обзор CRM (dashboard)
- [x] Страница `/crm/clients/page.tsx` — список клиентов (таблица)
- [x] Страница `/crm/clients/new/page.tsx` — создание клиента
- [x] Страница `/crm/clients/[id]/page.tsx` — карточка клиента
- [x] Страница `/crm/clients/[id]/edit/page.tsx` — редактирование клиента

### Компоненты (отложено — формы встроены в страницы)
- [ ] `ContactForm.tsx` — модальное окно добавления контакта
- [ ] `BankAccountForm.tsx` — модальное окно добавления реквизитов
- [ ] `ClientSelect.tsx` — выбор клиента (для форм проекта)

---

## Фаза 3: Проекты

### API
- [ ] `GET /api/projects` — список проектов с фильтрами (clientId, statusId, managerId, type)
- [ ] `POST /api/projects` — создать проект
- [ ] `GET /api/projects/[id]` — детали проекта
- [ ] `PATCH /api/projects/[id]` — обновить проект
- [ ] `DELETE /api/projects/[id]` — удалить проект
- [ ] `PATCH /api/projects/[id]/status` — изменить статус (для drag-drop воронки)
- [ ] `GET /api/projects/[id]/summary` — сводка (часы, бюджет, прогресс задач)

### UI
- [ ] Страница `/crm/projects/page.tsx` — список проектов
- [ ] Переключатель вид: таблица / воронка
- [ ] Страница `/crm/projects/new/page.tsx` — создание проекта
- [ ] Страница `/crm/projects/[id]/page.tsx` — детали проекта
- [ ] Страница `/crm/projects/[id]/edit/page.tsx` — редактирование проекта

### Компоненты
- [ ] `ProjectForm.tsx` — форма проекта (клиент, статус, тип, даты, бюджет)
- [ ] `ProjectsList.tsx` — таблица проектов
- [ ] `ProjectCard.tsx` — карточка проекта (для воронки)
- [ ] `ProjectPipeline.tsx` — воронка проектов (drag-drop между статусами)
- [ ] `ProjectSummary.tsx` — сводка (часы план/факт, бюджет, задачи)
- [ ] `ProjectSelect.tsx` — выбор проекта (для форм задач)
- [ ] `StatusBadge.tsx` — бейдж статуса с цветом

---

## Фаза 4: Задачи

### API
- [ ] `GET /api/tasks` — список задач с фильтрами (projectId, assigneeId, status, priority)
- [ ] `POST /api/tasks` — создать задачу
- [ ] `GET /api/tasks/[id]` — детали задачи
- [ ] `PATCH /api/tasks/[id]` — обновить задачу
- [ ] `DELETE /api/tasks/[id]` — удалить задачу
- [ ] `PATCH /api/tasks/[id]/status` — изменить статус (для канбана)
- [ ] `PATCH /api/tasks/[id]/order` — изменить порядок (для канбана)
- [ ] `GET /api/tasks/[id]/checklist` — чеклист задачи
- [ ] `POST /api/tasks/[id]/checklist` — добавить пункт чеклиста
- [ ] `PATCH /api/tasks/[id]/checklist/[itemId]` — обновить пункт (toggle completed)
- [ ] `DELETE /api/tasks/[id]/checklist/[itemId]` — удалить пункт

### UI
- [ ] Страница `/crm/tasks/page.tsx` — мои задачи (фильтр по assignee = текущий user)
- [ ] Страница `/crm/projects/[id]/kanban/page.tsx` — канбан задач проекта
- [ ] Модальное окно деталей задачи (или отдельная страница)

### Компоненты
- [ ] `TaskForm.tsx` — форма задачи (проект, название, описание, исполнитель, дедлайн)
- [ ] `TasksList.tsx` — таблица задач
- [ ] `TaskCard.tsx` — карточка задачи для канбана
- [ ] `TaskKanban.tsx` — канбан-доска (колонки: Todo, In Progress, Review, Done)
- [ ] `ChecklistEditor.tsx` — редактор чеклиста (добавление, toggle, удаление)
- [ ] `PriorityBadge.tsx` — бейдж приоритета (low/medium/high/urgent)
- [ ] `UserSelect.tsx` — выбор пользователя (исполнитель)

---

## Фаза 5: Таймлоги

### API
- [ ] `GET /api/time-entries` — список записей с фильтрами (projectId, taskId, userId, date range)
- [ ] `POST /api/time-entries` — создать запись
- [ ] `GET /api/time-entries/[id]` — детали записи
- [ ] `PATCH /api/time-entries/[id]` — обновить запись
- [ ] `DELETE /api/time-entries/[id]` — удалить запись
- [ ] `GET /api/time-entries/report` — отчёт (группировка по проекту/пользователю/типу работы)

### UI
- [ ] Страница `/crm/time/page.tsx` — журнал времени (свои записи)
- [ ] Страница `/crm/time/report/page.tsx` — отчёт по времени (ADMIN/MANAGER)
- [ ] Фильтры: период, проект, сотрудник, тип работы, billable

### Компоненты
- [ ] `TimeEntryForm.tsx` — форма записи времени (проект, задача, дата, duration, тип)
- [ ] `TimeEntriesList.tsx` — журнал времени (таблица с группировкой по дням)
- [ ] `TimeReport.tsx` — отчёт (таблица + итоги для выставления счетов)
- [ ] `DurationInput.tsx` — ввод времени (часы:минуты или десятичные)
- [ ] `WorkTypeBadge.tsx` — бейдж типа работы

---

## Фаза 6: Финансы

### API
- [ ] `GET /api/payments` — список оплат с фильтрами (projectId, status, date range)
- [ ] `POST /api/payments` — создать оплату
- [ ] `GET /api/payments/[id]` — детали оплаты
- [ ] `PATCH /api/payments/[id]` — обновить оплату
- [ ] `DELETE /api/payments/[id]` — удалить оплату

### UI
- [ ] Секция оплат в карточке проекта `/crm/projects/[id]/page.tsx`
- [ ] Сводка: бюджет проекта vs сумма оплат vs задолженность

### Компоненты
- [ ] `PaymentForm.tsx` — форма оплаты (сумма, дата, тип, статус, документ)
- [ ] `PaymentsList.tsx` — список оплат проекта
- [ ] `MoneyInput.tsx` — ввод суммы (форматирование)
- [ ] `BudgetSummary.tsx` — сводка бюджета (план/факт/остаток)

---

## Фаза 7: Интеграция и полировка

### CRM Dashboard
- [ ] Страница `/crm/page.tsx` — главная CRM
- [ ] Виджет: активные проекты (по статусам)
- [ ] Виджет: мои задачи (дедлайн скоро)
- [ ] Виджет: время за неделю
- [ ] Виджет: ожидаемые оплаты

### Навигация
- [ ] Обновить `Header.tsx` — переключатель модулей (База знаний / CRM)
- [ ] Создать `CrmSidebar.tsx` — навигация CRM модуля
- [ ] Breadcrumbs в CRM

### Настройки
- [ ] Страница `/crm/settings/statuses/page.tsx` — настройка статусов проектов (ADMIN)
- [ ] Drag-drop для изменения порядка статусов

### Тестирование
- [ ] E2E тесты для клиентов (CRUD)
- [ ] E2E тесты для проектов (CRUD + воронка)
- [ ] E2E тесты для задач (CRUD + канбан)
- [ ] E2E тесты для таймлогов (CRUD + отчёт)
- [ ] Проверить что тесты базы знаний проходят

### Документация
- [ ] Обновить `ARCHITECTURE.md` — добавить CRM модуль
- [ ] Обновить `.claude/CLAUDE.md` — инструкции для CRM

---

## Enums и типы

### ProjectStatusType
```
LEAD        — Лид
NEGOTIATION — Переговоры
CONTRACT    — Договор
WORK        — В работе
DONE        — Завершён
CANCELLED   — Отменён
```

### ProjectType
```
IMPLEMENTATION — Внедрение
CONSULTING     — Консалтинг
DEVELOPMENT    — Доработка
SUPPORT        — Сопровождение
```

### TaskStatus
```
TODO        — К выполнению
IN_PROGRESS — В работе
REVIEW      — На проверке
DONE        — Выполнено
```

### TaskPriority
```
LOW    — Низкий
MEDIUM — Средний
HIGH   — Высокий
URGENT — Срочный
```

### WorkType
```
CONSULTATION  — Консультация
DEVELOPMENT   — Разработка
TRAINING      — Обучение
TESTING       — Тестирование
DOCUMENTATION — Документация
MEETING       — Совещание
OTHER         — Прочее
```

### PaymentType
```
ADVANCE   — Аванс
MILESTONE — Этап
FINAL     — Финальная оплата
```

### PaymentStatus
```
PENDING   — Ожидается
RECEIVED  — Получена
CANCELLED — Отменена
```

---

## Приоритеты

**Must have (Фазы 1-4):**
- Клиенты, Проекты, Задачи — базовый функционал CRM

**Should have (Фазы 5-6):**
- Таймлоги с отчётами — для выставления счетов
- Финансы — учёт бюджета и оплат

**Nice to have (будущее):**
- Акты выполненных работ
- Интеграция с 1С (выгрузка актов)
- Уведомления (дедлайны, оплаты)
- Мобильная версия
