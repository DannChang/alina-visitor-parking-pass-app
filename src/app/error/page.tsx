export default function ErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
          Deployment error
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Authentication is not configured in this environment.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Set <code>AUTH_SECRET</code> or <code>NEXTAUTH_SECRET</code> in the production
          environment, then redeploy. If you are using a custom domain, also verify
          <code> NEXTAUTH_URL</code> and <code>NEXT_PUBLIC_APP_URL</code> point to the live HTTPS
          URL.
        </p>
      </div>
    </main>
  );
}
