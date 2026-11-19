"""Generate Monumental Editorial studio narration (en-US-AvaMultilingualNeural),
custom stereo minimalist score + tactile UI click SFX, and synced EN/TR WebVTT captions
for the 42-second Nova Browser v1.5.2 Launch Film.
"""
import asyncio
import array
import json
import math
import subprocess
import wave
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'video/out/launch-audio'
LAUNCH_PUBLIC = ROOT / 'video/public/launch-film'
WEBSITE_IMAGES = ROOT / 'website/public/images'

OUT_DIR.mkdir(parents=True, exist_ok=True)
LAUNCH_PUBLIC.mkdir(parents=True, exist_ok=True)

DURATION = 42.0
SAMPLE_RATE = 44100
VOICE = 'en-US-AvaMultilingualNeural'

# Exact act cut timestamps (seconds) matching 60fps frames:
# 0, 360, 960, 1380, 1800, 2160, 2520
ACT_CUTS = [0.0, 6.0, 16.0, 23.0, 30.0, 36.0]
COBALT_STING = 37.3

# Exact timestamps where tactile UI clicks occur in the Remotion choreography
CLICK_TIMES = [
    8.00,   # Act 2: Click Compact Row
    10.10,  # Act 2: Click Vertical Left
    12.20,  # Act 2: Click Vertical Right
    14.10,  # Act 2: Switch to Light theme
    19.40,  # Act 3: Cut to Split View
    25.20,  # Act 4: Focus Nova AI sidebar
    33.00,  # Act 5: Switch to Shield & Sync
]

# (start_s, max_slot_s, english_text, turkish_caption)
SEGMENTS = [
    (
        0.45,
        5.20,
        "Meet Nova. The open-source desktop browser you reshape live.",
        "Nova ile tanış. Canlı olarak şekillendirdiğin açık kaynak masaüstü tarayıcı.",
    ),
    (
        6.35,
        9.30,
        "Open Live Design Studio and reshape every bar in real time. Switch between four tab geometries, reorder your toolbar, and style each workspace your way.",
        "Live Design Studio'yu aç ve her çubuğu gerçek zamanlı şekillendir. Dört sekme geometrisi arasında geç, araç çubuğunu sırala ve her çalışma alanını kendi tarzına göre kur.",
    ),
    (
        16.30,
        6.20,
        "Isolate workspaces with vertical tabs, open two pages in Split View, and let idle tabs sleep.",
        "Dikey sekmelerle çalışma alanlarını ayır, Bölünmüş Ekran'da iki sayfayı yan yana aç ve boşta kalan sekmeler otomatik uyusun.",
    ),
    (
        23.30,
        6.20,
        "Ask Nova Assistant beside any page. Local WebGPU models and Whisper voice run right on your hardware.",
        "Herhangi bir sayfanın yanında Nova Asistan'a sor. Yerel WebGPU modelleri ve Whisper ses motoru doğrudan kendi donanımında çalışır.",
    ),
    (
        30.25,
        5.40,
        "Install Chrome extensions, connect agents via local MCP, and keep your sync encrypted.",
        "Chrome eklentilerini kur, ajanları yerel MCP ile bağla ve eşitlemeni şifreli tut.",
    ),
    (
        36.45,
        5.15,
        "Free and open source for macOS, Windows, and Linux. Make the web yours with Nova.",
        "macOS, Windows ve Linux için ücretsiz ve açık kaynak. Nova ile web senin kalsın.",
    ),
]


def format_vtt_time(seconds: float) -> str:
    ms = round(max(0.0, seconds) * 1000)
    return f"{ms // 60000:02}:{(ms // 1000) % 60:02}.{ms % 1000:03}"


def probe_duration(path: Path) -> float:
    out = subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(path)
    ], text=True).strip()
    return float(out)


async def generate_narration_clips() -> list[dict]:
    timings = []
    for idx, (start_s, max_slot, en_text, tr_text) in enumerate(SEGMENTS):
        mp3_path = OUT_DIR / f'seg-{idx}.mp3'
        wav_path = OUT_DIR / f'seg-{idx}.wav'
        # Slight speed adjustment on longer Act 5 sentence so every clip stays inside its act cleanly
        rate = '+3%' if idx == 4 else ('+0%' if idx == 1 else '-2%')
        communicate = edge_tts.Communicate(en_text, VOICE, rate=rate, pitch='+0Hz')
        await communicate.save(str(mp3_path))
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error',
            '-i', str(mp3_path),
            '-af', 'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB,areverse',
            '-ar', str(SAMPLE_RATE), '-ac', '2', str(wav_path)
        ], check=True)
        dur = probe_duration(wav_path)
        # If any clip exceeds its slot, gently time-stretch with atempo (max 1.12x)
        if dur > max_slot:
            tempo = min(1.15, dur / (max_slot - 0.15))
            stretched = OUT_DIR / f'seg-{idx}-fit.wav'
            subprocess.run([
                'ffmpeg', '-y', '-loglevel', 'error',
                '-i', str(wav_path),
                '-af', f'atempo={tempo:.4f}',
                '-ar', str(SAMPLE_RATE), '-ac', '2', str(stretched)
            ], check=True)
            stretched.replace(wav_path)
            dur = probe_duration(wav_path)
        timings.append({
            'index': idx,
            'start': round(start_s, 3),
            'end': round(start_s + dur, 3),
            'duration': round(dur, 3),
            'wav': str(wav_path),
            'en': en_text,
            'tr': tr_text,
        })
        print(f"Segment {idx}: {start_s:.2f}s -> {start_s + dur:.2f}s (dur={dur:.2f}s / max={max_slot:.2f}s)")
    return timings


