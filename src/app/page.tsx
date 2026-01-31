export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-slate-900">
            Alina Visitor Parking
          </h1>
          <p className="text-xl text-slate-600">
            Welcome to the visitor parking management system
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-semibold text-slate-800">
            🏥 System Status
          </h2>

          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between rounded-md bg-green-50 p-4">
              <span className="font-medium text-green-900">Foundation</span>
              <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-semibold text-white">
                ✓ Complete
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md bg-yellow-50 p-4">
              <span className="font-medium text-yellow-900">Database Setup</span>
              <span className="rounded-full bg-yellow-500 px-3 py-1 text-sm font-semibold text-white">
                ⚠ Required
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md bg-gray-50 p-4">
              <span className="font-medium text-gray-900">Authentication</span>
              <span className="rounded-full bg-gray-400 px-3 py-1 text-sm font-semibold text-white">
                ○ Pending
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="rounded-md bg-blue-50 p-4 text-left">
              <h3 className="mb-2 font-semibold text-blue-900">Next Steps:</h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
                <li>Update DATABASE_URL in .env.local</li>
                <li>Run: pnpm db:generate</li>
                <li>Run: pnpm db:push</li>
                <li>Run: pnpm db:seed</li>
              </ol>
            </div>

            <div className="rounded-md border-2 border-slate-200 p-4 text-left">
              <h3 className="mb-2 font-semibold text-slate-900">Quick Links:</h3>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>
                  📖{' '}
                  <a
                    href="/README.md"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    Project Overview
                  </a>
                </li>
                <li>
                  🚀{' '}
                  <a
                    href="/SETUP.md"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    Setup Guide
                  </a>
                </li>
                <li>
                  📊{' '}
                  <a
                    href="/IMPLEMENTATION_STATUS.md"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    Implementation Status
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-slate-500">
          <p>Mission-critical parking management for healthcare facilities</p>
          <p className="mt-2">Built with Next.js 15 • TypeScript • Prisma • Tailwind CSS</p>
        </div>
      </div>
    </main>
  );
}
