export default function Home() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Deximon</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Foundation is up. Auth, binder, marketplace, chat, and scanner ship in the coming weeks
        — see <code>docs/implementation-plan.md</code>.
      </p>
      <ul className="list-disc pl-6 text-sm text-neutral-600 dark:text-neutral-400">
        <li>
          API health:{" "}
          <a className="text-deximon hover:underline" href="http://localhost:8000/healthz">
            localhost:8000/healthz
          </a>
        </li>
        <li>
          Scanner health:{" "}
          <a className="text-deximon hover:underline" href="http://localhost:8001/healthz">
            localhost:8001/healthz
          </a>
        </li>
        <li>
          API docs:{" "}
          <a className="text-deximon hover:underline" href="http://localhost:8000/docs">
            localhost:8000/docs
          </a>
        </li>
      </ul>
    </section>
  );
}
