import { motion } from 'framer-motion';
import {
  Sparkles, Code, Cpu, Terminal, ArrowUpRight,
  Layers, Zap, Database, Shield, FileText
} from 'lucide-react';
import Logo from './Logo';

const row1 = [
  { icon: <Cpu size={13} />, text: 'Explain quantum computing in simple terms' },
  { icon: <Code size={13} />, text: 'Write an async Python rate limiter' },
  { icon: <Sparkles size={13} />, text: 'Draft a developer tool launch email' },
  { icon: <Layers size={13} />, text: 'Design system tokens in CSS variables' },
  { icon: <Zap size={13} />, text: 'How does Transformer self-attention work?' },
];

const row2 = [
  { icon: <Terminal size={13} />, text: 'Design a real-time collaborative doc editor' },
  { icon: <Database size={13} />, text: 'Compare Redis vs Memcached for caching' },
  { icon: <Zap size={13} />, text: 'Optimize Largest Contentful Paint (LCP)' },
  { icon: <Shield size={13} />, text: 'Best practices for JWT & session security' },
  { icon: <FileText size={13} />, text: 'Summarize key engineering meeting takeaways' },
];

export default function WelcomeScreen({ onSelectSuggestion, theme }) {
  return (
    <div className="welcome-screen">
      {/* Top spacer for vertical optical centering */}
      <div className="welcome-spacer" />

      {/* Hero Section: Animated Logo & Title */}
      <motion.div
        className="welcome-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="welcome-logo-wrap">
          {/* Floating Squircle Logo */}
          <motion.div
            className="welcome-logo-box"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          >
            <Logo theme={theme} className="welcome-hero-logo" />
          </motion.div>
        </div>

        <h2 className="welcome-title">How can I help you today?</h2>
      </motion.div>

      {/* Full-width live moving prompt carousel positioned directly above the message input box */}
      <motion.div
        className="welcome-bottom-carousel"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="prompt-carousel-container">
          {/* Track 1: Drifts left */}
          <div className="prompt-carousel-track scroll-left">
            {[...row1, ...row1].map((item, idx) => (
              <button
                key={`r1-${idx}`}
                className="carousel-chip"
                onClick={() => onSelectSuggestion(item.text)}
                type="button"
              >
                <span className="chip-icon">{item.icon}</span>
                <span className="chip-text">{item.text}</span>
                <ArrowUpRight size={12} className="chip-arrow" />
              </button>
            ))}
          </div>

          {/* Track 2: Drifts right */}
          <div className="prompt-carousel-track scroll-right">
            {[...row2, ...row2].map((item, idx) => (
              <button
                key={`r2-${idx}`}
                className="carousel-chip"
                onClick={() => onSelectSuggestion(item.text)}
                type="button"
              >
                <span className="chip-icon">{item.icon}</span>
                <span className="chip-text">{item.text}</span>
                <ArrowUpRight size={12} className="chip-arrow" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
