# momo

Steam & Spice (placeholder name): homemade frozen momo, UK, pickup only. Hand-written static site plus a small admin panel. See `CLAUDE.md` and `docs/`.

## Run and build

```
npm install
npm run dev     # http://localhost:8080/  (admin at /admin/), set PORT to change
npm run build   # writes dist/
npm test        # node --test
```

Build reads `SITE_URL` and `SITE_INDEXABLE`. The site is not indexable unless `SITE_INDEXABLE` is exactly `true`: pages get `noindex` and `robots.txt` disallows all.
