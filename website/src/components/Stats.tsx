import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, GitFork, Code, Heart } from 'lucide-react';

interface GitHubData {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
}

export const Stats = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [gh, setGh] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.github.com/repos/unitybtw/nova-browser')
      .then((r) => r.json())
      .then((d) => {
        setGh({
          stars: d.stargazers_count ?? 0,
          forks: d.forks_count ?? 0,
          watchers: d.watchers_count ?? 0,
          openIssues: d.open_issues_count ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const items = [
    {
      icon: <Star className="w-6 h-6" />,
      value: gh?.stars,
      label: 'GitHub Stars',
      color: 'text-amber-500',
      bg: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-500/20',
    },
    {
      icon: <GitFork className="w-6 h-6" />,
      value: gh?.forks,
      label: 'Forks',
      color: 'text-blue-500',
      bg: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-500/20',
    },
    {
      icon: <Code className="w-6 h-6" />,
      value: null,
      label: 'MIT License',
      display: '100% Free',
      color: 'text-emerald-500',
      bg: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-500/20',
    },
    {
      icon: <Heart className="w-6 h-6" />,
      value: null,
      label: 'Open Source',
      display: 'Always',
      color: 'text-rose-500',
      bg: 'from-rose-500/10 to-rose-500/5',
      border: 'border-rose-500/20',
    },
  ];

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
            Real numbers, no marketing fluff
          </h2>
          <p className="text-foreground/60 mt-2 text-sm">
            GitHub stats are fetched live directly from the API.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`rounded-3xl bg-gradient-to-br ${item.bg} border ${item.border} p-8 flex flex-col items-center text-center group hover:scale-105 transition-transform duration-300`}
            >
              <div className={`mb-4 p-3 rounded-2xl bg-white/60 dark:bg-foreground/10 shadow-sm ${item.color}`}>
                {item.icon}
              </div>
              <div className={`text-4xl font-black mb-1 ${item.color}`}>
                {item.display ? (
                  item.display
                ) : loading ? (
                  <span className="text-foreground/30 text-2xl animate-pulse">—</span>
                ) : inView ? (
                  item.value?.toLocaleString() ?? '—'
                ) : (
                  '—'
                )}
              </div>
              <div className="text-foreground/60 font-medium text-sm">{item.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-foreground/40 mt-6"
        >
          GitHub stats update in real time.{' '}
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            View on GitHub →
          </a>
        </motion.p>
      </div>
    </section>
  );
};
