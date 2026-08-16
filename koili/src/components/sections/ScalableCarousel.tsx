import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize,
  Info,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

export type CarouselProduct = {
  id: string | number;
  name: string;
  image: string;
  discount?: string;
  price?: number;
  oldPrice?: number;
  onClick?: () => void;
};

export type CarouselVideo = {
  src: string;
  poster?: string;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
};

export type CarouselItem =
  | {
      id: string | number;
      type: "video";

      title: string;
      subtitle?: string;

      video: CarouselVideo;

      background?: string;

      sponsored?: boolean;

      onClick?: () => void;
    }
  | {
      id: string | number;
      type: "image";

      title: string;
      subtitle?: string;

      image: string;

      background?: string;

      badge?: string;

      onClick?: () => void;
    }
  | {
      id: string | number;
      type: "products";

      title: string;

      products: CarouselProduct[];

      background?: string;

      textColor?: string;

      badge?: string;

      onClick?: () => void;
    }
  | {
      id: string | number;
      type: "beauty";

      title: string;
      subtitle?: string;

      image: string;

      background?: string;

      badge?: string;

      onClick?: () => void;
    };

/* =========================================================
   PROPS
========================================================= */

export interface ScalableCarouselProps {
  items: CarouselItem[];

  /**
   * Taille des cards
   */
  cardWidth?: number | string;
  cardHeight?: number | string;

  /**
   * Espacement entre les cards
   */
  gap?: number;

  /**
   * Affichage
   */
  showArrows?: boolean;
  showDots?: boolean;

  /**
   * Navigation
   */
  scrollBehavior?: "smooth" | "auto";

  /**
   * Vidéo
   */
  pauseInactiveVideos?: boolean;

  /**
   * Autoplay du carousel
   */
  autoSlide?: boolean;
  autoSlideInterval?: number;

  /**
   * Style
   */
  rounded?: string;

  className?: string;
}

/* =========================================================
   HELPERS
========================================================= */

function sizeToStyle(
  value: number | string | undefined,
  fallback: string
) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
}

/* =========================================================
   BADGE (Sponsorisé, Bientôt, ...)
========================================================= */

