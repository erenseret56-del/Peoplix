import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { submitConferenceDemoRequest } from '../../api/conference';

interface Props {
  initialEmail: string;
  conferenceSessionId?: string;
  onSubmitted: () => void;
}

export default function ConferenceDemoRequest({ initialEmail, conferenceSessionId, onSubmitted }: Props) {
  const [form, setForm] = useState({ name: '', email: initialEmail, company: '', jobTitle: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError('');
    try {
      await submitConferenceDemoRequest({
        source: 'conference',
        name: form.name,
        email: form.email,
        company: form.company,
        jobTitle: form.jobTitle,
        ...(form.phone.trim() ? { phone: form.phone } : {}),
        ...(form.message.trim() ? { message: form.message } : {}),
        ...(conferenceSessionId ? { conferenceSessionId } : {}),
      });
      onSubmitted();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'We could not submit your request. Please try again.');
    } finally { setSubmitting(false); }
  }

  return (
    <section className="conf-demo" aria-labelledby="conf-demo-title">
      <div className="conf-demo-heading">
        <p>CONTINUE THE CONVERSATION</p>
        <h1 id="conf-demo-title">Let&apos;s Talk About <em>PEOPLIX</em></h1>
        <span>Interested in bringing PEOPLIX to your organization? Leave your details and our team will get in touch.</span>
      </div>
      <form onSubmit={submit}>
        <div className="conf-demo-grid">
          <label>Name<input required autoComplete="name" maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
          <label>Work Email<input required type="email" inputMode="email" autoComplete="email" maxLength={255} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          <label>Company<input required autoComplete="organization" maxLength={160} value={form.company} onChange={event => setForm({ ...form, company: event.target.value })} /></label>
          <label>Job Title / Role<input required autoComplete="organization-title" maxLength={160} value={form.jobTitle} onChange={event => setForm({ ...form, jobTitle: event.target.value })} /></label>
          <label className="conf-demo-wide">Phone Number <span>(optional)</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={50} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="conf-demo-wide">Message / What would you like to explore? <span>(optional)</span><textarea rows={4} maxLength={2000} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} /></label>
        </div>
        {error && <p className="conf-error" role="alert">{error}</p>}
        <button className="conf-primary conf-demo-submit" type="submit" disabled={submitting}>{submitting ? 'Sending your request…' : 'Submit Demo Request'}<ArrowUpRight size={18} aria-hidden="true" /></button>
      </form>
    </section>
  );
}
