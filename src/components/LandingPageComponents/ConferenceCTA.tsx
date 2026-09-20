import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ConferenceCTA.css';

export default function ConferenceCTA() {
  return <section className="conference-cta" aria-label="PEOPLIX conference experience">
    <p>A conversation changes everything.</p>
    <Link to="/conference"><span>Experience PEOPLIX Live</span><ArrowUpRight size={19} aria-hidden="true" /></Link>
    <span className="conference-cta-note">Meet Ava. Discover a more human way to HR.</span>
  </section>;
}
