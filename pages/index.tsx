import { MotionConfig } from "motion/react";
import Head from "next/head";
import { useCallback, useEffect } from "react";
import CheatSheet from "../components/CheatSheet";
import Converter from "../components/Converter";
import Hero from "../components/Hero";
import { ArrowUpRightIcon } from "../components/Icons";
import SizeSense from "../components/SizeSense";
import UnitAnatomy from "../components/UnitAnatomy";
import { describe } from "../lib/format";
import { SYSTEMS, type SystemId } from "../lib/land";
import { fromQuery, useLand } from "../lib/useLand";
import styles from "../styles/Home.module.css";

const DESCRIPTION =
  "Convert Nepali land units — Ropani, Aana, Paisa, Daam, Bigha, Kattha and Dhur — to square feet, square metres, acres and hectares, and see the area to scale.";

export default function Home() {
  const land = useLand();
  const { load, sqft, system } = land;
  const family = SYSTEMS[system].family;

  // Open shared links (?from=ropani&v=2,5,0,1) with their area loaded.
  useEffect(() => {
    const shared = fromQuery(window.location.search);
    if (shared) load(shared.sqft, shared.system);
  }, [load]);

  const pick = useCallback(
    (area: number, target: SystemId) => {
      load(area, target);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("convert")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    },
    [load],
  );

  return (
    <MotionConfig reducedMotion="user">
      <Head>
        <title>Nepali Land Converter · Ropani, Aana, Bigha, Kattha to sq ft &amp; m²</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Nepali Land Converter" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
      </Head>

      <Hero />
      <main>
        <Converter land={land} />
        <SizeSense sqft={sqft} family={family} label={describe(sqft, system)} />
        <UnitAnatomy sqft={sqft} family={family} />
        <CheatSheet onPick={pick} />
      </main>

      <footer className={styles.footer}>
        <div className={`wrap ${styles.inner}`}>
          <div>
            <p className={styles.brand}>
              Land Converter <span className="deva">जग्गा नाप रूपान्तरण</span>
            </p>
            <p className={styles.note}>
              Uses the standard definitions 1 Ropani = 5,476 ft² and 1 Bigha = 72,900 ft², with 1 ft = 0.3048 m exactly. Results are for planning and comparison. The area on your Lalpurja and the Survey Office&apos;s
              measurement are what count legally.
            </p>
          </div>
          <a href="https://raghavkattel.com.np/projects" target="_blank" rel="noopener noreferrer" className="btn">
            View more projects <ArrowUpRightIcon />
          </a>
        </div>
      </footer>
    </MotionConfig>
  );
}
