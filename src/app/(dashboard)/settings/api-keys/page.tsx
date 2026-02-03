import ApiKeysManager from "@/components/ApiKeysManager";

export const metadata = {
  title: "API Ключи | База знаний",
};

export default function ApiKeysPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">API Ключи</h1>
      <p className="text-muted-foreground mb-6">
        API ключи позволяют внешним приложениям (боты, скрипты) получать доступ к базе знаний.
      </p>
      <ApiKeysManager />
    </div>
  );
}
