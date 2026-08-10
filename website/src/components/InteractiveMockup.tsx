import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Sparkles, Plus, X, Globe, Menu, Shield, Star, Download, Columns, Search, Command, BookOpen, Send, Settings } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const InteractiveMockup = () => {
  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl relative">
      <img 
        src="/assets/preview.png" 
        alt="Nova Browser Interface" 
        className="w-full h-auto object-cover"
      />
    </div>
  );
};
