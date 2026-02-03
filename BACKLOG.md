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

## Фаза 3: Проекты ✅

### API
- [x] `GET /api/projects` — список проектов с фильтрами (clientId, statusId, managerId, type, search)
- [x] `POST /api/projects` — создать проект
- [x] `GET /api/projects/[id]` — детали проекта (со статистикой: totalMinutes, totalPaid)
- [x] `PATCH /api/projects/[id]` — обновить проект
- [x] `DELETE /api/projects/[id]` — удалить проект
- [x] `PATCH /api/projects/[id]/status` — изменить статус (для drag-drop воронки)
- [ ] `GET /api/projects/[id]/summary` — сводка (отложено, статистика встроена в GET)

### UI
- [x] Страница `/crm/projects/page.tsx` — список проектов
- [x] Переключатель вид: таблица / воронка (pipeline view)
- [x] Страница `/crm/projects/new/page.tsx` — создание проекта
- [x] Страница `/crm/projects/[id]/page.tsx` — детали проекта (задачи, оплаты, статистика)
- [x] Страница `/crm/projects/[id]/edit/page.tsx` — редактирование проекта

### Компоненты (отложено — формы встроены в страницы)
- [ ] `ProjectForm.tsx` — форма проекта (клиент, статус, тип, даты, бюджет)
- [ ] `ProjectsList.tsx` — таблица проектов
- [ ] `ProjectCard.tsx` — карточка проекта (для воронки)
- [ ] `ProjectPipeline.tsx` — воронка проектов (drag-drop между статусами)
- [ ] `ProjectSummary.tsx` — сводка (часы план/факт, бюджет, задачи)
- [ ] `ProjectSelect.tsx` — выбор проекта (для форм задач)
- [ ] `StatusBadge.tsx` — бейдж статуса с цветом

---

## Фаза 4: Задачи ✅

### API
- [x] `GET /api/tasks` — список задач с фильтрами (projectId, assigneeId, status, priority, my)
- [x] `POST /api/tasks` — создать задачу (с чеклистом)
- [x] `GET /api/tasks/[id]` — детали задачи (с timeEntries)
- [x] `PATCH /api/tasks/[id]` — обновить задачу
- [x] `DELETE /api/tasks/[id]` — удалить задачу
- [x] `PATCH /api/tasks/[id]/status` — изменить статус (для канбана)
- [ ] `PATCH /api/tasks/[id]/order` — изменить порядок (отложено)
- [x] `GET /api/tasks/[id]/checklist` — чеклист задачи
- [x] `POST /api/tasks/[id]/checklist` — добавить пункт чеклиста
- [x] `PATCH /api/tasks/[id]/checklist/[itemId]` — обновить пункт (toggle completed)
- [x] `DELETE /api/tasks/[id]/checklist/[itemId]` — удалить пункт

### UI
- [x] Страница `/crm/tasks/page.tsx` — мои задачи (фильтр active/done/all)
- [x] Страница `/crm/tasks/new/page.tsx` — создание задачи с чеклистом
- [x] Страница `/crm/projects/[id]/kanban/page.tsx` — канбан задач проекта (drag-drop)
- [ ] Модальное окно деталей задачи (отложено)

### Компоненты (отложено — формы встроены в страницы)
- [ ] `TaskForm.tsx` — форма задачи (проект, название, описание, исполнитель, дедлайн)
- [ ] `TasksList.tsx` — таблица задач
- [ ] `TaskCard.tsx` — карточка задачи для канбана
- [ ] `TaskKanban.tsx` — канбан-доска (колонки: Todo, In Progress, Review, Done)
- [ ] `ChecklistEditor.tsx` — редактор чеклиста (добавление, toggle, удаление)
- [ ] `PriorityBadge.tsx` — бейдж приоритета (low/medium/high/urgent)
- [ ] `UserSelect.tsx` — выбор пользователя (исполнитель)

---

## Фаза 5: Таймлоги ✅

### API
- [x] `GET /api/time-entries` — список записей с фильтрами (projectId, taskId, userId, date range, my)
- [x] `POST /api/time-entries` — создать запись
- [x] `GET /api/time-entries/[id]` — детали записи
- [x] `PATCH /api/time-entries/[id]` — обновить запись
- [x] `DELETE /api/time-entries/[id]` — удалить запись
- [x] `GET /api/time-entries/report` — отчёт (группировка по проекту/пользователю/типу работы/дате)

### UI
- [x] Страница `/crm/time/page.tsx` — журнал времени с быстрым добавлением
- [x] Страница `/crm/time/report/page.tsx` — отчёт по времени с фильтрами и итогами
- [x] Фильтры: период, группировка (проект/сотрудник/тип работы/день)

### Компоненты (встроены в страницы)
- [ ] `TimeEntryForm.tsx` — форма записи времени (отложено)
- [ ] `TimeEntriesList.tsx` — журнал времени (отложено)
- [ ] `TimeReport.tsx` — отчёт (отложено)
- [ ] `DurationInput.tsx` — ввод времени (отложено)
- [ ] `WorkTypeBadge.tsx` — бейдж типа работы (отложено)

---

## Фаза 6: Финансы ✅

### API
- [x] `GET /api/payments` — список оплат с фильтрами (projectId, status, date range)
- [x] `POST /api/payments` — создать оплату
- [x] `GET /api/payments/[id]` — детали оплаты
- [x] `PATCH /api/payments/[id]` — обновить оплату
- [x] `DELETE /api/payments/[id]` — удалить оплату

### UI
- [x] Секция оплат в карточке проекта `/crm/projects/[id]/page.tsx`
- [x] Форма добавления оплаты (сумма, дата, тип, статус, № документа)
- [x] Смена статуса оплаты (select)
- [x] Удаление оплаты
- [x] Сводка: бюджет vs оплачено vs остаток (прогресс-бар)

### Компоненты (встроены в страницу проекта)
- [ ] `PaymentForm.tsx` — форма оплаты (отложено)
- [ ] `PaymentsList.tsx` — список оплат проекта (отложено)
- [ ] `MoneyInput.tsx` — ввод суммы (отложено)
- [ ] `BudgetSummary.tsx` — сводка бюджета (отложено)

---

## Фаза 7: Интеграция и полировка ✅

### CRM Dashboard
- [x] Страница `/crm/page.tsx` — главная CRM с виджетами
- [x] Виджет: активные проекты (по статусам)
- [x] Виджет: мои задачи + выполнено за неделю
- [x] Виджет: время за неделю
- [x] Виджет: ожидаемые оплаты с итого
- [x] Виджет: ближайшие дедлайны
- [x] Виджет: недавние проекты

### Навигация
- [ ] Обновить `Header.tsx` — переключатель модулей (отложено)
- [x] CRM навигация в `/crm/layout.tsx`
- [ ] Breadcrumbs в CRM (отложено)

### Настройки (отложено)
- [ ] Страница `/crm/settings/statuses/page.tsx` — настройка статусов проектов
- [ ] Drag-drop для изменения порядка статусов

### Тестирование (отложено)
- [ ] E2E тесты для CRM

### Документация
- [x] Обновить `ARCHITECTURE.md` — добавить CRM модуль
- [ ] Обновить `.claude/CLAUDE.md` — инструкции для CRM (отложено)

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
