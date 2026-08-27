import React from 'react';
import { Series } from 'remotion';
import { CyberBackground } from './components/CyberBackground';
import { Scene1Intro } from './scenes/Scene1Intro';
import { Scene2Speed } from './scenes/Scene2Speed';
import { Scene3AI } from './scenes/Scene3AI';
import { Scene4Privacy } from './scenes/Scene4Privacy';
import { Scene6Outro } from './scenes/Scene6Outro';

export const NovaShorts: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: 1080,
        height: 1920,
        overflow: 'hidden',
        backgroundColor: '#030712',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background */}
      <CyberBackground />

      {/* Sequential Short Scenes */}
      <div style={{ transform: 'scale(0.85)', transformOrigin: 'center center', width: 1200, height: 1200, position: 'relative' }}>
        <Series>
          <Series.Sequence durationInFrames={150}>
            <Scene1Intro />
          </Series.Sequence>
          <Series.Sequence durationInFrames={180}>
            <Scene2Speed />
          </Series.Sequence>
          <Series.Sequence durationInFrames={180}>
            <Scene3AI />
          </Series.Sequence>
          <Series.Sequence durationInFrames={180}>
            <Scene4Privacy />
          </Series.Sequence>
          <Series.Sequence durationInFrames={180}>
            <Scene6Outro />
          </Series.Sequence>
        </Series>
      </div>
    </div>
  );
};
