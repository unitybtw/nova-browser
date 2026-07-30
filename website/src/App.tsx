import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 selection:text-primary">
      <Navbar />
      
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

export default App;
