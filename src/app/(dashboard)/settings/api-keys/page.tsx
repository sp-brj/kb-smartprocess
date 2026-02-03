import ApiKeysManager from "@/components/ApiKeysManager";

export const metadata = {
  title: "API Ключи | База знаний",
};

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">API Ключи</h2>
        <p className="text-sm text-muted-foreground mt-1">
          API ключи позволяют внешним приложениям (боты, скрипты) получать доступ к базе знаний
        </p>
      </div>
      <ApiKeysManager />
    </div>
  );
}
