"""Generate Apple-Keynote style English female narration (en-US-AvaNeural) + minimalist studio score & real UI SFX.

Uses edge-tts (en-US-AvaNeural), warm Rhodes/felt-piano harmonic pad, subtle macOS cursor click SFX,
and soft Magic Keyboard typing ticks at exact choreography timestamps, mastered via ffmpeg.
"""
import asyncio
import array
import json
import math
import random
import subprocess
import wave
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'video/out/promo-audio'
PUBLIC_DIR = ROOT / 'video/public'
OUT_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

DURATION = 36.0
SAMPLE_RATE = 44100

SCENE_CUTS = [0.0, 5.6, 11.8, 18.2, 25.0, 30.8]

# Exact timestamps (in seconds) where the macOS cursor clicks in the browser choreography
CLICK_TIMES = [
    2.40,   # Scene 1: Click search bar on New Tab
    6.85,   # Scene 2: Click 'Frontend Stack' workspace folder in vertical sidebar
    8.10,   # Scene 2: Trigger Cmd+K command bar
    10.65,  # Scene 2: Execute command from Spotlight
    12.65,  # Scene 3: Click Split View toggle in top bar
    15.40,  # Scene 3: Click hibernated tab pill
    19.10,  # Scene 4: Click 'AI' button in Nova toolbar
    20.25,  # Scene 4: Click send on Nova Assistant prompt
    25.95,  # Scene 5: Click Privacy Shield icon in toolbar
    28.10,  # Scene 5: Click Nova Sync verification toggle
    33.20,  # Scene 6: Click Download for macOS button
]

# Exact intervals (start_s, end_s, keys_per_sec) where live typing occurs in the UI
TYPE_WINDOWS = [
    (8.35, 10.40, 11.0),   # Scene 2: Typing in Cmd+K Spotlight bar
    (19.35, 20.15, 12.0),  # Scene 4: Typing prompt in Nova AI sidebar
]

SEGMENTS_EN = [
    (0.40, 5.00, "Meet Nova. A browser designed around focus, speed, and your own space."),
    (5.85, 5.75, "Organize your day with vertical tabs, isolated workspaces, and an instant command bar."),
    (12.05, 5.95, "Work side by side in Split View, while inactive tabs quietly hibernate to save memory."),
    (18.45, 6.30, "Ask Nova Assistant anything. Powered by WebGPU, local models run right on your device."),
    (25.25, 5.35, "Built-in protection blocks trackers automatically, and end-to-end encryption keeps your sync private."),
    (31.00, 4.80, "Free and open source for Mac, Windows, and Linux. Make room for Nova."),
]


def format_vtt_time(seconds: float) -> str:
    ms = round(max(0.0, seconds) * 1000)
    return f"{ms // 60000:02}:{ms // 1000 % 60:02}.{ms % 1000:03}"


