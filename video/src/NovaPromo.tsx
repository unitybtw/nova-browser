import React from 'react';
import { Series } from 'remotion';
import { CyberBackground } from './components/CyberBackground';
import { Scene1Intro } from './scenes/Scene1Intro';
import { Scene2Speed } from './scenes/Scene2Speed';
import { Scene3AI } from './scenes/Scene3AI';
import { Scene4Privacy } from './scenes/Scene4Privacy';
import { Scene5Workflow } from './scenes/Scene5Workflow';
import { Scene6Outro } from './scenes/Scene6Outro';

export const NovaPromo: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        overflow: 'hidden',
        backgroundColor: '#030712',
      }}
    >
      {/* Universal Dynamic Cyber Atmosphere */}
      <CyberBackground />

      {/* Sequential Scenes */}
      <Series>
        {/* 1. Intro & Brand Reveal (3.0s) */}
        <Series.Sequence durationInFrames={180}>
          <Scene1Intro />
        </Series.Sequence>

        {/* 2. Speed & Benchmark Engine (4.0s) */}
        <Series.Sequence durationInFrames={240}>
          <Scene2Speed />
        </Series.Sequence>

        {/* 3. Local WebGPU AI Assistant (4.0s) */}
        <Series.Sequence durationInFrames={240}>
          <Scene3AI />
        </Series.Sequence>

        {/* 4. Zero-Tracker Privacy Shield (4.0s) */}
        <Series.Sequence durationInFrames={240}>
          <Scene4Privacy />
        </Series.Sequence>

        {/* 5. Split View & Spatial Workspaces (4.0s) */}
        <Series.Sequence durationInFrames={240}>
          <Scene5Workflow />
        </Series.Sequence>

        {/* 6. Call to Action & Download (4.0s) */}
        <Series.Sequence durationInFrames={240}>
          <Scene6Outro />
        </Series.Sequence>
      </Series>
    </div>
  );
};
