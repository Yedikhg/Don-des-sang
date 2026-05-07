import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Droplets, MapPin, Shield, Zap, Heart, Users, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    const steps = 60
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 2000 / steps)
    return () => clearInterval(timer)
  }, [inView, target])
  return <span ref={ref}>{count.toLocaleString('fr-FR')}{suffix}</span>
}

export default function LandingPage() {
  const { t } = useTranslation()

  const statsData = [
    { value: 1247, suffix: '', label: t('landing.stats.lives_saved'), icon: Heart },
    { value: 89, suffix: '', label: t('landing.stats.partner_hospitals'), icon: Shield },
    { value: 15420, suffix: '', label: t('landing.stats.active_donors'), icon: Users },
    { value: 8, suffix: ' min', label: t('landing.stats.avg_response_time'), icon: Clock },
  ]

  const stepsData = [
    {
      num: '01',
      title: t('landing.how_it_works.steps.0.title'),
      desc: t('landing.how_it_works.steps.0.desc'),
      icon: Zap,
    },
    {
      num: '02',
      title: t('landing.how_it_works.steps.1.title'),
      desc: t('landing.how_it_works.steps.1.desc'),
      icon: MapPin,
    },
    {
      num: '03',
      title: t('landing.how_it_works.steps.2.title'),
      desc: t('landing.how_it_works.steps.2.desc'),
      icon: Heart,
    },
  ]

  const odd3Points = [
    t('landing.odd3.points.0'),
    t('landing.odd3.points.1'),
    t('landing.odd3.points.2'),
    t('landing.odd3.points.3'),
  ]

  const featuresData = [
    { icon: Shield, title: t('landing.features.items.0.title'), desc: t('landing.features.items.0.desc') },
    { icon: Zap, title: t('landing.features.items.1.title'), desc: t('landing.features.items.1.desc') },
    { icon: Heart, title: t('landing.features.items.2.title'), desc: t('landing.features.items.2.desc') },
    { icon: MapPin, title: t('landing.features.items.3.title'), desc: t('landing.features.items.3.desc') },
    { icon: Users, title: t('landing.features.items.4.title'), desc: t('landing.features.items.4.desc') },
    { icon: Clock, title: t('landing.features.items.5.title'), desc: t('landing.features.items.5.desc') },
  ]

  const testimonialsData = [
    {
      quote: t('landing.testimonials.items.0.quote'),
      author: t('landing.testimonials.items.0.author'),
      role: t('landing.testimonials.items.0.role'),
      initials: "AK",
    },
    {
      quote: t('landing.testimonials.items.1.quote'),
      author: t('landing.testimonials.items.1.author'),
      role: t('landing.testimonials.items.1.role'),
      initials: "YM",
    },
    {
      quote: t('landing.testimonials.items.2.quote'),
      author: t('landing.testimonials.items.2.author'),
      role: t('landing.testimonials.items.2.role'),
      initials: "FB",
    },
  ]

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[700px] flex flex-col justify-end overflow-hidden">

        {/* Background image with dark overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=1920&q=85"
            alt="Don de sang — urgence médicale"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_18%_38%,rgba(9,9,11,0.92)_0%,rgba(9,9,11,0.62)_45%,rgba(9,9,11,0.22)_70%,rgba(9,9,11,0.08)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/35 to-transparent" />
        </div>

        {/* Main hero content */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 pb-20 lg:pb-28 pt-36 sm:pt-40">

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#09090b]/40 px-3 py-1.5 backdrop-blur mb-10"
          >
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-xs tracking-[0.16em] uppercase text-zinc-300 font-medium">
              {t('landing.hackathon')}
            </span>
          </motion.div>

          {/* Large display title */}
          <div className="overflow-hidden mb-3">
            <motion.h1
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.3rem,8.2vw,6.25rem)] font-black leading-[1.02] tracking-tight text-white"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              Urgence
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-10">
            <motion.h1
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.3rem,8.2vw,6.25rem)] font-black leading-[1.02] tracking-tight text-rose-500"
            >
              -Sang
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="max-w-xl"
          >
            <p className="text-xs tracking-[0.14em] uppercase text-zinc-300 mb-4 font-medium">
              {t('landing.hero_title')}
            </p>
            <p className="text-zinc-100 text-[15px] sm:text-base leading-relaxed mb-9 font-medium">
              {t('landing.hero_subtitle')}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/donor/register"
                className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm tracking-wide uppercase transition-all duration-200"
              >
                {t('landing.become_donor')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/hospital/register"
                className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl border border-white/25 hover:border-white text-zinc-100 hover:text-white font-semibold text-sm tracking-wide uppercase transition-all duration-200 bg-white/5 hover:bg-white/10 backdrop-blur"
              >
                {t('landing.hospital_access')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <div className="mt-10 hidden lg:flex items-center gap-3 text-xs text-zinc-200">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#09090b]/30 px-3 py-1.5 backdrop-blur">
                <Shield className="w-3.5 h-3.5 text-rose-500" />
                {t('landing.verified_hospitals')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#09090b]/30 px-3 py-1.5 backdrop-blur">
                <Zap className="w-3.5 h-3.5 text-rose-500" />
                {t('landing.realtime_matching')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#09090b]/30 px-3 py-1.5 backdrop-blur">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                {t('landing.measurable_impact')}
              </span>
            </div>
          </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[11px] tracking-[0.28em] uppercase text-white/90 font-semibold">{t('landing.scroll')}</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-0.5 h-12 bg-gradient-to-b from-white/60 to-transparent rounded-full"
          />
        </motion.div>
      </section>

      {/* ─── STATS ────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto pt-10 lg:pt-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10">
            {statsData.map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative bg-[#09090b] px-7 sm:px-10 py-10 lg:py-14"
                >
                  {i !== 0 && (
                    <div className="pointer-events-none absolute left-0 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-white/12 to-transparent" />
                  )}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                      <Icon className="w-6 h-6 text-rose-400" />
                    </div>
                    <div
                      className="text-4xl lg:text-5xl font-black text-white mb-3 tabular-nums"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-xs sm:text-sm tracking-[0.18em] uppercase text-zinc-300 font-semibold">
                      {stat.label}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-28 lg:py-36 border-t border-zinc-800" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">

          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-8">
            <div>
              <p className="text-xs tracking-[0.25em] uppercase text-zinc-500 mb-4">{t('landing.how_it_works.process')}</p>
              <h2 className="text-5xl lg:text-7xl font-black leading-none text-white" dangerouslySetInnerHTML={{ __html: t('landing.how_it_works.how_it_works_title') }} />
            </div>
            <p className="text-zinc-400 max-w-xs text-sm leading-relaxed">
              {t('landing.how_it_works.description')}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-zinc-800">
            {stepsData.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="bg-[#09090b] p-10 lg:p-12 group hover:bg-zinc-950 transition-colors"
                >
                  <div className="flex items-start justify-between mb-10">
                    <span className="text-[3.5rem] font-black text-zinc-800 leading-none group-hover:text-rose-950 transition-colors">
                      {step.num}
                    </span>
                    <Icon className="w-5 h-5 text-rose-600 mt-2" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 leading-tight">{step.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── ODD 3 SPLIT SECTION ──────────────────────────────── */}
      <section className="border-t border-zinc-800 grid lg:grid-cols-2 min-h-[500px]">
        {/* Image side */}
        <div className="relative min-h-[300px] lg:min-h-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=900&q=80"
            alt="ODD 3 — Santé mondiale"
            className="w-full h-full object-cover object-center grayscale opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#09090b]" />
          <div className="absolute bottom-8 left-8">
            <div className="text-7xl font-black text-white/10 leading-none">ODD</div>
            <div className="text-7xl font-black text-rose-600/30 leading-none -mt-4">03</div>
          </div>
        </div>

        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex flex-col justify-center p-10 lg:p-16"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-zinc-500 mb-6">
            {t('landing.odd3.subtitle')}
          </p>
          <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-6" dangerouslySetInnerHTML={{ __html: t('landing.odd3.title') }} />
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-md">
            {t('landing.odd3.description')}
          </p>
          <div className="space-y-3">
            {odd3Points.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-zinc-400">
                <div className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section className="py-28 lg:py-36 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">

          <div className="mb-20">
            <p className="text-xs tracking-[0.25em] uppercase text-zinc-500 mb-4">{t('landing.features.subtitle')}</p>
            <h2 className="text-5xl lg:text-7xl font-black leading-none text-white" dangerouslySetInnerHTML={{ __html: t('landing.features.title') }} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800">
            {featuresData.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-[#09090b] p-8 lg:p-10 group hover:bg-zinc-950 transition-colors"
                >
                  <Icon className="w-5 h-5 text-rose-600 mb-6" />
                  <h3 className="text-base font-bold text-white mb-3 tracking-wide">{f.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-28 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
          <p className="text-xs tracking-[0.25em] uppercase text-zinc-500 mb-16">{t('landing.testimonials.subtitle')}</p>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonialsData.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="flex flex-col border border-zinc-800 p-8 hover:border-zinc-700 transition-colors rounded-lg"
              >
                <div className="text-rose-600 text-3xl font-serif leading-none mb-6">"</div>
                <p className="text-zinc-300 text-sm leading-relaxed flex-1 italic">{t.quote}"</p>
                <div className="flex items-center gap-4 border-t border-zinc-800 pt-6 mt-8">
                  <div className="w-9 h-9 bg-rose-600/20 border border-rose-600/30 rounded-lg flex items-center justify-center text-rose-400 text-xs font-bold shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-white text-xs font-semibold tracking-wide">{t.author}</div>
                    <div className="text-zinc-600 text-xs mt-0.5">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="border-t border-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1920&q=80"
            alt="Urgence sang — rejoindre"
            className="w-full h-full object-cover grayscale opacity-20"
          />
          <div className="absolute inset-0 bg-[#09090b]/80" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-32 lg:py-44">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs tracking-[0.25em] uppercase text-zinc-500 mb-6">{t('landing.cta.subtitle')}</p>
            <h2 className="text-[clamp(2.5rem,8vw,7rem)] font-black leading-none text-white mb-4">
              {t('landing.cta.title')}
            </h2>
            <h2 className="text-[clamp(2.5rem,8vw,7rem)] font-black leading-none text-rose-600 mb-12">
              {t('landing.cta.title_2')}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/donor/register"
                className="group inline-flex items-center gap-3 px-8 py-5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm tracking-widest uppercase transition-all duration-200"
              >
                {t('landing.cta.become_donor')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/hospital/register"
                className="group inline-flex items-center gap-3 px-8 py-5 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white font-semibold text-sm tracking-widest uppercase transition-all duration-200"
              >
                {t('landing.cta.register_hospital')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 py-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-rose-600 flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest uppercase text-white">Urgence-Sang</span>
            </div>
            <p className="text-xs text-zinc-600 tracking-wide text-center">
              {t('landing.footer.copyright')}
            </p>
            <div className="flex gap-6 text-xs tracking-widest uppercase text-zinc-600">
              <a href="#" className="hover:text-white transition-colors">{t('landing.footer.privacy')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('landing.footer.terms')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('landing.footer.contact')}</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
