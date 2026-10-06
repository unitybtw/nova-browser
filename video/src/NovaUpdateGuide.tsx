import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';

const steps = [
  { title: 'Updates, on your terms.', label: 'Check automatically', body: 'Nova checks after startup and every four hours.', panel: 'Checking for updates', detail: 'Your browsing stays uninterrupted.' },
  { title: 'Choose when to download.', label: 'Download when ready', body: 'An available update waits for your choice.', panel: 'A new version is available', detail: 'Choose Download in the desktop app.' },
  { title: 'Restart when it suits you.', label: 'Restart to install', body: 'Apply the update when you are ready.', panel: 'Ready to install', detail: 'Restart Nova to finish the update.' },
];
export function NovaUpdateGuide() {
  const frame = useCurrentFrame();
  const step = Math.min(2, Math.floor(frame / 180));
  const local = frame % 180;
  const enter = interpolate(local, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const data = steps[step];
  return <AbsoluteFill style={{ background: '#f4f6fa', color: '#1c283b', fontFamily: 'Manrope, sans-serif', padding: '90px 110px' }}>
    <style>{`@font-face{font-family:Manrope;src:url('${staticFile('website-tour/manrope.woff2')}')}`}</style>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}><Img src={staticFile('website-tour/nova-icon.svg')} style={{ width: 58, height: 58 }} /><span style={{ fontSize: 28, fontWeight: 600 }}>Nova updates</span><span style={{ marginLeft: 'auto', fontSize: 20, color: '#647083' }}>Illustrated walkthrough</span></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, alignItems: 'center', flex: 1 }}>
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }}><h1 style={{ fontSize: 86, fontWeight: 500, lineHeight: 1.08, letterSpacing: '-.025em', margin: '0 0 34px' }}>{data.title}</h1><p style={{ fontSize: 30, lineHeight: 1.6, color: '#647083', maxWidth: 650 }}>{data.body}</p></div>
      <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 24px 70px #1e355119', overflow: 'hidden', opacity: enter }}>
        <div style={{ borderBottom: '1px solid #e3e7ef', padding: '25px 35px', display: 'flex', alignItems: 'center', gap: 10 }}>{[0,1,2].map(i => <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: '#d1d9e6' }} />)}<span style={{ fontSize: 19, color: '#647083', marginLeft: 'auto' }}>Desktop update controls</span></div>
        <div style={{ padding: '60px 48px' }}><Img src={staticFile('website-tour/nova-icon.svg')} style={{ width: 84, height: 84, marginBottom: 35 }} /><h2 style={{ fontSize: 39, fontWeight: 500, margin: '0 0 18px' }}>{data.panel}</h2><p style={{ fontSize: 24, lineHeight: 1.6, color: '#647083', margin: '0 0 35px' }}>{data.detail}</p>
          {step === 0 ? <div style={{ height: 5, background: '#eaf0fc', borderRadius: 3, overflow: 'hidden' }}><div style={{ background: '#285be8', width: '30%', height: '100%', transform: `translateX(${interpolate(local, [20, 165], [-100, 350], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%)` }} /></div> : <div style={{ display: 'inline-block', background: '#285be8', color: 'white', borderRadius: 9, padding: '17px 26px', fontSize: 22 }}>{step === 1 ? 'Download update' : 'Restart and install'}</div>}
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', borderTop: '1px solid #d8e0eb', paddingTop: 28, gap: 55 }}>{steps.map((item, i) => <div key={i} style={{ flex: 1, display: 'flex', gap: 14, alignItems: 'center', fontSize: 23, color: i === step ? '#245de1' : '#647083' }}><span style={{ background: i === step ? '#245de1' : '#d8e0eb', color: i === step ? 'white' : '#647083', borderRadius: '50%', width: 38, height: 38, display: 'grid', placeItems: 'center', fontSize: 18 }}>{i + 1}</span>{item.label}</div>)}</div>
  </AbsoluteFill>;
}
