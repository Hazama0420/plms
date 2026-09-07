import fs from 'fs';
import path from 'path';

function findRoutes(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findRoutes(fullPath));
    } else if (file === 'route.ts' || file === 'route.js') {
      results.push(fullPath);
    }
  });
  return results;
}

const routes = findRoutes('app/api');
console.log(`Found ${routes.length} API routes.\n`);

routes.forEach(r => {
  const content = fs.readFileSync(r, 'utf8');
  const relPath = r.replace(/\\/g, '/');
  const hasRequireAuth = content.includes('requireAuth');
  const hasRequireRole = content.includes('requireRole');
  const hasRequirePermission = content.includes('requirePermission');
  const hasGetAuthContext = content.includes('getAuthContext');
  const hasCronSecret = content.includes('CRON_SECRET') || content.includes('timingSafeEqual');
  const hasAiPolicy = content.includes('authorizeAI');

  const methods = [];
  if (/export\s+async\s+function\s+GET/i.test(content)) methods.push('GET');
  if (/export\s+async\s+function\s+POST/i.test(content)) methods.push('POST');
  if (/export\s+async\s+function\s+PATCH/i.test(content)) methods.push('PATCH');
  if (/export\s+async\s+function\s+PUT/i.test(content)) methods.push('PUT');
  if (/export\s+async\s+function\s+DELETE/i.test(content)) methods.push('DELETE');

  const guards = [];
  if (hasRequireRole) guards.push('requireRole');
  if (hasRequireAuth) guards.push('requireAuth');
  if (hasRequirePermission) guards.push('requirePermission');
  if (hasGetAuthContext) guards.push('getAuthContext');
  if (hasCronSecret) guards.push('CRON_SECRET');
  if (hasAiPolicy) guards.push('authorizeAI');

  const isGuarded = guards.length > 0;
  console.log(`[${methods.join(',') || 'UNKNOWN'}] ${relPath} -> ${isGuarded ? guards.join('+') : '⚠️ UNGUARDED / PUBLIC'}`);
});
