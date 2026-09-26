import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X
} from "lucide-react";


/**
 * ---------------------------------------------------------
 * CONFIGURATION
 * ---------------------------------------------------------
 *
 * Change cette version lorsque tu veux refaire apparaître
 * le popup pour tous les utilisateurs.
 *
 * Exemple :
 *
 * v1 -> première annonce
 * v2 -> nouvelle annonce
 * v3 -> nouvelle fonctionnalité
 */
const AI_BETA_VERSION = "v3";

const STORAGE_KEY = `skignas_ai_beta_popup_${AI_BETA_VERSION}`;

/**
 * ---------------------------------------------------------
 * HOOK LOCAL STORAGE
 * ---------------------------------------------------------
 */
function useSkignasAIBetaPopup() {
  const [shouldShow, setShouldShow] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const alreadySeen = localStorage.getItem(STORAGE_KEY);

      if (!alreadySeen) {
        setShouldShow(true);
      }
    } catch (error) {
      console.error(
        "Impossible d'accéder au localStorage:",
        error
      );
    }

    setInitialized(true);
  }, []);

  const markAsSeen = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          seen: true,
          version: AI_BETA_VERSION,
          date: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error(
        "Impossible d'enregistrer le popup:",
        error
      );
    }

    setShouldShow(false);
  };

  return {
    shouldShow,
    initialized,
    markAsSeen,
  };
}

/**
 * ---------------------------------------------------------
 * POPUP
 * ---------------------------------------------------------
 */
export default function SkignasAIBetaPopup() {
  const {
    shouldShow,
    initialized,
    markAsSeen,
  } = useSkignasAIBetaPopup();

  /**
   * Empêche le flash du popup avant que localStorage
   * soit vérifié.
   */
  if (!initialized) {
    return null;
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            p-4
          "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* ------------------------------------------------
              BACKDROP
          ------------------------------------------------ */}
          <motion.div
            className="
              absolute
              inset-0
              bg-slate-950/45
              backdrop-blur-md
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={markAsSeen}
          />

          {/* ------------------------------------------------
              POPUP
          ------------------------------------------------ */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.86,
              y: 40,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.92,
              y: 20,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
            className="
              relative
              z-10
              w-full
              max-w-[920px]
              overflow-hidden
              bg-white
              shadow-[0_35px_100px_rgba(15,23,42,0.25)]
            "
          >
            {/* ------------------------------------------------
                BACKGROUND ANIMATION
            ------------------------------------------------ */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">

              <motion.div
                className="
                  absolute
                  -left-24
                  -top-28
                  h-72
                  w-72
                  rounded-full
                  bg-violet-300/30
                  blur-3xl
                "
                animate={{
                  x: [0, 45, 0],
                  y: [0, 30, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <motion.div
                className="
                  absolute
                  -right-24
                  top-20
                  h-72
                  w-72
                  rounded-full
                  bg-blue-300/25
                  blur-3xl
                "
                animate={{
                  x: [0, -40, 0],
                  y: [0, 45, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <div
                className="
                  absolute
                  inset-0
                  bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.08),transparent_45%)]
                "
              />
            </div>

            {/* ------------------------------------------------
                CLOSE
            ------------------------------------------------ */}
            <motion.button
              whileHover={{
                scale: 1.08,
                rotate: 5,
              }}
              whileTap={{
                scale: 0.9,
              }}
              onClick={markAsSeen}
              className="
                absolute
                right-5
                top-5
                z-30
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                bg-slate-100
                text-slate-500
                transition
                hover:bg-slate-200
                hover:text-slate-900
              "
              aria-label="Fermer"
            >
              <X size={18} />
            </motion.button>

            {/* ------------------------------------------------
                CONTENT
            ------------------------------------------------ */}
            <div
              className="
              "
            >
              <img
                src="/wall/ax.webp"
                alt="Skignas AI Beta"
                width={920}
                height={540}
                loading="lazy"
                decoding="async"
                sizes="100vw"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
