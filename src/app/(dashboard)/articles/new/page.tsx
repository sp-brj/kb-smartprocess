import { ArticleEditor } from "@/components/ArticleEditor";

export default function NewArticlePage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Новая статья</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ArticleEditor />
      </div>
    </div>
  );
}
