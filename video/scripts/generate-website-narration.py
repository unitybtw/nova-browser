"""Generate a calm English female narration and speech-aligned captions.

Requires edge-tts==7.2.8, ffmpeg and ffprobe. The public script is sent to the
Microsoft Edge speech service. No account secrets or user data are transmitted.
Run from the repository root. A failed generation never replaces the final track.
"""
import asyncio
import json
import subprocess
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'video/out/narration'
OUT.mkdir(parents=True, exist_ok=True)
VOICE = 'en-US-JennyNeural'
DURATION = 36
SEGMENTS = [
    (0.55, 4.9, 'Meet Nova. A browser built around the way you work.', 'Nova ile tanış. Çalışma biçimine uyum sağlayan bir tarayıcı.'),
    (6.0, 8.2, 'Keep your day in focus with a clean start page, flexible tabs, and separate workspaces.', 'Sade bir başlangıç sayfası, esnek sekmeler ve ayrı çalışma alanlarıyla gününe odaklan.'),
    (15.0, 8.2, 'Explore ideas with your sidebar assistant. Supported models run locally, right on your device.', 'Kenar çubuğundaki asistanla fikirlerini keşfet. Desteklenen modeller doğrudan cihazında yerel olarak çalışır.'),
    (24.0, 5.85, 'Free and open source. For Mac, Windows, and Linux.', 'Ücretsiz ve açık kaynaklı. Mac, Windows ve Linux için.'),
    (30.8, 4.8, 'Find your space. Make room for Nova.', 'Kendi alanını bul. Nova’ya yer aç.'),
]

def timestamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms // 60000:02}:{ms // 1000 % 60:02}.{ms % 1000:03}'

async def generate():
    inputs, filters = [], []
    captions = {'en': ['WEBVTT\n'], 'tr': ['WEBVTT\n']}
    for i, (start, available, text, translation) in enumerate(SEGMENTS):
        path = OUT / f'female-{i}.mp3'
        metadata = OUT / f'female-{i}.json'
        await edge_tts.Communicate(text, VOICE, rate='-4%', boundary='SentenceBoundary').save(str(path), str(metadata))
        info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(path)]))
        duration = float(info['format']['duration'])
        if duration > available:
            raise RuntimeError(f'Scene {i} voice is {duration:.2f}s, exceeds its {available}s window')
        print(f'Scene {i}: starts {start}s, speech {duration:.2f}s', flush=True)
        boundaries = [json.loads(line) for line in metadata.read_text().splitlines() if line.strip()]
        first = min(b['offset'] for b in boundaries) / 10000000 if boundaries else 0
        last = max(b['offset'] + b['duration'] for b in boundaries) / 10000000 if boundaries else duration
        end = min(start + available, start + max(last, first + .5) + .15)
        for language, caption in [('en', text), ('tr', translation)]:
            captions[language].append(f'{timestamp(start + first)} --> {timestamp(end)}\n{caption}\n')
        inputs.extend(['-i', str(path)])
        filters.append(f'[{i}:a]aresample=48000,highpass=f=75,afade=t=in:st=0:d=0.015,adelay={int(start * 1000)}:all=1[v{i}]')
    filters.append(''.join(f'[v{i}]' for i in range(len(SEGMENTS))) + f'amix=inputs={len(SEGMENTS)}:normalize=0,apad,atrim=duration={DURATION},loudnorm=I=-17:TP=-2:LRA=7[out]')
    mixed = OUT / 'narration.m4a'
    subprocess.run(['ffmpeg', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', str(mixed)], check=True)
    (ROOT / 'video/public/website-tour/narration.m4a').write_bytes(mixed.read_bytes())
    for language, cues in captions.items():
        (ROOT / f'website/public/images/nova-tour.{language}.vtt').write_text('\n'.join(cues))

if __name__ == '__main__':
    asyncio.run(generate())
