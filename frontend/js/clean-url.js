// Shows the clean address: /shop instead of /shop.html, and the folder instead of /index.html. The page keeps loading as it is;
// only the address bar changes (no redirect, no flash). Runs before anything else on every public and admin page.
(function () {
  var path = location.pathname;
  var clean = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (clean !== path) history.replaceState(history.state, '', clean + location.search + location.hash);
})();