function CardBadge({ label }: { label: string }) {
  return (
    <div
      className="
        absolute
        bottom-16
        right-4
        z-40
        flex
        items-center
        gap-1
        rounded-full
        bg-white/85
        px-3
        py-2
        text-xs
        font-medium
        text-black
        backdrop-blur
      "
    >
      {label}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ScalableCarousel({
  items,

  cardWidth = 380,
  cardHeight = 610,

  gap = 16,

  showArrows = true,
  showDots = true,

  scrollBehavior = "smooth",

  pauseInactiveVideos = true,

  autoSlide = false,
  autoSlideInterval = 5000,

  rounded = "16px",

  className = "",
}: ScalableCarouselProps) {
  const carouselRef =
    useRef<HTMLDivElement | null>(null);

  const videoRefs = useRef<
    Record<string, HTMLVideoElement | null>
  >({});

  const [activeIndex, setActiveIndex] =
    useState(0);

  /* =======================================================
     CARD SIZE
  ======================================================= */

  const width = sizeToStyle(
    cardWidth,
    "380px"
  );

  const height = sizeToStyle(
    cardHeight,
    "610px"
  );

  /* =======================================================
     CARD WIDTH
  ======================================================= */

  const getCardWidth = useCallback(() => {
    const container = carouselRef.current;

    if (!container) {
      return 0;
    }

    const card =
      container.firstElementChild as HTMLElement | null;

    if (!card) {
      return 0;
    }

    return (
      card.getBoundingClientRect().width +
      gap
    );
  }, [gap]);

  /* =======================================================
     PAUSE VIDEOS
  ======================================================= */

  const pauseVideos = useCallback(() => {
    Object.values(videoRefs.current).forEach(
      (video) => {
        if (!video) return;

        video.pause();
      }
    );
  }, []);

  /* =======================================================
     SCROLL
  ======================================================= */

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = carouselRef.current;

      if (!container) return;

      const cardWidth = getCardWidth();

      if (!cardWidth) return;

      if (pauseInactiveVideos) {
        pauseVideos();
      }

      container.scrollTo({
        left: index * cardWidth,
        behavior: scrollBehavior,
      });

      setActiveIndex(index);
    },
    [
      getCardWidth,
      pauseInactiveVideos,
      pauseVideos,
      scrollBehavior,
    ]
  );

  /* =======================================================
     NEXT
  ======================================================= */

  const next = useCallback(() => {
    if (!items.length) return;

    const nextIndex =
      activeIndex >= items.length - 1
        ? 0
        : activeIndex + 1;

    scrollToIndex(nextIndex);
  }, [
    activeIndex,
    items.length,
    scrollToIndex,
  ]);

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const previous = useCallback(() => {
    if (!items.length) return;

    const previousIndex =
      activeIndex <= 0
        ? items.length - 1
        : activeIndex - 1;

    scrollToIndex(previousIndex);
  }, [
    activeIndex,
    items.length,
    scrollToIndex,
  ]);

  /* =======================================================
     DETECT ACTIVE CARD
  ======================================================= */

  useEffect(() => {
    const container = carouselRef.current;

    if (!container) return;

    let timeout: ReturnType<
      typeof setTimeout
    >;

    const handleScroll = () => {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        const cardWidth = getCardWidth();

        if (!cardWidth) return;

        const index = Math.round(
          container.scrollLeft /
            cardWidth
        );

        const safeIndex = Math.max(
          0,
          Math.min(
            index,
            items.length - 1
          )
        );

        setActiveIndex(safeIndex);

        if (pauseInactiveVideos) {
          Object.entries(
            videoRefs.current
          ).forEach(([id, video]) => {
            if (!video) return;

            const activeItem =
              items[safeIndex];

            if (
              String(activeItem?.id) !==
              String(id)
            ) {
              video.pause();
            }
          });
        }
      }, 60);
    };

    container.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    return () => {
      clearTimeout(timeout);

      container.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [
    getCardWidth,
    items,
    pauseInactiveVideos,
  ]);

  /* =======================================================
     AUTOSLIDE
  ======================================================= */

  useEffect(() => {
    if (!autoSlide) return;

    if (items.length <= 1) return;

    const interval = window.setInterval(
      () => {
        next();
      },
      autoSlideInterval
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    autoSlide,
    autoSlideInterval,
    items.length,
    next,
  ]);

  /* =======================================================
     KEYBOARD
  ======================================================= */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "ArrowRight"
      ) {
        next();
      }

      if (
        event.key === "ArrowLeft"
      ) {
        previous();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [next, previous]);

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!items.length) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className={`
        relative
        w-full
        overflow-hidden
        ${className}
      `}
    >
      {/* =================================================
          CAROUSEL
      ================================================= */}

      <div
        ref={carouselRef}
        className="
          flex
          overflow-x-auto
          snap-x
          snap-mandatory
          scroll-smooth
          overscroll-x-contain
          scrollbar-none
        "
        style={{
          gap: `${gap}px`,
          scrollBehavior,
          paddingLeft: `${gap}px`,
          paddingRight: `${gap}px`,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="
              shrink-0
              snap-start
            "
            style={{
              width,
              height,
            }}
          >
            {item.type === "video" && (
              <VideoCard
                item={item}
                height={height}
                rounded={rounded}
                registerVideo={(video) => {
                  videoRefs.current[
                    String(item.id)
                  ] = video;
                }}
              />
            )}

            {item.type === "image" && (
              <ImageCard
                item={item}
                rounded={rounded}
              />
            )}

            {item.type === "products" && (
              <ProductsCard
                item={item}
                rounded={rounded}
              />
            )}

            {item.type === "beauty" && (
              <BeautyCard
                item={item}
                rounded={rounded}
              />
            )}
          </div>
        ))}
      </div>

      {/* =================================================
          ARROWS
      ================================================= */}

      {showArrows && items.length > 1 && (
        <>
          {/* PREVIOUS */}

          <button
            type="button"
            onClick={previous}
            aria-label="Précédent"
            className="
              absolute
              left-5
              top-1/2
              z-50
              hidden
              h-12
              w-12
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              shadow-xl
              transition
              hover:scale-105
              lg:flex
            "
          >
            <ChevronLeft size={25} />
          </button>

          {/* NEXT */}

          <button
            type="button"
            onClick={next}
            aria-label="Suivant"
            className="
              absolute
              right-5
              top-1/2
              z-50
              hidden
              h-12
              w-12
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              shadow-xl
              transition
              hover:scale-105
              lg:flex
            "
          >
            <ChevronRight size={25} />
          </button>
        </>
      )}

      {/* =================================================
          DOTS
      ================================================= */}

      {showDots && items.length > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                scrollToIndex(index)
              }
              aria-label={`Carte ${index + 1}`}
              className={`
                h-1.5
                rounded-full
                transition-all
                duration-300
                ${
                  index === activeIndex
                    ? "w-7 bg-black"
                    : "w-1.5 bg-gray-300"
                }
              `}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   VIDEO CARD
========================================================= */

