const isRawGitHubPagesSource =
  window.location.hostname.endsWith('github.io') && !import.meta.env?.PROD;

if (isRawGitHubPagesSource) {
  const root = document.getElementById('root');

  if (root) {
    root.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a">
        <section role="status" aria-live="polite" style="width:min(440px,100%);text-align:center">
          <div aria-hidden="true" style="width:32px;height:32px;margin:0 auto 16px;border:3px solid #cbd5e1;border-top-color:#0284c7;border-radius:9999px;animation:sobaike-deploy-spin .8s linear infinite"></div>
          <h1 style="margin:0 0 8px;font-size:20px;line-height:1.4">Updating admin panel…</h1>
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6">The latest production bundle is being activated. This page will refresh automatically.</p>
        </section>
      </main>
      <style>@keyframes sobaike-deploy-spin{to{transform:rotate(360deg)}}</style>
    `;
  }

  const retryWithCacheBust = () => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('__deploy_refresh', Date.now().toString());
    window.location.replace(nextUrl.toString());
  };

  window.setTimeout(retryWithCacheBust, 3000);
} else {
  import('./main.tsx');
}
