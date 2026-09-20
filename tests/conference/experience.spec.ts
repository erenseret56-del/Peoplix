import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const id = 'bfbc9faf-0047-4df1-b5a6-8910fb5e6901';
const token = 'a'.repeat(43);
function session(overrides = {}) {
  const now = Date.now();
  return { sessionId: id, token, companyDomain: 'example-corp.test', status: 'created', sessionStart: new Date(now).toISOString(),
    expiresAt: new Date(now + 300000).toISOString(), conversationEndsAt: null, callStatus: null, canRetry: false,
    serverNow: new Date(now).toISOString(), ...overrides };
}
async function mockApi(page: Page, options: { expired?: boolean; shortCall?: boolean } = {}) {
  let current = session();
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stats/summary')) return route.fulfill({ json: { success: true, data: {
      kpis: Object.fromEntries(['total_calls', 'answered_calls', 'missed_calls', 'avg_call_duration_seconds', 'total_talk_time_minutes', 'conversions'].map(key => [key, { value: 0, trend: 0 }])),
      chart: { trend_percentage: 0, total_week: 0, daily_average: 0, peak_day: '—', series: [] },
    } } });
    if (path.endsWith('/sessions')) {
      const { email } = route.request().postDataJSON();
      if (email.endsWith('@gmail.com')) return route.fulfill({ status: 400, json: { success: false, error: { code: 'WORK_EMAIL_REQUIRED', message: 'Please enter your company email address to access the conference experience.' } } });
      current = session(); return route.fulfill({ status: 201, json: { success: true, data: current } });
    }
    if (path.endsWith('/demo-requests/verify-access')) return route.fulfill({ json: { success: true, data: { granted: true } } });
    if (path.endsWith('/site-config/public/start-call')) return route.fulfill({ json: { success: true, data: { access_token: 'homepage-provider-token', call_id: 'call_homepage_test', agent_name: 'Ava' } } });
    if (path.endsWith('/session')) {
      if (options.expired) return route.fulfill({ status: 410, json: { success: false, error: { code: 'SESSION_EXPIRED', message: 'Your conference session has ended.' } } });
      return route.fulfill({ json: { success: true, data: current } });
    }
    if (path.endsWith('/call')) {
      current = session({ status: 'active', callStatus: 'registered', conversationEndsAt: new Date(Date.now() + (options.shortCall ? 6000 : 180000)).toISOString() });
      return route.fulfill({ json: { success: true, data: { ...current, accessToken: 'test-provider-token', callId: 'call_browser_test' } } });
    }
    if (path.endsWith('/end')) { current = { ...current, status: 'completed' }; return route.fulfill({ json: { success: true, data: current } }); }
    return route.fulfill({ json: { success: true, data: [], pagination: { total: 0, totalPages: 0, page: 1 } } });
  });
}
async function mockVoice(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => ({ getTracks: () => [{ stop() {} }] }) });
  });
  // The browser smoke test uses an SDK double. Live provider audio is a separate
  // launch check and is deliberately never billed by automated tests.
  await page.route('**/assets/retell-vendor-*.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    class Client {
      listeners = {}; on(name, fn) { (this.listeners[name] ||= []).push(fn); }
      emit(name) { this.listeners[name]?.forEach(fn => fn()); }
      async startCall() { this.emit('call_started'); }
      stopCall() { this.emit('call_ended'); }
      removeAllListeners() { this.listeners = {}; }
      mute() {} unmute() {} async startAudioPlayback() {}
    }
    const api = { RetellWebClient: Client };
    export { api as i, Client as s };
  ` }));
}
async function enter(page: Page) {
  await page.getByLabel('Enter your work email').fill('visitor@example-corp.test');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Meet Ava', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start Conversation' })).toBeVisible();
}

test('desktop cinematic entry, independent page bundle and work email access', async ({ page }) => {
  const errors: string[] = []; const scripts: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockApi(page); await page.goto('/conference');
  await expect(page.locator('.conf-intro')).toBeVisible();
  await expect(page.locator('.conf-intro')).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Meet Ava.' })).toBeVisible();
  expect(scripts.some(url => /AdminPortal|charts-vendor/.test(url))).toBe(false);
  await page.getByLabel('Enter your work email').fill('visitor@gmail.com'); await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Meet Ava', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('company email');
  await page.screenshot({ path: 'test-results/conference-desktop.png', fullPage: true });
  await enter(page); await expect(page.locator('.conf-timers')).toContainText('Session');
  expect(errors).toEqual([]);
});

for (const width of [390, 768]) {
  test(`responsive conference at ${width}px has usable form and no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await mockApi(page); await page.goto('/conference');
    await page.getByRole('button', { name: 'Skip introduction' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const input = await page.getByLabel('Enter your work email').boundingBox(); expect(input!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `test-results/conference-${width}.png`, fullPage: true });
    await enter(page);
  });
}

test('reduced motion skips cinematic wait and keeps keyboard focus visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mockApi(page); await page.goto('/conference');
  await expect(page.locator('.conf-intro')).toHaveCount(0, { timeout: 1500 });
  await page.getByLabel('Enter your work email').focus();
  await expect(page.getByLabel('Enter your work email')).toBeFocused();
  const animation = await page.locator('.conf-signal i').first().evaluate(element => getComputedStyle(element).animationName);
  expect(animation).toBe('none');
});

