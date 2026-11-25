export function DocumentationView() {
  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          System Documentation & Setup Guide
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Reference guide covering student reporting, administrator operations, database structure, and running locally in Visual Studio Code (SRS Section 2.6).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            01. Student User Guide
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>Open the Report Issue tab and enter your Student Name and Student ID.</li>
            <li>Specify the campus building, floor, or room in the Location field.</li>
            <li>Describe the issue clearly; the ML engine suggests a matching category automatically.</li>
            <li>Click Accept Suggestion or pick any category manually, then submit to receive your unique reference code.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            02. Administrator Guide
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>Open Admin Console and claim the initial administrator password (or use your configured ADMIN_PASSCODE).</li>
            <li>Inspect Total, Pending, and Resolved KPIs alongside live Chart.js category graphs.</li>
            <li>Filter complaints by status, category, or search keywords, and click View for full details.</li>
            <li>Mark complaints as Resolved once fixed, reopen if needed, or export records as CSV.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            03. Database Schema (SQLite / MySQL)
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            All records persist in <span className="font-mono text-slate-700">data/campus_issues.db</span> with parameterized SQL queries. MySQL-compatible DDL is stored in <span className="font-mono text-slate-700">database/schema.sql</span>.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
{`complaints (
  id INTEGER PRIMARY KEY,
  complaint_code TEXT UNIQUE,
  student_name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TEXT,
  updated_at TEXT
)`}
          </pre>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            04. Running in VS Code
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            The repository includes VS Code launch configurations (<span className="font-mono text-slate-700">.vscode/launch.json</span>) for one-click debugging.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
{`# 1. Install dependencies
npm install

# 2. Start full-stack server (port 3000)
npm run dev

# 3. Typecheck & production build
npm run lint
npm run build`}
          </pre>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Troubleshooting
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-900">Category suggestion does not appear</dt>
            <dd className="mt-1 text-xs leading-relaxed text-slate-600">
              Ensure the description has at least 8 characters or click the Suggest Category button directly above the description box.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Port 3000 already in use locally</dt>
            <dd className="mt-1 text-xs leading-relaxed text-slate-600">
              Set a different <span className="font-mono">PORT=3001</span> environment variable in your <span className="font-mono">.env</span> file before running <span className="font-mono">npm run dev</span>.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
