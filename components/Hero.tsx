'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

import type { Dictionary, Locale } from '@/i18n/dictionaries';

import styles from './Hero.module.css';

interface HeroProps {
  locale: Locale;
  dict: Dictionary;
}

export function Hero({ locale, dict }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  return (
    <section ref={ref} className={styles.hero}>
      <motion.div className={styles.scene} style={{ y, opacity }} aria-hidden="true">
        <div className={styles.sun} />
        <div className={styles.frondLeft} />
        <div className={styles.frondRight} />
        <div className={styles.water} />
        <div className={styles.sand} />
      </motion.div>

      <div className={`container ${styles.content}`}>
        <span className={styles.superline}>{dict.home.heroSuperline}</span>
        <h1 className={styles.title}>
          {dict.home.heroTitle}
          <span className={styles.kicker}>{dict.home.heroKicker}</span>
        </h1>
        <p className={styles.subtitle}>{dict.home.heroSubtitle}</p>
        <p className={styles.blurb}>{dict.home.heroBlurb}</p>
        <div className={styles.ctas}>
          <Link href={`/${locale}/cabanas`} className="btn btn-primary">
            {dict.home.ctaReserve}
          </Link>
          <Link href={`/${locale}/cabanas`} className="btn btn-ghost">
            {dict.home.ctaExplore}
          </Link>
        </div>
      </div>

    </section>
  );
}