test('voice controls, warning and call deadline complete the experience', async ({ page }) => {
  await mockApi(page, { shortCall: true }); await mockVoice(page); await page.goto('/conference');
  await page.getByRole('button', { name: 'Skip introduction' }).click(); await enter(page);
  await page.getByRole('button', { name: 'Start Conversation' }).click();
  await expect(page.getByRole('button', { name: 'Mute microphone' })).toBeEnabled();
  await page.getByRole('button', { name: 'Mute microphone' }).click();
  await expect(page.getByRole('button', { name: 'Unmute microphone' })).toBeVisible();
  await expect(page.getByText('About 30 seconds left.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Thanks for experiencing PEOPLIX.' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Book a Demo' })).toHaveAttribute('href', '/#contact');
});

test('expired session restores into a clear completion state', async ({ page }) => {
  await page.addInitScript(value => sessionStorage.setItem('peoplix_conference_token', value), token);
  await mockApi(page, { expired: true }); await page.goto('/conference');
  await expect(page.getByText('Your five-minute conference session has ended.')).toBeVisible();
});

test('homepage preserves Business Value → CTA → FAQ order and navigation', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('peoplix_intro_seen', 'true'));
  await mockApi(page); await page.goto('/');
  const cta = page.getByRole('link', { name: 'Experience PEOPLIX Live' }); await expect(cta).toBeVisible();
  const order = await page.locator('.conference-cta').evaluate(element => ({ previous: element.previousElementSibling?.id, next: element.nextElementSibling?.textContent }));
  expect(order.previous).toBe('resources'); expect(order.next?.toLowerCase()).toContain('question');
  await cta.click(); await expect(page).toHaveURL(/\/conference$/);
});

test('homepage Ava demo still starts through the shared voice implementation', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('peoplix_intro_seen', 'true'));
  await mockApi(page); await mockVoice(page); await page.goto('/');
  await page.getByRole('button', { name: "I've got access" }).click();
  await page.getByLabel('Approved email address').fill('visitor@example-corp.test');
  await page.getByRole('button', { name: 'Verify and start call' }).click();
  await expect(page.getByText('Ava', { exact: true })).toBeVisible();
  await expect(page.getByTitle('Mute')).toBeVisible();
});

test('conference admin route excludes company admins and visitors', async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.setItem('peoplix_intro_seen', 'true'); localStorage.setItem('token', 'fake-client-token'); localStorage.setItem('role', 'company_admin'); });
  await mockApi(page); await page.goto('/admin/conference'); await expect(page).toHaveURL(/\/signin$/);
});

test('super admin can open the conference table without runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { sessionStorage.setItem('peoplix_intro_seen', 'true'); localStorage.setItem('token', 'fake-admin-token'); localStorage.setItem('role', 'super_admin'); });
  await mockApi(page); await page.goto('/admin/conference');
  await expect(page.getByRole('heading', { name: 'Conference Activity' })).toBeVisible();
  await expect(page.getByText('No conference visitors match these filters.')).toBeVisible();
  await page.screenshot({ path: 'test-results/conference-admin.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('admin visitor details expose transcript and summary in an accessible dialog', async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.setItem('peoplix_intro_seen', 'true'); localStorage.setItem('token', 'fake-admin-token'); localStorage.setItem('role', 'super_admin'); });
  await mockApi(page);
  const visitor = { ...session(), email: 'jane@example-corp.test', status: 'completed', callStatus: 'ended', callId: 'call_detail', sessionDuration: 163000,
    calls: [{ attemptId: 'attempt', callId: 'call_detail', status: 'ended', durationMs: 150000, hasRecording: false, hasTranscript: true, hasSummary: true, transcript: 'Ava: How can I help your HR team?', summary: 'Explored employee self-service.' }] };
  await page.route('**/api/conference/activity**', route => route.fulfill({ json: { success: true,
    data: new URL(route.request().url()).pathname.endsWith('/activity') ? [visitor] : visitor,
    pagination: { total: 1, totalPages: 1, page: 1 } } }));
  await page.goto('/admin/conference');
  await page.getByRole('button', { name: 'jane@example-corp.test', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Explored employee self-service.');
  await expect(dialog).toContainText('Ava: How can I help your HR team?');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});

for (const [role, path] of [['super_admin', '/admin/portal'], ['company_admin', '/dashboard']]) {
  test(`existing ${role} portal still renders after route splitting`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => { sessionStorage.setItem('peoplix_intro_seen', 'true'); localStorage.setItem('token', 'test-token'); localStorage.setItem('role', value); }, role);
    await mockApi(page); await page.goto(path);
    await expect(page.getByText('Loading PEOPLIX…')).toHaveCount(0);
    if (role === 'super_admin') await expect(page.getByRole('button', { name: 'Conference Activity' })).toBeVisible();
    else {
      await expect(page.getByRole('heading', { name: 'Call Volume Trends' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
