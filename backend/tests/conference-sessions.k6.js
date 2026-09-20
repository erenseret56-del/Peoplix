import http from 'k6/http';
import { check, sleep } from 'k6';

// Session APIs only. No paid calls or live audio are created by this script.
if (__ENV.ALLOW_CONFERENCE_LOAD_TEST !== 'yes' || !__ENV.BASE_URL) {
  throw new Error('Set BASE_URL to a staging API and ALLOW_CONFERENCE_LOAD_TEST=yes explicitly.');
}
const base = __ENV.BASE_URL.replace(/\/$/, '');
export const options = {
  scenarios: { conference: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '30s', target: 25 }, { duration: '30s', target: 100 },
    { duration: '30s', target: 300 }, { duration: '4m', target: 300 }, { duration: '15s', target: 0 },
  ] } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1500'] },
};
export default function () {
  const create = http.post(`${base}/api/conference/sessions`, JSON.stringify({
    email: `load-${__VU}-${__ITER}-${Date.now()}@conference-test.example`, consent: true,
  }), { headers: { 'Content-Type': 'application/json' } });
  if (!check(create, { 'session admitted': response => response.status === 201 })) return;
  const token = create.json('data.token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  sleep(180 + Math.random() * 20);
  const state = http.get(`${base}/api/conference/session`, { headers });
  check(state, { 'session still valid': response => response.status === 200 });
  const end = http.post(`${base}/api/conference/end`, '{}', { headers });
  check(end, { 'session ended': response => response.status === 200 });
  sleep(60);
}
