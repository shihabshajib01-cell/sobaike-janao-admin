window.setTimeout(function () {
  var fallback = document.getElementById('admin-boot-fallback');
  if (!fallback) return;

  var storageKey = 'sobaike-admin-boot-retries';
  var retries = Number(window.sessionStorage.getItem(storageKey) || '0');

  if (retries < 2) {
    window.sessionStorage.setItem(storageKey, String(retries + 1));
    var nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('__boot_refresh', Date.now().toString());
    window.location.replace(nextUrl.toString());
    return;
  }

  window.sessionStorage.removeItem(storageKey);

  var section = document.createElement('section');
  section.style.width = 'min(440px,100%)';
  section.style.textAlign = 'center';

  var heading = document.createElement('h1');
  heading.style.margin = '0 0 8px';
  heading.style.fontSize = '20px';
  heading.style.lineHeight = '1.4';
  heading.textContent = 'Admin panel did not finish loading';

  var description = document.createElement('p');
  description.style.margin = '0 0 16px';
  description.style.color = '#64748b';
  description.style.fontSize = '14px';
  description.style.lineHeight = '1.6';
  description.textContent = 'A cached deployment may still be open in this tab.';

  var button = document.createElement('button');
  button.type = 'button';
  button.style.minHeight = '40px';
  button.style.padding = '0 16px';
  button.style.border = '0';
  button.style.borderRadius = '6px';
  button.style.background = '#0284c7';
  button.style.color = '#fff';
  button.style.font = '600 14px system-ui';
  button.style.cursor = 'pointer';
  button.textContent = 'Reload';
  button.addEventListener('click', function () {
    window.location.reload();
  });

  section.append(heading, description, button);
  fallback.replaceChildren(section);
}, 4000);

window.addEventListener('load', function () {
  if (!document.getElementById('admin-boot-fallback')) {
    window.sessionStorage.removeItem('sobaike-admin-boot-retries');
  }
});