def synthesize_apple_studio_score_and_ui_sfx(output_wav: Path) -> None:
    """Synthesize a minimalist Apple-Keynote warm felt-piano/synth score + tactile UI click & keystroke SFX."""
    total_samples = int(SAMPLE_RATE * DURATION)
    samples = array.array('h')

    # Warm Cupertino major-9th / 6th harmonic voicings
    chords = [
        (174.61, 220.00, 261.63, 329.63, 392.00),  # Scene 1: Fmaj9
        (130.81, 196.00, 246.94, 293.66, 329.63),  # Scene 2: Cmaj9
        (146.83, 220.00, 261.63, 329.63, 349.23),  # Scene 3: Dm9
        (110.00, 164.81, 220.00, 261.63, 329.63),  # Scene 4: Am9 (Pro Dark transition)
        (116.54, 174.61, 220.00, 261.63, 349.23),  # Scene 5: Bbmaj9
        (130.81, 196.00, 261.63, 329.63, 392.00),  # Scene 6: C6/9
    ]

    # Precompute discrete keystroke timestamps from TYPE_WINDOWS
    rng = random.Random(108)
    keystroke_times: list[float] = []
    for t_start, t_end, rate in TYPE_WINDOWS:
        cur = t_start
        while cur <= t_end:
            keystroke_times.append(cur)
            cur += (1.0 / rate) * rng.uniform(0.78, 1.22)

    for i in range(total_samples):
        t = i / SAMPLE_RATE

        # Active scene index & time within scene
        scene_idx = 0
        scene_start = 0.0
        for idx, cut in enumerate(SCENE_CUTS):
            if t >= cut:
                scene_idx = idx
                scene_start = cut
        chord = chords[scene_idx]
        dt_scene = t - scene_start

        # Global fade in / fade out
        master_env = min(1.0, t / 1.0) * min(1.0, (DURATION - t) / 1.6)

        # 1. Warm Apple-style felt electric piano chord bloom at the start of each scene + gentle sustain
        pad_l = 0.0
        pad_r = 0.0
        chord_attack = 1.0 - math.exp(-dt_scene * 6.0)
        chord_sustain = 0.55 + 0.45 * math.exp(-dt_scene * 0.45)
        chord_env = chord_attack * chord_sustain

        for idx_f, freq in enumerate(chord):
            # Subtle stereo chorus detune
            detune = 1.0 + (idx_f - 2.0) * 0.0012
            s_main = math.sin(2.0 * math.pi * freq * t)
            s_warm = math.sin(2.0 * math.pi * (freq * detune) * t + 0.35)
            # Soft Rhodes bell overtone that decays quickly after each chord change
            bell_env = math.exp(-dt_scene * 3.2)
            s_bell = math.sin(2.0 * math.pi * (freq * 2.0) * t) * 0.18 * bell_env

            pan_w = 0.35 + 0.15 * (idx_f / max(1, len(chord) - 1))
            voice_sig = (s_main * 0.018 + s_warm * 0.015 + s_bell * 0.012) * chord_env
            pad_l += voice_sig * pan_w
            pad_r += voice_sig * (1.0 - pan_w)

        # 2. Gentle slow pulse on the root bass note (warm sub-foundation, no harshness)
        root_freq = chord[0] * 0.5
        bass_sig = math.sin(2.0 * math.pi * root_freq * t) * 0.028 * chord_env
        pad_l += bass_sig
        pad_r += bass_sig

        # 3. Soft harmonic air shimmer at scene cuts
        sfx_l = 0.0
        sfx_r = 0.0
        if 0.0 <= dt_scene < 1.1:
            shimmer_env = (1.0 - math.exp(-dt_scene * 70.0)) * math.exp(-dt_scene * 4.5)
            shimmer = (
                math.sin(2.0 * math.pi * chord[-1] * 2.0 * dt_scene) * 0.012
                + math.sin(2.0 * math.pi * chord[-2] * 2.0 * dt_scene) * 0.009
            ) * shimmer_env
            sfx_l += shimmer * 0.9
            sfx_r += shimmer * 1.1

        # 4. Crisp macOS Pointer Click SFX
        for c_time in CLICK_TIMES:
            dtc = t - c_time
            if 0.0 <= dtc < 0.035:
                # Two-stage tactile micro-click (down-tap + release)
                click_env = math.exp(-dtc * 240.0)
                click_body = (
                    math.sin(2.0 * math.pi * 1850.0 * dtc) * 0.065
                    + math.sin(2.0 * math.pi * 720.0 * dtc) * 0.055
                ) * click_env
                sfx_l += click_body
                sfx_r += click_body

        # 5. Soft Apple Magic Keyboard Keystroke Ticks
        for k_time in keystroke_times:
            dtk = t - k_time
            if 0.0 <= dtk < 0.022:
                k_env = math.exp(-dtk * 340.0)
                k_tick = (
                    math.sin(2.0 * math.pi * 2400.0 * dtk) * 0.028
                    + math.sin(2.0 * math.pi * 1100.0 * dtk) * 0.024
                ) * k_env
                sfx_l += k_tick * 0.95
                sfx_r += k_tick * 1.05

        left = (pad_l + sfx_l) * master_env
        right = (pad_r + sfx_r) * master_env

        samples.extend((
            int(max(-1.0, min(1.0, left)) * 32767),
            int(max(-1.0, min(1.0, right)) * 32767),
        ))

    with wave.open(str(output_wav), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(samples.tobytes())


async def build_english_track(
    voice: str,
    rate: str,
    segments: list[tuple[float, float, str]],
    score_wav: Path,
    out_m4a: Path,
    voice_only_m4a: Path,
) -> list[str]:
    inputs: list[str] = []
    filters: list[str] = []
    vtt_lines = ["WEBVTT\n"]

    async def fetch_segment(idx: int, txt: str) -> None:
        raw_mp3 = OUT_DIR / f"en-ava-seg-{idx}-raw.mp3"
        seg_meta = OUT_DIR / f"en-ava-seg-{idx}.json"
        await edge_tts.Communicate(txt, voice, rate=rate, boundary="SentenceBoundary").save(
            str(raw_mp3), str(seg_meta)
        )

    await asyncio.gather(*(fetch_segment(i, text) for i, (_, _, text) in enumerate(segments)))

    for i, (start, window, text) in enumerate(segments):
        raw_mp3 = OUT_DIR / f"en-ava-seg-{i}-raw.mp3"
        seg_mp3 = OUT_DIR / f"en-ava-seg-{i}.mp3"
        subprocess.run(
            [
                "ffmpeg", "-nostdin", "-y", "-loglevel", "error",
                "-i", str(raw_mp3),
                "-af", "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.04:start_threshold=-45dB,areverse",
                str(seg_mp3),
            ],
            check=True,
            stdin=subprocess.DEVNULL,
        )
        info = json.loads(
            subprocess.check_output(
                [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(seg_mp3)
                ],
                stdin=subprocess.DEVNULL,
            )
        )
        dur = float(info["format"]["duration"])
        print(f"[EN-AVA] Scene {i + 1}: start={start:.2f}s, speech={dur:.2f}s / window={window:.2f}s", flush=True)
        if dur > window + 0.35:
            raise RuntimeError(f"[EN-AVA] Scene {i + 1} speech ({dur:.2f}s) exceeds window ({window:.2f}s)")

        end_time = min(DURATION, start + dur + 0.15)
        vtt_lines.append(f"{format_vtt_time(start)} --> {format_vtt_time(end_time)}\n{text}\n")

        inputs.extend(["-i", str(seg_mp3)])
        delay_ms = int(round(start * 1000))
        filters.append(
            f"[{i}:a]aresample=48000,highpass=f=80,treble=g=1.5:f=6500,"
            f"afade=t=in:st=0:d=0.02,adelay={delay_ms}:all=1[v{i}]"
        )

    voice_mix_inputs = "".join(f"[v{i}]" for i in range(len(segments)))
    filters.append(
        f"{voice_mix_inputs}amix=inputs={len(segments)}:normalize=0,"
        f"apad,atrim=duration={DURATION},loudnorm=I=-16:TP=-1.5:LRA=7[voice]"
    )

    subprocess.run(
        [
            "ffmpeg", "-nostdin", "-y", "-loglevel", "error", *inputs,
            "-filter_complex", ";".join(filters),
            "-map", "[voice]",
            "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
            str(voice_only_m4a),
        ],
        check=True,
        stdin=subprocess.DEVNULL,
    )

    subprocess.run(
        [
            "ffmpeg", "-nostdin", "-y", "-loglevel", "error",
            "-i", str(voice_only_m4a),
            "-i", str(score_wav),
            "-filter_complex",
            "[0:a]asplit=2[v_sc][v_out];"
            "[1:a]aresample=48000,volume=0.42[bg];"
            "[bg][v_sc]sidechaincompress=threshold=0.025:ratio=3.5:attack=20:release=320[bg_ducked];"
            "[v_out][bg_ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,"
            "alimiter=limit=0.95[master]",
            "-map", "[master]",
            "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
            str(out_m4a),
        ],
        check=True,
        stdin=subprocess.DEVNULL,
    )

    return vtt_lines


async def main() -> None:
    score_wav = PUBLIC_DIR / "promo-score.wav"
    print("Synthesizing Apple Keynote studio score & UI interaction SFX...", flush=True)
    synthesize_apple_studio_score_and_ui_sfx(score_wav)

    wt_dir = PUBLIC_DIR / "website-tour"
    wt_dir.mkdir(parents=True, exist_ok=True)
    (wt_dir / "score.wav").write_bytes(score_wav.read_bytes())

    en_master = PUBLIC_DIR / "promo-master-en.m4a"
    tr_master = PUBLIC_DIR / "promo-master-tr.m4a"
    en_voice = OUT_DIR / "voice-en.m4a"

    vtt_en = await build_english_track(
        voice="en-US-AvaNeural",
        rate="+0%",
        segments=SEGMENTS_EN,
        score_wav=score_wav,
        out_m4a=en_master,
        voice_only_m4a=en_voice,
    )

    # Set English track as primary master for all targets
    tr_master.write_bytes(en_master.read_bytes())
    (wt_dir / "narration.m4a").write_bytes(en_voice.read_bytes())
    (ROOT / "website/public/images/nova-tour.en.vtt").write_text("\n".join(vtt_en), encoding="utf-8")
    (ROOT / "website/public/images/nova-tour.tr.vtt").write_text("\n".join(vtt_en), encoding="utf-8")
    print("Apple Keynote English audio mastering complete:", en_master, flush=True)


if __name__ == "__main__":
    asyncio.run(main())
