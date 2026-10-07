"""Generate the English voice track on macOS with its installed Daniel voice.
Requires say, ffmpeg and ffprobe. No network calls or voice-service credentials.
Run from the repository root. Per-scene durations are checked before mixing.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'video/out/narration'
OUT.mkdir(parents=True, exist_ok=True)
SEGMENTS = [
    (0.55, 4.1, 'Meet Nova. A browser built around the way you work.'),
    (5.0, 7.2, 'Keep your day in focus with a clean start page, flexible tabs, and separate workspaces.'),
    (13.0, 7.7, 'Explore ideas with your sidebar assistant. Supported models run locally on your device, using Web G P U.'),
    (21.5, 5.2, 'Free and open source. For Mac, Windows, and Linux.'),
    (27.8, 4.6, 'Find your space. Make room for Nova.'),
]
inputs = []
filters = []
for i, (start, available, text) in enumerate(SEGMENTS):
    path = OUT / f'{i}.aiff'
    subprocess.run(['say', '-v', 'Daniel', '-r', '172', '-o', str(path), text], check=True)
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(path)]))
    duration = float(info['format']['duration'])
    if duration > available:
        raise RuntimeError(f'Scene {i} voice is {duration:.2f}s, exceeds its {available}s window')
    print(f'Scene {i}: starts {start}s, speech {duration:.2f}s')
    inputs.extend(['-i', str(path)])
    filters.append(f'[{i}:a]aresample=48000,adelay={int(start * 1000)}:all=1[v{i}]')
filters.append(''.join(f'[v{i}]' for i in range(len(SEGMENTS))) + f'amix=inputs={len(SEGMENTS)}:normalize=0,apad,atrim=duration=33,loudnorm=I=-17:TP=-2:LRA=7[out]')
subprocess.run(['ffmpeg', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', str(ROOT / 'video/public/website-tour/narration.m4a')], check=True)
