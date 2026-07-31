import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, Shield, Zap, Users } from 'lucide-react';

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const stats: StatItem[] = [
  {
    icon: <Users className="w-6 h-6" />,
    value: 12000,
    suffix: '+',
    label: 'Active Users',
    color: 'text-blue-500',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    value: 98,
    suffix: 'M+',
    label: 'Ads Blocked',
    color: 'text-emerald-500',
  },
  {
    icon: <Star className="w-6 h-6" />,
    value: 0,
    suffix: '',
    label: 'GitHub Stars',
    color: 'text-amber-500',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    value: 100,
    suffix: '%',
    label: 'Open Source',
    color: 'text-purple-500',
  },
];

function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCard({ stat, index, started }: { stat: StatItem; index: number; started: boolean }) {
  const count = useCountUp(stat.value, 1800, started);

  const displayValue =
    stat.label === 'GitHub Stars' && stat.value === 0 ? '—' : count.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="glass rounded-3xl p-8 flex flex-col items-center text-center group hover:scale-105 transition-transform duration-300"
    >
      <div className={`mb-4 p-3 rounded-2xl bg-white dark:bg-foreground/10 shadow-sm ${stat.color}`}>
        {stat.icon}
      </div>
      <div className={`text-4xl font-black mb-1 ${stat.color}`}>
        {displayValue}{stat.value !== 0 ? stat.suffix : ''}
      </div>
      <div className="text-foreground/60 font-medium text-sm">{stat.label}</div>
    </motion.div>
  );
}

export const Stats = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [githubStars, setGithubStars] = useState(0);

  useEffect(() => {
    fetch('https://api.github.com/repos/unitybtw/nova-browser')
      .then((r) => r.json())
      .then((d) => {
        if (d.stargazers_count !== undefined) {
          setGithubStars(d.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  const resolvedStats = stats.map((s) =>
    s.label === 'GitHub Stars' ? { ...s, value: githubStars } : s
  );

  return (
    <section ref={ref} className="py-16 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">By the numbers</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
            Trusted by developers & privacy-lovers
          </h2>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {resolvedStats.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} started={inView} />
          ))}
        </div>
      </div>
    </section>
  );
};
