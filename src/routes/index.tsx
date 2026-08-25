import { createFileRoute } from "@tanstack/react-router";
import { Workbench } from "@/components/chess/workbench";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <Workbench />
    </main>
  );
}
