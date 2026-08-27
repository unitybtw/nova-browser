import React from 'react';
import { Composition } from 'remotion';
import { NovaPromo } from './NovaPromo';
import { NovaShorts } from './NovaShorts';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 Landscape Promo Trailer (1920x1080, 60fps, 23s = 1380 frames) */}
      <Composition
        id="NovaPromo"
        component={NovaPromo}
        durationInFrames={1380}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{}}
      />

      {/* 9:16 Vertical Video for Shorts / Reels (1080x1920, 60fps, 14.5s = 870 frames) */}
      <Composition
        id="NovaShorts"
        component={NovaShorts}
        durationInFrames={870}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
