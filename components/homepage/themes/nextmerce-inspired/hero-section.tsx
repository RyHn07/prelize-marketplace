import type { HomepageContentBlockRow } from "@/types/product-db";

type HeroSideCard = {
  image_url: string | null;
  title: string;
  highlight: string;
  link_url: string | null;
};

type HeroSlide = {
  image_url: string | null;
  top_title: string;
  title: string;
  description: string;
  cta_text: string;
  cta_link: string | null;
};

const LEGACY_HERO_EYEBROW = "Prelize Marketplace";
const LEGACY_HERO_TITLE = "Source wholesale products from China with more confidence";
const LEGACY_HERO_DESCRIPTION =
  "Compare suppliers, plan MOQ-friendly orders, and move products toward Bangladesh with a cleaner sourcing workflow.";
const LEGACY_HERO_BUTTON_TEXT = "Explore Products";

function readHeroData(content: HomepageContentBlockRow | undefined) {
  if (!content?.data_json || typeof content.data_json !== "object" || Array.isArray(content.data_json)) {
    return {};
  }

  return content.data_json as Record<string, unknown>;
}

function isMeaningfulText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function readHeroEyebrow(content: HomepageContentBlockRow | undefined) {
  const source = readHeroData(content);
  const value =
    typeof source.eyebrow === "string"
      ? source.eyebrow
      : isMeaningfulText(content?.subtitle)
        ? content?.subtitle
        : null;

  if (value?.trim() === LEGACY_HERO_EYEBROW) {
    return "SPECIAL EDITION";
  }

  return value ?? "SPECIAL EDITION";
}

function readHeroSlides(content: HomepageContentBlockRow | undefined) {
  const source = readHeroData(content);
  const slides = source.slides;
  const activeSlide = typeof source.active_slide === "number" && source.active_slide > 0 ? Math.trunc(source.active_slide) : 1;
  const fallback: HeroSlide = {
    image_url: typeof content?.image_url === "string" ? content.image_url : null,
    top_title: readHeroEyebrow(content),
    title: typeof content?.title === "string" && content.title.trim().length > 0 ? content.title : "Apple AirPods\nMax",
    description: readHeroDescription(content),
    cta_text: typeof content?.button_text === "string" && content.button_text.trim().length > 0 ? content.button_text : "Shop Now",
    cta_link: content?.button_link ?? "/products",
  };

  if (!Array.isArray(slides)) {
    return {
      activeSlide,
      current: fallback,
    };
  }

  const normalizedSlides = slides.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const record = entry as Record<string, unknown>;

    return [
      {
        image_url: typeof record.image_url === "string" ? record.image_url : fallback.image_url,
        top_title: typeof record.top_title === "string" ? record.top_title : fallback.top_title,
        title:
          typeof record.title === "string" && record.title.trim() !== LEGACY_HERO_TITLE
            ? record.title
            : fallback.title,
        description:
          typeof record.description === "string" && record.description.trim() !== LEGACY_HERO_DESCRIPTION
            ? record.description
            : fallback.description,
        cta_text:
          typeof record.cta_text === "string" && record.cta_text.trim() !== LEGACY_HERO_BUTTON_TEXT
            ? record.cta_text
            : fallback.cta_text,
        cta_link: typeof record.cta_link === "string" ? record.cta_link : fallback.cta_link,
      } satisfies HeroSlide,
    ];
  });

  return {
    activeSlide,
    current: normalizedSlides[Math.max(0, Math.min(activeSlide - 1, normalizedSlides.length - 1))] ?? fallback,
  };
}

function readHeroTitle(content: HomepageContentBlockRow | undefined) {
  const source = readHeroData(content);
  const value =
    typeof source.hero_title === "string"
      ? source.hero_title
      : isMeaningfulText(content?.title)
        ? content?.title
        : null;

  if (value?.trim() === LEGACY_HERO_TITLE) {
    return "Apple AirPods\nMax";
  }

  return value ?? "Apple AirPods\nMax";
}

function readHeroDescription(content: HomepageContentBlockRow | undefined) {
  const source = readHeroData(content);
  const value =
    typeof source.hero_description === "string"
      ? source.hero_description
      : isMeaningfulText(content?.description)
        ? content?.description
        : null;

  if (value?.trim() === LEGACY_HERO_DESCRIPTION) {
    return "Transparency mode and spatial audio, it delivers a premium listening experience.";
  }

  return value ?? "Transparency mode and spatial audio, it delivers a premium listening experience.";
}