function VideoCard({
  item,
  rounded,
  registerVideo,
}: {
  item: Extract<
    CarouselItem,
    { type: "video" }
  >;

  height: string;

  rounded: string;

  registerVideo: (
    video: HTMLVideoElement | null
  ) => void;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const [playing, setPlaying] =
    useState(
      Boolean(item.video.autoPlay)
    );

  const [muted, setMuted] =
    useState(
      item.video.muted ?? true
    );

  const [progress, setProgress] =
    useState(0);

  /* =======================================================
     REGISTER VIDEO
  ======================================================= */

  const setVideoRef = (
    video: HTMLVideoElement | null
  ) => {
    videoRef.current = video;

    registerVideo(video);
  };

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const togglePlay = async (
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();

    const video =
      videoRef.current;

    if (!video) return;

    try {
      if (video.paused) {
        await video.play();

        setPlaying(true);
      } else {
        video.pause();

        setPlaying(false);
      }
    } catch (error) {
      console.error(
        "Erreur vidéo :",
        error
      );
    }
  };

  /* =======================================================
     MUTE
  ======================================================= */

  const toggleMute = (
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    const video =
      videoRef.current;

    if (!video) return;

    video.muted = !video.muted;

    setMuted(video.muted);
  };

  /* =======================================================
     RESTART
  ======================================================= */

  const restart = (
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    const video =
      videoRef.current;

    if (!video) return;

    video.currentTime = 0;

    video
      .play()
      .catch(() => {});

    setPlaying(true);
  };

  /* =======================================================
     FULLSCREEN
  ======================================================= */

  const fullscreen = (
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    const video =
      videoRef.current;

    if (!video) return;

    if (
      video.requestFullscreen
    ) {
      video.requestFullscreen();
    }
  };

  /* =======================================================
     TIME UPDATE
  ======================================================= */

  const updateProgress = () => {
    const video =
      videoRef.current;

    if (
      !video ||
      !video.duration
    ) {
      return;
    }

    setProgress(
      (video.currentTime /
        video.duration) *
        100
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <article
      className="
        group
        relative
        h-full
        w-full
        overflow-hidden
        bg-black
        shadow-lg
      "
      style={{
        borderRadius: rounded,
        backgroundColor:
          item.background,
      }}
    >
      {/* VIDEO */}

      <video
        ref={setVideoRef}
        src={item.video.src}
        poster={item.video.poster}
        muted={muted}
        playsInline
        preload="metadata"
        loop={
          item.video.loop ?? true
        }
        className="
          absolute
          inset-0
          h-full
          w-full
          cursor-pointer
          object-cover
        "
        onClick={togglePlay}
        onPlay={() =>
          setPlaying(true)
        }
        onPause={() =>
          setPlaying(false)
        }
        onTimeUpdate={
          updateProgress
        }
      />

      {/* TEXT */}

      <div
        className="
          pointer-events-none
          absolute
          left-5
          right-5
          top-5
          z-20
        "
      >
        <h2
          className="
            max-w-[330px]
            text-[40px]
            font-black
            leading-[0.95]
            tracking-[-1.7px]
            text-white
          "
        >
          {item.title}
        </h2>

        {item.subtitle && (
          <p
            className="
              mt-4
              text-xl
              font-medium
              text-white
            "
          >
            {item.subtitle}
          </p>
        )}
      </div>

      {/* PLAY */}

      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="
            absolute
            left-1/2
            top-1/2
            z-30
            flex
            h-20
            w-20
            -translate-x-1/2
            -translate-y-1/2
            items-center
            justify-center
            rounded-full
            bg-white
            text-black
            shadow-2xl
            transition
            hover:scale-110
            active:scale-95
          "
          aria-label="Lire"
        >
          <Play
            size={32}
            fill="currentColor"
            className="ml-1"
          />
        </button>
      )}

      {/* CONTROLS */}

      <div
        className="
          absolute
          bottom-4
          left-4
          right-4
          z-40
          flex
          items-center
          justify-between
        "
      >
        <div className="flex gap-2">
          {/* PLAY */}

          <button
            type="button"
            onClick={togglePlay}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-black/75
              text-white
              backdrop-blur
            "
          >
            {playing ? (
              <Pause
                size={18}
                fill="currentColor"
              />
            ) : (
              <Play
                size={18}
                fill="currentColor"
              />
            )}
          </button>

          {/* RESTART */}

          <button
            type="button"
            onClick={restart}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-black/75
              text-white
              backdrop-blur
            "
          >
            <RotateCcw size={18} />
          </button>

          {/* SOUND */}

          <button
            type="button"
            onClick={toggleMute}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-black/75
              text-white
              backdrop-blur
            "
          >
            {muted ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
        </div>

        {/* FULLSCREEN */}

        <button
          type="button"
          onClick={fullscreen}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-black/75
            text-white
            backdrop-blur
          "
        >
          <Maximize size={18} />
        </button>
      </div>

      {/* SPONSORED */}

      {item.sponsored && (
        <div
          className="
            absolute
            bottom-16
            right-4
            z-40
            flex
            items-center
            gap-1
            rounded-full
            bg-white/85
            px-3
            py-2
            text-xs
            font-medium
            text-black
            backdrop-blur
          "
        >
          Sponsorisé
          <Info size={13} />
        </div>
      )}

      {/* PROGRESS */}

      <div
        className="
          absolute
          bottom-0
          left-0
          right-0
          z-50
          h-1
          bg-white/20
        "
      >
        <div
          className="
            h-full
            bg-white
          "
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </article>
  );
}

/* =========================================================
   IMAGE CARD
========================================================= */

function ImageCard({
  item,
  rounded,
}: {
  item: Extract<
    CarouselItem,
    { type: "image" }
  >;

  rounded: string;
}) {
  return (
    <article
      onClick={item.onClick}
      className="
        group
        relative
        h-full
        w-full
        cursor-pointer
        overflow-hidden
        bg-black
        shadow-lg
      "
      style={{
        borderRadius: rounded,
        backgroundColor:
          item.background,
      }}
    >
      {/* IMAGE */}

      <img
        src={item.image}
        alt={item.title}
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover
          transition-transform
          duration-700
          group-hover:scale-105
        "
      />

      {/* TEXT */}

      <div
        className="
          absolute
          left-5
          right-5
          top-5
          z-10
        "
      >
        <h2
          className="
            text-[40px]
            font-black
            leading-[0.95]
            tracking-[-1.7px]
            text-white
          "
        >
          {item.title}
        </h2>

        {item.subtitle && (
          <p className="mt-4 text-xl text-white">
            {item.subtitle}
          </p>
        )}
      </div>

      {item.badge && <CardBadge label={item.badge} />}
    </article>
  );
}

/* =========================================================
   PRODUCTS CARD
========================================================= */

function ProductsCard({
  item,
  rounded,
}: {
  item: Extract<
    CarouselItem,
    { type: "products" }
  >;

  rounded: string;
}) {
  return (
    <article
      className="
        relative
        h-full
        w-full
        overflow-hidden
        p-4
        shadow-lg
      "
      style={{
        borderRadius: rounded,
        backgroundColor:
          item.background ??
          "#087d3e",
      }}
    >
      {/* TITLE */}

      <h2
        className={`
          px-1
          text-[40px]
          font-black
          leading-[0.95]
          tracking-[-1.7px]
          ${
            item.textColor ??
            "text-white"
          }
        `}
      >
        {item.title}
      </h2>

      {/* PRODUCTS */}

      <div
        className="
          mt-5
          grid
          grid-cols-2
          gap-2.5
        "
      >
        {item.products.map(
          (product) => (
            <button
              key={product.id}
              type="button"
              onClick={
                product.onClick
              }
              className="
                group
                relative
                h-[calc((100%)-100px)]
                min-h-[180px]
                overflow-hidden
                rounded-lg
                bg-white
                text-left
              "
            >
              {/* IMAGE */}

              <img
                src={product.image}
                alt={product.name}
                className="
                  h-full
                  w-full
                  object-cover
                  transition-transform
                  duration-500
                  group-hover:scale-105
                "
              />

              {/* DISCOUNT */}

              {product.discount && (
                <span
                  className="
                    absolute
                    bottom-2
                    left-2
                    rounded
                    bg-[#d9003f]
                    px-2
                    py-1.5
                    text-sm
                    font-bold
                    text-white
                  "
                >
                  {product.discount}
                </span>
              )}
            </button>
          )
        )}
      </div>

      {item.badge && <CardBadge label={item.badge} />}
    </article>
  );
}

/* =========================================================
   BEAUTY CARD
========================================================= */

function BeautyCard({
  item,
  rounded,
}: {
  item: Extract<
    CarouselItem,
    { type: "beauty" }
  >;

  rounded: string;
}) {
  return (
    <article
      onClick={item.onClick}
      className="
        group
        relative
        h-full
        w-full
        cursor-pointer
        overflow-hidden
        shadow-lg
      "
      style={{
        borderRadius: rounded,
        backgroundColor:
          item.background ??
          "#ff6200",
      }}
    >
      {/* TITLE */}

      <div
        className="
          relative
          z-20
          p-5
        "
      >
        <h2
          className="
            max-w-[330px]
            text-[40px]
            font-black
            leading-[0.95]
            tracking-[-1.7px]
            text-white
          "
        >
          {item.title}
        </h2>

        {item.subtitle && (
          <p
            className="
              mt-4
              max-w-[300px]
              text-xl
              font-medium
              leading-tight
              text-white
            "
          >
            {item.subtitle}
          </p>
        )}
      </div>

      {/* IMAGE */}

      <img
        src={item.image}
        alt={item.title}
        className="
          absolute
          bottom-0
          left-0
          h-[72%]
          w-full
          object-cover
          transition-transform
          duration-700
          group-hover:scale-105
        "
      />

      {item.badge && <CardBadge label={item.badge} />}
    </article>
  );
}