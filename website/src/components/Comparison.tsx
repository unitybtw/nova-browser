import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

type CellValue = true | false | null | string;

interface ComparisonRow {
  nova: CellValue;
  chrome: CellValue;
  firefox: CellValue;
  brave: CellValue;
}

const rowsData: ComparisonRow[] = [
  { nova: true, chrome: false, firefox: false, brave: true },
  { nova: true, chrome: false, firefox: false, brave: false },
  { nova: true, chrome: false, firefox: false, brave: false },
  { nova: true, chrome: false, firefox: false, brave: true },
  { nova: true, chrome: false, firefox: true, brave: null },
  { nova: true, chrome: false, firefox: true, brave: true },
  { nova: true, chrome: true, firefox: true, brave: true },
  { nova: true, chrome: false, firefox: true, brave: true },
  { nova: true, chrome: false, firefox: null, brave: null },
  { nova: true, chrome: true, firefox: true, brave: true },
];

const browsers = [
  { key: 'nova', label: 'Nova', highlight: true },
  { key: 'chrome', label: 'Chrome', highlight: false },
  { key: 'firefox', label: 'Firefox', highlight: false },
  { key: 'brave', label: 'Brave', highlight: false },
] as const;

function Cell({ value }: { value: CellValue }) {
  if (value === true) return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-5 h-5 text-red-400 mx-auto" />;
  if (value === null) return <Minus className="w-4 h-4 text-foreground/30 mx-auto" />;
  return <span className="text-xs text-foreground/60">{value}</span>;
}

export const Comparison = () => {
  const { t } = useLang();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">{t.comparison.badge}</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            {t.comparison.title}
          </h2>
          <p className="text-lg text-foreground/70">
            {t.comparison.sub}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left py-4 px-6 text-foreground/50 font-medium text-sm w-1/3">Feature</th>
                {browsers.map((b) => (
                  <th key={b.key} className={`py-4 px-4 text-center font-bold text-sm rounded-t-2xl ${b.highlight ? 'bg-primary text-white' : 'text-foreground/60'}`}>
                    {b.highlight && (
                      <div className="text-[10px] font-semibold text-primary-foreground/70 mb-0.5 uppercase tracking-wider">
                        {t.comparison.recommended}
                      </div>
                    )}
                    {b.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsData.map((row, i) => {
                const featureLabel = t.comparison.features[i] || '';
                return (
                  <tr
                    key={i}
                    className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? 'bg-foreground/[0.015]' : ''}`}
                  >
                    <td className="py-4 px-6 text-foreground/80 font-medium text-sm">{featureLabel}</td>
                    {browsers.map((b) => (
                      <td
                        key={b.key}
                        className={`py-4 px-4 text-center ${b.highlight ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                      >
                        <Cell value={row[b.key]} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-3 px-6" />
                {browsers.map((b) => (
                  <td key={b.key} className={`py-3 px-4 rounded-b-2xl ${b.highlight ? 'bg-primary/5 dark:bg-primary/10' : ''}`} />
                ))}
              </tr>
            </tfoot>
          </table>
        </motion.div>

        <p className="text-center text-xs text-foreground/40 mt-6">
          {t.comparison.disclaimer}
        </p>
      </div>
    </section>
  );
};
