// A page that cannot start must say so instead of staying blank. Classic script (not a module) so it runs even when a module fails
// to load. It only speaks up while the page is still hidden behind the session check (body[data-auth]); once the admin is usable,
// each screen shows its own errors.
(function () {
  var shown = false;
  function show(message) {
    if (shown || !document.body || !document.body.hasAttribute('data-auth')) return;
    shown = true;
    document.body.removeAttribute('data-auth');
    var box = document.createElement('div');
    box.className = 'boot-error';
    box.setAttribute('role', 'alert');
    box.appendChild(document.createTextNode('This page could not start: ' + message + ' '));
    var link = document.createElement('a');
    link.href = location.pathname;
    link.textContent = 'Reload';
    box.appendChild(link);
    document.body.insertBefore(box, document.body.firstChild);
  }
  window.addEventListener('error', function (e) {
    var t = e && e.target;
    if (t && t !== window && t.tagName !== 'SCRIPT') return; // a missing picture is not a failed page
    show((e && e.message) || (t && t.src ? 'could not load ' + t.src.split('/').slice(-2).join('/') : 'unknown error'));
  }, true);
  window.addEventListener('unhandledrejection', function (e) { show(String((e.reason && e.reason.message) || e.reason || 'unknown error')); });
  setTimeout(function () { show('it is taking too long. Check your connection.'); }, 8000);
})();