function readSideCards(content: HomepageContentBlockRow | undefined) {
  const source = readHeroData(content);
  const cards = source.side_cards;
  const defaults: HeroSideCard[] = [
    {
      image_url: null,
      title: "Smart Security Home Camera",
      highlight: "$450",
      link_url: "/products",
    },
    {
      image_url: null,
      title: "Smart Security Home Camera",
      highlight: "$450",
      link_url: "/products",
    },
  ];

  if (!Array.isArray(cards)) {
    return defaults;
  }

  return defaults.map((fallback, index) => {
    const entry = cards[index];

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return fallback;
    }

    const record = entry as Record<string, unknown>;

    return {
      image_url: typeof record.image_url === "string" ? record.image_url : fallback.image_url,
      title: typeof record.title === "string" ? record.title : fallback.title,
      highlight: typeof record.highlight === "string" ? record.highlight : fallback.highlight,
      link_url: typeof record.link_url === "string" ? record.link_url : fallback.link_url,
    } satisfies HeroSideCard;
  });
}

export default function HeroSection({ content }: { content?: HomepageContentBlockRow }) {
  const slideState = readHeroSlides(content);
  const eyebrow = slideState.current.top_title;
  const heroTitle = slideState.current.title;
  const heroDescription = slideState.current.description;
  const heroImageUrl = slideState.current.image_url;
  const sideCards = readSideCards(content);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="grid items-start gap-2 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
          <article
            className="relative overflow-hidden rounded-[14px] bg-[#071d2c] text-white lg:rounded-[16px]"
            style={
              heroImageUrl
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(7,29,44,0.96) 0%, rgba(7,29,44,0.82) 34%, rgba(7,29,44,0.34) 68%, rgba(7,29,44,0.18) 100%), url("${heroImageUrl}")`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                  }
                : undefined
            }
          >
            <div className="flex min-h-[214px] items-center px-4 py-8 sm:min-h-[320px] sm:px-8 sm:py-10 lg:min-h-[534px] lg:px-[84px] lg:py-[84px]">
              <div className="flex max-w-[400px] flex-col justify-center">
                <p className="text-[13px] font-semibold uppercase leading-none tracking-[-0.02em] text-white/95 sm:text-[16px]">
                  {eyebrow}
                </p>
                <h1 className="mt-3 whitespace-pre-line text-[25px] font-semibold leading-[1.18] tracking-[-0.03em] text-white sm:mt-6 sm:text-[34px] lg:text-[40px]">
                  {heroTitle}
                </h1>
                <p className="mt-3 max-w-[290px] text-[12px] leading-[1.7] text-white/88 sm:mt-4 sm:max-w-[332px] sm:text-[14px]">
                  {heroDescription}
                </p>
                <div className="mt-6 sm:mt-8 lg:mt-10">
                  <a
                    href={slideState.current.cta_link ?? "/products"}
                    className="inline-flex h-[40px] min-w-[80px] items-center justify-center rounded-full bg-[#5561f5] px-5 text-[12px] font-semibold text-white shadow-[0_14px_28px_rgba(85,97,245,0.28)] transition-transform hover:-translate-y-0.5 sm:h-[46px] sm:min-w-[100px] sm:px-6 sm:text-[14px] lg:h-[49px] lg:min-w-[103px]"
                  >
                    {slideState.current.cta_text}
                  </a>
                </div>
              </div>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-1 lg:gap-6">
            {sideCards.map((card, index) => {
              const body = (
                <article
                  className="grid min-h-[128px] grid-cols-2 items-stretch gap-3 rounded-[14px] p-3.5 lg:min-h-[255px] lg:gap-6 lg:rounded-[16px] lg:p-6"
                  style={{ backgroundColor: index === 0 ? "#D7EBF2" : "#F3EFE4" }}
                >
                  <div className="flex flex-col">
                    <h2 className="max-w-[84px] text-[10px] font-semibold leading-[1.4] tracking-[-0.03em] text-[#0c0c0d] sm:max-w-[120px] sm:text-[16px] lg:max-w-none lg:text-[22px]">
                      {card.title}
                    </h2>
                    <p className="mt-auto pt-3 text-[9px] text-[#0c0c0d] sm:text-[12px] lg:text-[16px]">
                      Save up to{" "}
                      <span className="font-semibold text-[#5c57ff]">
                        {card.highlight}
                      </span>
                    </p>
                  </div>

                  <div className="h-full min-h-[98px] overflow-hidden rounded-[10px] bg-transparent lg:min-h-[115px] lg:rounded-[12px]">
                    {card.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image_url}
                        alt={card.title}
                        className="h-full w-full object-contain object-center"
                      />
                    ) : null}
                  </div>
                </article>
              );

              return card.link_url ? (
                <a
                  key={`${card.title}-${index}`}
                  href={card.link_url}
                  className="block transition-transform hover:-translate-y-0.5"
                >
                  {body}
                </a>
              ) : (
                <div key={`${card.title}-${index}`}>{body}</div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
