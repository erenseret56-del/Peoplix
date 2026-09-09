import { useState } from "react";
import { GoDotFill } from "react-icons/go";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How is Peoplix different from a chatbot?",
    answer:
      "Traditional chatbots deflect questions. Peoplix resolves work. Our autonomous AI agents understand intent, apply HR policy, execute real transactions in systems like Workday, and close requests end-to-end — without creating tickets.",
  },
  {
    question: "Does Peoplix integrate with Workday?",
    answer:
      "Yes. Peoplix integrates directly with Workday and other enterprise systems through secure APIs, enabling real-time data retrieval and transaction execution — not just surface-level responses.",
  },
  {
    question: "What types of HR requests can Peoplix automate?",
    answer:
      "Peoplix automates Tier 1 and Tier 2 HR operations including profile updates, payroll inquiries, PTO balance checks, benefits eligibility, policy interpretation, and workflow-triggered transactions. Complex or exception-based cases are intelligently escalated when required.",
  },
  {
    question: "Is Peoplix secure and compliant?",
    answer:
      "Peoplix is built with enterprise-grade security architecture, including role-based access control, encrypted data handling, full audit trails, and SOC2-ready infrastructure. Every action is logged and traceable.",
  },
  {
    question: "How does Peoplix handle policy changes?",
    answer:
      "HR policies can be configured and updated within the platform. The policy reasoning engine dynamically applies the latest rules to every request, ensuring consistent and compliant outcomes.",
  },
  {
    question: "What happens if the AI cannot resolve a request?",
    answer:
      "If a request requires human review or falls outside defined policy boundaries, Peoplix automatically escalates it to the appropriate HR team with full context, reducing handling time and preserving SLA commitments.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Implementation timelines vary by integration scope and enterprise complexity, but most organizations can deploy initial use cases within weeks — not months.",
  },
  {
    question: "Who is Peoplix built for?",
    answer:
      "Peoplix is designed for CHROs, HR Operations leaders, Shared Services teams, and CIOs seeking measurable automation, cost reduction, and improved employee experience.",
  },
];

interface AccordionItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

const AccordionItem = ({
  item,
  isOpen,
  onToggle,
  index,
}: AccordionItemProps) => {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-7 py-5 text-left group hover:bg-gray-50"
        aria-expanded={isOpen}
      >
        <span className="text-base font-semibold text-gray-900 leading-snug pr-6 group-hover:text-primary transition-colors">
          {item.question}
        </span>

        {/* Toggle button */}
        <div
          className={`
            shrink-0 w-9 h-9 rounded-full flex items-center justify-center
            transition-all duration-300 ease-out
            bg-primary text-white hover:scale-110 cursor-pointer
          `}
        >
          <svg
            className={`transition-transform duration-300 ease-out ${isOpen ? "rotate-45" : "rotate-0"}`}
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <line
              x1="7"
              y1="1"
              x2="7"
              y2="13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="1"
              y1="7"
              x2="13"
              y2="7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </button>

      {/* Animated answer panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isOpen ? "400px" : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <p className="px-7 pb-6 text-[14px] text-gray-600 leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  );
};

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(1);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-14 flex flex-col items-center justify-center text-center">
            <div className="mb-10 flex max-w-[110px] items-center justify-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
              <GoDotFill className="mt-[2px] text-cyan-600" />
              <span className="text-sm font-semibold text-gray-900">
                FAQ's
              </span>
            </div>
            <h2 className="text-[52px] font-semibold leading-tight tracking-tighter text-gray-950">
              Frequently Asked
              <br />
              Questions
            </h2>
          </div>

          {/* Accordion */}
          <div className="flex flex-col gap-3">
            {faqs.map((item, index) => (
              <AccordionItem
                key={index}
                item={item}
                isOpen={openIndex === index}
                onToggle={() => toggle(index)}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQSection;
