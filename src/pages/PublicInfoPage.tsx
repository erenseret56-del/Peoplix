import { Link, useParams } from "react-router-dom";

interface PageContent {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string; points?: string[] }[];
}

const pages: Record<string, PageContent> = {
  "book-demo": {
    eyebrow: "Get started",
    title: "See Peoplix in action",
    intro: "Book a guided conversation about how autonomous agents can resolve your enterprise service requests end-to-end.",
    sections: [
      { heading: "A focused walkthrough", body: "We map your highest-volume inbound calls, show how an AI voice agent answers in your tone, and outline the integrations needed for a practical first deployment.", points: ["Inbound phone answering and caller intent detection", "Knowledge-base answers from approved documents and policies", "Authentication, data lookup, and secure workflow actions", "Human transfer when confidence, policy, or caller sentiment requires it"] },
      { heading: "What we cover", body: "The demo is tailored to your operating model rather than a generic chatbot script.", points: ["Call volume, business hours, languages, and peak periods", "CRM, HRIS, ticketing, calendar, and telephony integrations", "Escalation rules, call summaries, recordings, and audit requirements", "Pilot scope, success metrics, and production rollout conditions"] },
      { heading: "Before confidential discovery", body: "A mutual non-disclosure agreement can be signed before your team shares confidential workflows, internal policies, sample call recordings, architecture diagrams, or security documentation.", points: ["Confirm the business and legal contacts for the NDA", "Define what information is confidential and how it may be used", "Share only approved examples relevant to the evaluation", "Agree on return, deletion, and retention expectations"] },
      { heading: "From agreement to pilot", body: "Enterprise engagements move through clear checkpoints before production access is granted.", points: ["Mutual NDA and initial discovery", "Security, privacy, and data-processing review", "Agent design, knowledge approval, and integration plan", "Limited pilot with escalation rules and success metrics", "Production agreement, launch approval, and monitoring"] },
    ],
  },
  overview: {
    eyebrow: "Resources",
    title: "Watch the Peoplix overview",
    intro: "Explore how Peoplix combines conversational AI, policy reasoning, and secure system execution for enterprise operations.",
    sections: [{ heading: "From call to resolution", body: "Peoplix handles the complete voice workflow instead of stopping at transcription.", points: ["Answers inbound calls using a configured greeting and business context", "Identifies the caller's intent and asks only the questions needed", "Searches approved knowledge, FAQs, policies, and connected systems", "Executes permitted actions or creates a structured handoff", "Returns a clear answer and stores a summary, transcript, and outcome"] }, { heading: "Built for real conditions", body: "The agent can follow operating rules for situations that need more care.", points: ["Business-hours routing and after-hours voicemail or callback capture", "Low-confidence escalation instead of guessing", "Sensitive requests routed through identity verification", "Urgent, angry, or high-risk callers transferred to a human team"] }],
  },
  "case-studies": {
    eyebrow: "Resources",
    title: "Case studies",
    intro: "See how operations teams use Peoplix to reduce repetitive work and improve the employee experience.",
    sections: [{ heading: "Practical automation", body: "AI calling agents are most useful when they are connected to the systems and policies behind the conversation.", points: ["Reduce repetitive calls without forcing callers through rigid menus", "Give agents approved answers instead of open-ended model responses", "Move from a call to a completed update, booking, lookup, or ticket", "Keep a searchable record of what was asked and what the agent did"] }, { heading: "Measure the outcome", body: "A useful pilot should be judged by operational results, not just how natural the voice sounds.", points: ["Containment and successful resolution rate", "Transfer rate and reasons for escalation", "Average handle time and callback reduction", "Accuracy, compliance exceptions, and caller satisfaction"] }, { heading: "Responsible evaluation", body: "A pilot should protect confidential information while allowing both teams to validate the product.", points: ["Sign a mutual NDA before exchanging non-public workflows or recordings", "Use representative but approved test data", "Document which systems the agent may read or update", "Define who can approve knowledge, prompts, actions, and release"] }],
  },
  blog: {
    eyebrow: "Resources",
    title: "Peoplix blog",
    intro: "Ideas and practical guidance for modern HR operations, shared services, and enterprise automation.",
    sections: [{ heading: "Topics we cover", body: "The Peoplix blog focuses on the decisions behind dependable AI calling operations.", points: ["Designing voice agents that know when to answer and when to transfer", "Grounding responses in business knowledge and approved policies", "Connecting telephony, CRM, HRIS, ticketing, and calendar workflows", "Monitoring call quality, latency, cost, and compliance"] }, { heading: "A practical standard", body: "We care about useful automation: clear boundaries, observable actions, and a good caller experience when the AI reaches its limits." }],
  },
  about: {
    eyebrow: "Company",
    title: "About Peoplix",
    intro: "Peoplix builds intelligent AI agents that resolve enterprise service requests end-to-end.",
    sections: [{ heading: "Our focus", body: "Peoplix builds intelligent voice and chat agents for enterprise service operations.", points: ["Answer routine employee and customer questions", "Reason over policies and organization-specific knowledge", "Complete approved actions in connected business systems", "Escalate exceptions with context instead of starting the conversation over"] }, { heading: "Our product principle", body: "An agent should be useful beyond conversation. It should understand the request, follow the right conditions, take accountable action, and make the result visible." }],
  },
  leadership: {
    eyebrow: "Company",
    title: "Leadership",
    intro: "Peoplix is built by operators, product thinkers, and engineers focused on useful enterprise AI.",
    sections: [{ heading: "A practical point of view", body: "Our approach is grounded in secure integrations, clear accountability, and automation that improves work without removing human judgment where it matters.", points: ["AI should operate within explicit business conditions", "Every connected action needs authorization and an audit trail", "Human teams should receive context-rich escalations", "Quality should be measured on resolution, not only conversation"] }],
  },
  careers: {
    eyebrow: "Company",
    title: "Careers at Peoplix",
    intro: "Help build the next generation of enterprise service operations.",
    sections: [{ heading: "Work with us", body: "We are growing a team that cares about thoughtful product design, reliable systems, and responsible AI.", points: ["Voice experiences that feel clear, calm, and human", "Backend systems that protect tenant data and business actions", "Evaluation tooling for accuracy, latency, and escalation quality", "Products that help operations teams do more with confidence"] }, { heading: "What we value", body: "We favor direct communication, careful engineering, measurable outcomes, and a willingness to improve the details that callers notice." }],
  },
  contact: {
    eyebrow: "Company",
    title: "Contact Peoplix",
    intro: "Tell us what your team is trying to resolve and where automation could make the biggest difference.",
    sections: [{ heading: "Let us connect", body: "Tell us what your team is trying to resolve and where automation could make the biggest difference.", points: ["The type and volume of calls you receive", "Your current telephony and business systems", "The knowledge, policies, or workflows the agent must use", "The conditions that require identity checks or a human transfer"] }, { heading: "For implementation questions", body: "We can help you think through agent behavior, phone setup, knowledge ingestion, call recording, webhooks, and production monitoring." }, { heading: "Confidential discovery", body: "If the conversation requires internal policies, sample recordings, architecture details, or other non-public information, we can begin with a mutual NDA before that material is shared.", points: ["Identify authorized business and legal contacts", "Agree on permitted evaluation use", "Review retention and deletion expectations", "Move into security review and pilot scoping after approval"] }],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    intro: "Peoplix is committed to handling information responsibly and transparently.",
    sections: [{ heading: "Information handling", body: "Peoplix services may process caller information, transcripts, recordings, knowledge documents, and workflow results in order to provide the configured agent experience.", points: ["Collect only information needed for the requested workflow", "Use tenant boundaries and role-based access for company data", "Protect credentials and system connections on the backend", "Provide controls for retention, deletion, and authorized access"] }, { heading: "Production policy", body: "The final policy should be reviewed with your organization and published with the exact providers, retention periods, subprocessors, and rights that apply to your deployment." }],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    intro: "These terms describe the conditions for using Peoplix services.",
    sections: [{ heading: "Service use", body: "Peoplix provides configurable AI agents that answer calls, search approved information, and perform authorized workflows through connected services.", points: ["Customers are responsible for their prompts, policies, knowledge, and permissions", "Connected actions must be limited to approved business purposes", "Customers must provide lawful notice and consent where recording or monitoring is required", "AI output should be reviewed when a workflow has material legal, financial, or employment impact"] }, { heading: "Before production", body: "The final commercial terms, service levels, acceptable-use rules, payment terms, and support conditions should be reviewed and published before customer onboarding." }, { heading: "Agreement sequence", body: "A typical enterprise engagement may require multiple approvals before production access is granted.", points: ["Mutual NDA for confidential evaluation information", "Security and privacy review", "Data-processing, recording, and retention terms", "Pilot statement of work and acceptance criteria", "Production agreement, support terms, and launch approval"] }],
  },
  security: {
    eyebrow: "Legal",
    title: "Security and Compliance",
    intro: "Peoplix is designed around access control, traceability, and secure enterprise integrations.",
    sections: [{ heading: "Built for trust", body: "AI calling systems need controls around both conversation data and the actions an agent can take.", points: ["Role-based access and tenant-isolated company data", "Protected server-side credentials for Retell, Twilio, and business systems", "Signed webhooks and authenticated backend endpoints", "Audit logs for calls, workflow actions, and administrative changes", "Explicit escalation rules for uncertainty, sensitive requests, and policy exceptions"] }, { heading: "Deployment checklist", body: "Before launch, teams should confirm their public HTTPS backend, webhook signing secret, phone routing, recording policy, knowledge approvals, and human escalation path." }, { heading: "Review controls", body: "Security is a shared responsibility between Peoplix and the customer organization.", points: ["Sign the appropriate NDA and commercial agreement before confidential production planning", "Approve data sources, agent instructions, integrations, and allowed actions", "Test authentication, escalation, recording notices, and failure behavior", "Assign owners for incident response, access reviews, and knowledge updates"] }],
  },
};

export default function PublicInfoPage() {
  const { slug = "about" } = useParams();
  const page = pages[slug] || pages.about;

  return (
    <main className="min-h-screen bg-white px-5 py-28 text-gray-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">&larr; Back to Peoplix</Link>
        <p className="mt-16 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">{page.eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">{page.title}</h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-gray-600">{page.intro}</p>
        <div className="mt-16 grid gap-5 sm:grid-cols-2">
          {page.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-gray-200 bg-gray-50 p-7">
              <h2 className="text-xl font-bold">{section.heading}</h2>
              <p className="mt-3 leading-7 text-gray-600">{section.body}</p>
              {section.points && <ul className="mt-5 space-y-3 text-sm leading-6 text-gray-700">{section.points.map((point) => <li key={point} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />{point}</li>)}</ul>}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