def synthesize_score_and_sfx(output_wav: Path, speech_windows: list[tuple[float, float]]) -> None:
    """Synthesize a crisp stereo Monumental Editorial score + tactile UI click & cut SFX."""
    total_samples = int(SAMPLE_RATE * DURATION)
    buf = array.array('h')

    # Modern Nordic/Cupertino harmonic progression (warm, understated, confident)
    chords = [
        (130.81, 196.00, 246.94, 293.66, 329.63),  # Act 1: Cmaj9 (Obsidian open)
        (174.61, 220.00, 261.63, 329.63, 392.00),  # Act 2: Fmaj9 (Cool Stone Studio)
        (146.83, 220.00, 261.63, 329.63, 349.23),  # Act 3: Dm9 (Obsidian Workspaces/Split)
        (110.00, 164.81, 220.00, 261.63, 329.63),  # Act 4: Am9 (Cool Stone WebGPU AI)
        (116.54, 174.61, 220.00, 261.63, 349.23),  # Act 5: Bbmaj9 (Obsidian CRX3/MCP/Sync)
        (130.81, 196.00, 261.63, 329.63, 392.00),  # Act 6: C6/9 (Cobalt -> Obsidian Finale)
    ]
    bass_notes = [65.41, 87.31, 73.42, 55.00, 58.27, 65.41]

    bpm = 112.0
    beat_len = 60.0 / bpm
    sub_cut_times = ACT_CUTS[1:] + [COBALT_STING]

    for i in range(total_samples):
        t = i / SAMPLE_RATE

        # Locate active act
        act = 0
        for idx, cut in enumerate(ACT_CUTS):
            if t >= cut:
                act = idx
        act_t = t - ACT_CUTS[act]
        act_len = (ACT_CUTS[act + 1] if act + 1 < len(ACT_CUTS) else DURATION) - ACT_CUTS[act]

        # Global envelope (smooth 0.35s fade-in, 1.3s natural decay tail at end)
        master_env = 1.0
        if t < 0.35:
            master_env = t / 0.35
        elif t > DURATION - 1.4:
            master_env = max(0.0, (DURATION - t) / 1.4) ** 1.6

        # Smooth sidechain ducking when narrator is speaking
        duck = 1.0
        for s_start, s_end in speech_windows:
            if s_start - 0.12 <= t <= s_end + 0.18:
                if t < s_start:
                    frac = (t - (s_start - 0.12)) / 0.12
                    duck = min(duck, 1.0 - 0.42 * frac)
                elif t > s_end:
                    frac = (t - s_end) / 0.18
                    duck = min(duck, 0.58 + 0.42 * frac)
                else:
                    duck = min(duck, 0.58)

        # Warm stereo felt-pad chord with subtle L/R detune for wide studio soundstage
        chord = chords[act]
        act_env = min(1.0, act_t / 0.45) * min(1.0, max(0.0, (act_len - act_t) / 0.35))
        pad_l = 0.0
        pad_r = 0.0
        for k, freq in enumerate(chord):
            weight = 0.24 if k == 0 else (0.16 if k < 3 else 0.10)
            detune = 0.22 if k % 2 == 0 else -0.22
            # Soft breathing modulation
            breathe = 0.86 + 0.14 * math.sin(2.0 * math.pi * (0.28 + k * 0.07) * t)
            phase_l = 2.0 * math.pi * (freq + detune) * t
            phase_r = 2.0 * math.pi * (freq - detune) * t
            # Fundamental + gentle warm 2nd harmonic
            val_l = (math.sin(phase_l) + 0.18 * math.sin(2.0 * phase_l)) * weight * breathe
            val_r = (math.sin(phase_r) + 0.18 * math.sin(2.0 * phase_r)) * weight * breathe
            pad_l += val_l
            pad_r += val_r

        # Clean rhythmic Rhodes/pluck arpeggio pulse synced to 112 BPM (active during Acts 2-5)
        beat_idx = int(t / (beat_len * 0.5))  # eighth notes
        beat_phase = (t % (beat_len * 0.5))
        arp_amp = 0.0
        if 5.8 <= t <= 37.5:
            note_f = chord[(beat_idx * 2 + act) % len(chord)] * (2.0 if (beat_idx % 4 == 2) else 1.0)
            pluck_env = math.exp(-beat_phase * 11.5) * (1.0 - math.exp(-beat_phase * 180.0))
            accent = 1.0 if beat_idx % 4 == 0 else (0.65 if beat_idx % 2 == 0 else 0.38)
            arp_amp = math.sin(2.0 * math.pi * note_f * t) * pluck_env * accent * 0.105

        # Subtle kinetic sub-bass pulse on quarter notes
        q_phase = t % beat_len
        bass_f = bass_notes[act]
        bass_env = 0.55 + 0.45 * math.exp(-q_phase * 5.2)
        bass = math.sin(2.0 * math.pi * bass_f * t) * bass_env * act_env * 0.20

        # Stereo spread on arpeggio
        pan = 0.5 + 0.28 * math.sin(beat_idx * 1.1)
        sig_l = (pad_l * act_env * 0.42 + bass + arp_amp * (1.0 - pan)) * duck
        sig_r = (pad_r * act_env * 0.42 + bass + arp_amp * pan) * duck

        # Clean architectural low-end thump / transition air on every act cut
        for ct in sub_cut_times:
            dt = t - ct
            if 0.0 <= dt < 0.28:
                sweep_f = 125.0 * math.exp(-dt * 8.5) + 42.0
                hit = math.sin(2.0 * math.pi * sweep_f * dt) * math.exp(-dt * 12.0) * 0.26
                sig_l += hit
                sig_r += hit

        # Tactile macOS-style UI click SFX at exact layout/mode switch timestamps
        for ck in CLICK_TIMES:
            dt = t - ck
            if 0.0 <= dt < 0.022:
                click_env = math.exp(-dt * 280.0)
                click_sig = (
                    0.55 * math.sin(2.0 * math.pi * 1650.0 * dt)
                    + 0.45 * math.sin(2.0 * math.pi * 3400.0 * dt)
                ) * click_env * 0.22
                sig_l += click_sig
                sig_r += click_sig

        # Soft limiter & 16-bit PCM quantization
        out_l = math.tanh(sig_l * master_env * 0.92)
        out_r = math.tanh(sig_r * master_env * 0.92)
        buf.append(max(-32767, min(32767, int(out_l * 31000))))
        buf.append(max(-32767, min(32767, int(out_r * 31000))))

    with wave.open(str(output_wav), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(buf.tobytes())


def write_vtt(path: Path, timings: list[dict], key: str) -> None:
    lines = ['WEBVTT', '']
    for item in timings:
        lines.append(f"{format_vtt_time(item['start'])} --> {format_vtt_time(item['end'])}")
        lines.append(item[key])
        lines.append('')
    path.write_text('\n'.join(lines), encoding='utf-8')


def master_mix(score_wav: Path, timings: list[dict], output_m4a: Path) -> None:
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(score_wav)]
    filter_parts = ['[0:a]volume=0.88[bed]']
    mix_inputs = ['[bed]']

    for idx, item in enumerate(timings):
        cmd.extend(['-i', item['wav']])
        delay_ms = int(round(item['start'] * 1000))
        in_idx = idx + 1
        filter_parts.append(
            f"[{in_idx}:a]highpass=f=80,equalizer=f=3200:t=q:w=1.2:g=1.8,"
            f"acompressor=threshold=-20dB:ratio=2.8:attack=6:release=80,"
            f"volume=1.32,adelay={delay_ms}|{delay_ms}[v{idx}]"
        )
        mix_inputs.append(f"[v{idx}]")

    filter_parts.append(
        f"{''.join(mix_inputs)}amix=inputs={len(mix_inputs)}:duration=first:normalize=0,"
        f"loudnorm=I=-14:TP=-1.5:LRA=10,"
        f"atrim=0:{DURATION}[out]"
    )

    cmd.extend([
        '-filter_complex', ';'.join(filter_parts),
        '-map', '[out]',
        '-c:a', 'aac', '-b:a', '192k', '-ar', str(SAMPLE_RATE),
        str(output_m4a)
    ])
    subprocess.run(cmd, check=True)


async def main() -> None:
    timings = await generate_narration_clips()
    speech_windows = [(item['start'], item['end']) for item in timings]

    score_wav = OUT_DIR / 'launch-score.wav'
    print("Synthesizing stereo score & UI SFX...")
    synthesize_score_and_sfx(score_wav, speech_windows)

    master_m4a = LAUNCH_PUBLIC / 'master-audio.m4a'
    print("Mastering final broadcast mix ->", master_m4a)
    master_mix(score_wav, timings, master_m4a)

    write_vtt(WEBSITE_IMAGES / 'nova-tour.en.vtt', timings, 'en')
    write_vtt(WEBSITE_IMAGES / 'nova-tour.tr.vtt', timings, 'tr')
    (LAUNCH_PUBLIC / 'audio-timing.json').write_text(
        json.dumps(timings, indent=2, ensure_ascii=False), encoding='utf-8'
    )
    print(f"Done! Master duration: {probe_duration(master_m4a):.2f}s")


if __name__ == '__main__':
    asyncio.run(main())
