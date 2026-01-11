"use client";

import { useEffect, useRef } from "react";

interface Props {
  articleId: string;
}

export function ArticleViewTracker({ articleId }: Props) {
  const startTime = useRef<number | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    // Инициализируем startTime при монтировании
    if (startTime.current === null) {
      startTime.current = Date.now();
    }
    // Генерируем или получаем sessionId
    let sessionId = sessionStorage.getItem("analytics_session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("analytics_session", sessionId);
    }

    // Отправляем просмотр с задержкой 3 секунды (отсечь случайные переходы)
    const timeout = setTimeout(() => {
      if (!tracked.current) {
        fetch("/api/analytics/track/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, sessionId }),
        }).catch(() => {
          // Игнорируем ошибки трекинга
        });
        tracked.current = true;
      }
    }, 3000);

    // При уходе со страницы отправляем duration
    const handleBeforeUnload = () => {
      if (tracked.current && startTime.current !== null) {
        const duration = Math.round((Date.now() - startTime.current) / 1000);

        // Используем sendBeacon для надёжной отправки при закрытии
        navigator.sendBeacon(
          "/api/analytics/track/view",
          JSON.stringify({ articleId, sessionId, duration })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [articleId]);

  return null; // Невидимый компонент
}
