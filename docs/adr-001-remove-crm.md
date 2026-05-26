# ADR-001: Удаление CRM-модуля

- **Дата:** 2026-05-26
- **Статус:** Принято и реализовано
- **Автор:** Muhammad Nurmagomedov

## Контекст

В sp-kb помимо базы знаний был построен CRM-модуль (клиенты, проекты, задачи, таймтрекинг, оплаты) — изначально как часть единого корпоративного портала SmartProcess. Реализация включала:

- 16 страниц в `/crm/*`
- 21 API-route (`/api/clients`, `/api/projects`, `/api/tasks`, `/api/time-entries`, `/api/payments`, `/api/project-statuses`)
- 9 Prisma-моделей (Client, ClientContact, ClientBankAccount, ProjectStatus, Project, Task, ChecklistItem, TimeEntry, Payment) + 8 enum'ов
- E2E-тесты, Page Objects, seed-скрипт статусов
- Переключатель модулей KB/CRM в Header

## Решение

Полностью вырезать CRM из репозитория. База знаний остаётся единственным функциональным модулем проекта.

## Почему

- CRM не использовался — owner решил не развивать это направление в рамках sp-kb
- Код был тяжёлым (9700+ строк) и тянул контекст при работе над KB
- Два модуля в одном репо ломают фокус проекта: «база знаний» — понятный продукт, «база знаний + CRM» — расплывчатый
- Production-данных в CRM-таблицах не было (см. ниже)

## Альтернативы (отвергнуты)

| Альтернатива | Почему отвергнуто |
|--------------|-------------------|
| Оставить «на будущее», скрыть из UI | Мёртвый код в репо. Тянет билд, тесты, ревью. |
| Вынести в отдельный репозиторий | Нет планов развивать CRM ни в каком виде. |
| Закомментировать модели в schema.prisma | Полумера. Тогда уж удалить. |

## Последствия

**Положительные:**
- Минус 9617 строк кода (-58 файлов)
- Проект снова имеет один понятный фокус — KB
- Билд быстрее, ревью проще

**Отрицательные:**
- Если CRM когда-то понадобится — восстанавливать из git-истории (коммит `8a47a1f`, ветка `main` до него)

## Технические детали реализации

**Удалено:**
- `src/app/(dashboard)/crm/` — все страницы
- `src/app/api/{clients,projects,tasks,time-entries,payments,project-statuses}/` — все routes
- `src/components/crm/` — 5 компонентов
- `e2e/specs/crm/`, `e2e/pages/crm.page.ts` — тесты и Page Object
- `scripts/seed-project-statuses.ts`
- Из `prisma/schema.prisma`: 9 моделей, 8 enum'ов, 3 relations из `User`

**Изменено:**
- `src/components/Header.tsx` — убран переключатель KB/CRM
- `ARCHITECTURE.md`, `.claude/CLAUDE.md` — удалены разделы про CRM
- `scripts/backup-full.ts` — убраны CRM-таблицы из списка
- `e2e/fixtures/auth.fixture.ts`, `e2e/pages/index.ts` — убраны импорты CrmPage

## Заметка о миграции БД

**Миграция Prisma не создавалась — она не нужна.** При проверке `prisma/migrations/` выяснилось, что CRM-таблицы **никогда не создавались в реальной БД**. Модели существовали только в `schema.prisma` (как код), но `prisma migrate dev` для них ни разу не запускался. То есть в Supabase-БД таблиц `Client`, `Project`, `Task`, `TimeEntry`, `Payment` и др. физически не было.

После удаления моделей из `schema.prisma` схема Prisma снова соответствует реальной БД — DROP-миграция не требуется.

Это объясняет, почему API-endpoints CRM никогда нормально не работали в production: они обращались к несуществующим таблицам.

## Релиз

- Коммит: `8a47a1f` — `feat: вырезать CRM-модуль из проекта`
- Деплой: Vercel auto-deploy после push в `main`
- Production URL: https://kb.smartprocess.ru
