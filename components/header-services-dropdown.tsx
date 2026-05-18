"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function useCloseOnOutsideClick(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return ref;
}

type ServiceItem = {
  id: string;
  title: string;
  description: string;
  accent: string;
  illustration: ReactNode;
};

function ServiceIllustration({
  accent,
  children,
}: {
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="relative h-24 overflow-hidden rounded-[16px] border border-white/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8f9ff_55%,#eef2ff_100%)]">
      <div
        className="absolute -left-5 top-4 h-16 w-16 rounded-full opacity-80 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute bottom-2 right-2 h-20 w-20 rounded-full opacity-50 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex h-full items-center justify-center">{children}</div>
    </div>
  );
}

function BuyForMeArtwork() {
  return (
    <ServiceIllustration accent="#615FFF">
      <div className="relative h-16 w-20">
        <div className="absolute left-1 top-6 h-8 w-12 rounded-2xl bg-[#615FFF]" />
        <div className="absolute left-8 top-3 h-9 w-10 rounded-[18px] bg-[#96A0FF]" />
        <div className="absolute right-0 top-7 h-6 w-8 rounded-[14px] bg-[#FFD86B]" />
        <div className="absolute left-3 top-8 h-1.5 w-8 rounded-full bg-white/80" />
      </div>
    </ServiceIllustration>
  );
}

function ShipForMeArtwork() {
  return (
    <ServiceIllustration accent="#10B981">
      <div className="relative h-16 w-20">
        <div className="absolute left-0 top-7 h-8 w-11 rounded-[18px] bg-[#10B981]" />
        <div className="absolute left-8 top-9 h-6 w-10 rounded-[16px] bg-[#A7F3D0]" />
        <div className="absolute left-3 top-2 h-4 w-12 rounded-full bg-[#D1FAE5]" />
        <div className="absolute left-4 top-10 h-3 w-3 rounded-full bg-slate-900/80" />
        <div className="absolute right-2 top-10 h-3 w-3 rounded-full bg-slate-900/80" />
      </div>
    </ServiceIllustration>
  );
}

function CostCalculatorArtwork() {
  return (
    <ServiceIllustration accent="#F97316">
      <div className="relative h-16 w-20">
        <div className="absolute left-4 top-1 h-14 w-12 rounded-[18px] bg-[#FFF7ED] shadow-[0_10px_30px_rgba(249,115,22,0.18)]" />
        <div className="absolute left-7 top-4 h-3 w-6 rounded-full bg-[#FDBA74]" />
        <div className="absolute left-7 top-9 grid grid-cols-2 gap-1">
          <span className="h-2.5 w-2.5 rounded-md bg-[#FB923C]" />
          <span className="h-2.5 w-2.5 rounded-md bg-[#FED7AA]" />
          <span className="h-2.5 w-2.5 rounded-md bg-[#FED7AA]" />
          <span className="h-2.5 w-2.5 rounded-md bg-[#FB923C]" />
        </div>
      </div>
    </ServiceIllustration>
  );
}

function QuotationArtwork() {
  return (
    <ServiceIllustration accent="#EC4899">
      <div className="relative h-16 w-20">
        <div className="absolute left-6 top-3 h-11 w-10 rounded-[18px] bg-white shadow-[0_12px_28px_rgba(236,72,153,0.18)]" />
        <div className="absolute left-8 top-7 h-1.5 w-6 rounded-full bg-[#F9A8D4]" />
        <div className="absolute left-8 top-11 h-1.5 w-5 rounded-full bg-[#FBCFE8]" />
        <div className="absolute left-2 top-8 h-8 w-8 rounded-full bg-[#EC4899] text-center text-lg font-semibold leading-8 text-white">
          ?
        </div>
      </div>
    </ServiceIllustration>
  );
}

const services: ServiceItem[] = [
  {
    id: "buy-for-me",
    title: "Buy for me",
    description: "We will help source, verify, and purchase on your behalf.",
    accent: "#615FFF",
    illustration: <BuyForMeArtwork />,
  },
  {
    id: "ship-for-me",
    title: "Ship for me",
    description: "Consolidated shipping support from supplier pickup to delivery.",
    accent: "#10B981",
    illustration: <ShipForMeArtwork />,
  },
  {
    id: "cost-calculator",
    title: "Cost Calculator",
    description: "Estimate product, freight, customs, and local delivery costs.",
    accent: "#F97316",
    illustration: <CostCalculatorArtwork />,
  },
  {
    id: "request-for-quotation",
    title: "Request for quotation",
    description: "Send a buying brief and receive tailored supplier pricing.",
    accent: "#EC4899",
    illustration: <QuotationArtwork />,
  },
];

export default function HeaderServicesDropdown({
  triggerChevron,
}: {
  triggerChevron: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useCloseOnOutsideClick(isOpen, () => setIsOpen(false));

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-[#615FFF] transition-colors hover:text-[#5552e6] lg:ml-1"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>Services</span>
        {triggerChevron}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-4 w-[min(92vw,760px)] rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
          <div className="mb-3 border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                Our Services
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                More sourcing tools are on the way
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="group rounded-[16px] border border-slate-200 bg-white p-3.5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
              >
                {service.illustration}

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[15px] font-semibold text-slate-900">{service.title}</h4>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{service.description}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${service.accent}18`,
                      color: service.accent,
                    }}
                  >
                    Coming soon
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
