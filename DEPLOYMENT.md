# Деплой на GitHub Pages

Этот проект настроен для автоматического деплоя на GitHub Pages через GitHub Actions.

## Настройка GitHub Pages

1. **Перейдите в настройки репозитория:**
   - Откройте ваш репозиторий на GitHub
   - Перейдите в Settings → Pages

2. **Настройте источник деплоя:**
   - В разделе "Source" выберите "GitHub Actions"
   - Сохраните настройки

3. **Проверьте права доступа:**
   - Убедитесь, что у GitHub Actions есть права на запись в Pages
   - В Settings → Actions → General → Workflow permissions выберите "Read and write permissions"

## Локальная сборка

Для тестирования сборки локально:

```bash
cd main
pnpm install
pnpm run export
```

Собранные файлы будут в папке `main/out/`

## Настройка для подпапки репозитория

Если ваш репозиторий не находится в корне GitHub Pages (например, `username.github.io/repo-name`), раскомментируйте и настройте следующие строки в `next.config.ts`:

```typescript
basePath: '/your-repo-name',
assetPrefix: '/your-repo-name/',
```

Замените `your-repo-name` на название вашего репозитория.

## Автоматический деплой

После настройки GitHub Pages, каждый push в ветку `main` будет автоматически:
1. Собирать Next.js приложение
2. Деплоить его на GitHub Pages

URL вашего сайта будет доступен по адресу:
- `https://username.github.io/repository-name` (если репозиторий не в корне)
- `https://username.github.io` (если репозиторий в корне)
