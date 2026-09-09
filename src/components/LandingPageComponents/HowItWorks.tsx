import { GoDotFill } from "react-icons/go";
import {
  FiMic,
  FiCpu,
  FiFileText,
  FiRefreshCw,
  FiDatabase,
} from "react-icons/fi";
import AccordionGallery from "../AccordionGallery";

const cards = [
  {
    title: "Voice",
    icon: FiMic,
    content:
      "Employees initiate requests through secure voice or chat interactions — natural, conversational, and authenticated.",
  },
  {
    title: "AI Reasoning",
    icon: FiCpu,
    content:
      "The agent interprets intent, understands context, and determines the appropriate course of action using enterprise-trained intelligence.",
  },
  {
    title: "Policy Engine",
    icon: FiFileText,
    content:
      "HR policies are dynamically applied, evaluated, and validated to ensure compliance and accurate decision-making.",
  },
  {
    title: "Transaction Engine",
    icon: FiRefreshCw,
    content:
      "The agent executes real system actions — creating, updating, or resolving records in real time.",
  },
  {
    title: "HRIS (Workday)",
    icon: FiDatabase,
    content:
      "Transactions are completed directly inside enterprise platforms like Workday, with full auditability and confirmation.",
  },
];

const HowItWorks = () => {
  const galleryItems = cards.map((card) => ({
    label: card.title,
    content: (
      <div className="flex h-full flex-col">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <card.icon className="h-7 w-7 text-gray-950" />
        </div>
        <h3 className="mb-4 text-2xl font-bold text-gray-950">{card.title}</h3>
        <p className="leading-relaxed text-gray-600">{card.content}</p>
      </div>
    ),
  }));

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 mb-6">
            <GoDotFill className="text-primary animate-pulse" />
            <span className="text-sm font-semibold text-gray-900 tracking-wide">
              How It Works
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Build for Enterprise Operations
          </h2>
        </div>

        {/* Five-card accordion gallery */}
        <div className="overflow-visible">
          <AccordionGallery
            items={galleryItems}
            defaultIndex={2}
            expandRatio={0.52}
            trigger="click"
            autoplay={true}
            autoplayDelay={5000}
            duration={1.6}
            ease="power2.inOut"
            tilt={8}
            stagger={0.06}
            height={360}
            gap={10}
            radius={16}
          />
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
