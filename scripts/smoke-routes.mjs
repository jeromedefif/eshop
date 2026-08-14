const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const routes = [
  { path: '/', contains: 'VINARIA' },
  { path: '/order-summary', contains: 'Souhrn objednávky' },
  { path: '/my-orders', contains: 'Moje objednávky' },
  { path: '/my-profile', contains: 'Můj profil' },
  { path: '/login', contains: 'Přihlášení' },
  { path: '/produkty', contains: 'Velkoobchodní katalog' }
];

let failed = false;

for (const route of routes) {
  const url = `${baseUrl}${route.path}`;

  try {
    const response = await fetch(url, { redirect: 'follow' });
    const html = await response.text();
    const hasExpectedContent = html.includes(route.contains);
    const passed = response.ok && hasExpectedContent;

    console.log(
      `${passed ? 'OK' : 'FAIL'} ${route.path} ` +
      `(status ${response.status}, text "${route.contains}")`
    );

    if (!passed) failed = true;
  } catch (error) {
    failed = true;
    console.error(`FAIL ${route.path}: ${error instanceof Error ? error.message : error}`);
  }
}

if (failed) process.exitCode = 1;
