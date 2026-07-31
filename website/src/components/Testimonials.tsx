import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Alex R.',
    role: 'Software Engineer',
    avatar: 'AR',
    color: 'from-blue-500 to-indigo-500',
    stars: 5,
    text: 'Finally a browser that doesn\'t spy on me. The AI assistant is genuinely useful — I asked it to find and summarize 5 articles on a topic and it just did it, no fuss.',
  },
  {
    name: 'Sara M.',
    role: 'UX Designer',
    avatar: 'SM',
    color: 'from-pink-500 to-rose-500',
    stars: 5,
    text: 'The split screen feature alone is worth switching. I have my reference on the left and my work on the right. The design is also *chef\'s kiss* — clean, modern, no clutter.',
  },
  {
    name: 'James T.',
    role: 'Privacy Advocate',
    avatar: 'JT',
    color: 'from-emerald-500 to-teal-500',
    stars: 5,
    text: 'I\'ve tried Brave, Arc, Vivaldi — Nova is the first that feels both private AND productive. The ad blocker is aggressive in a good way. Highly recommend.',
  },
  {
    name: 'Leila K.',
    role: 'Student & Researcher',
    avatar: 'LK',
    color: 'from-purple-500 to-violet-500',
    stars: 5,
    text: 'Workspaces changed my life. I used to have 60 tabs open. Now I have 3 workspaces and everything is organized. The tab folders are a game changer for research.',
  },
  {
    name: 'Marco D.',
    role: 'Open Source Contributor',
    avatar: 'MD',
    color: 'from-amber-500 to-orange-500',
    stars: 5,
    text: 'The codebase is clean and well-documented. I submitted a PR and it was merged in 2 days. Great community, great project. This is how open source should work.',
  },
  {
    name: 'Priya S.',
    role: 'Content Creator',
    avatar: 'PS',
    color: 'from-cyan-500 to-blue-500',
    stars: 5,
    text: 'Asked the AI to read a long article to me while I was cooking. It just worked. No setup, no API keys. That kind of seamless experience is rare.',
  },
];

export const Testimonials = () => {
  return (
    <section id="privacy" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">Testimonials</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            Loved by people who care about the web
          </h2>
          <p className="text-lg text-foreground/70">
            Real feedback from real users across GitHub, Reddit, and our community.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="glass rounded-3xl p-7 flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-300 relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-5 right-6 w-8 h-8 text-foreground/10" />

              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground/80 leading-relaxed text-sm flex-1">
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-foreground/50">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
