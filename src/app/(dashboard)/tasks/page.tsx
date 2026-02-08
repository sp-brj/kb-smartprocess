export default function TasksPage() {
  return (
    <div className="h-[calc(100vh-73px)] -m-6">
      <iframe
        src="https://vikunja.smartprocess.ru"
        className="w-full h-full border-0"
        allow="clipboard-write; clipboard-read"
        title="Vikunja Tasks"
      />
    </div>
  );
}
