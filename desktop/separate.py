#!/usr/bin/env python3
"""Private desktop AI stem processing for Little Keys Studio.

Usage:
 python desktop/separate.py input.mp4 --output my-samples
Requires FFmpeg and Demucs: python -m pip install demucs
Downloads pretrained model weights on first run; files never leave the computer.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

def run(*args):
    print("+", " ".join(map(str,args)),flush=True)
    subprocess.run(list(map(str,args)),check=True)

def process(input_file,output,model="htdemucs",piano_stem=False):
    src=Path(input_file).expanduser().resolve()
    if not src.is_file():
        raise FileNotFoundError(src)
    output=Path(output).expanduser().resolve()
    output.mkdir(parents=True,exist_ok=True)
    if not shutil.which("ffmpeg"):
        raise RuntimeError("FFmpeg is required (install from ffmpeg.org)")
    clean_input=output/"original_audio.wav"
    run("ffmpeg","-hide_banner","-loglevel","error","-y","-i",src,"-vn","-ac","2","-ar","44100","-c:a","pcm_s16le",clean_input)
    temp=output/"ai_stems"
    cmd=[sys.executable,"-m","demucs","-n","htdemucs_6s" if piano_stem else model,"-o",str(temp)]
    if not piano_stem:cmd+=["--two-stems","vocals"]
    cmd.append(str(clean_input))
    run(*cmd)
    folder=temp/("htdemucs_6s" if piano_stem else model)/clean_input.stem
    if not folder.is_dir():
        raise RuntimeError("Demucs finished without the expected stem directory")
    files={"original":clean_input.name}
    for stem,name in [("vocals.wav","family_voices.wav"),("no_vocals.wav","piano_without_voices.wav"),("piano.wav","piano_stem.wav")]:
        candidate=folder/stem
        if candidate.is_file():
            target=output/name
            shutil.copyfile(candidate,target)
            files[stem.removesuffix(".wav")]=name
    if not ("no_vocals" in files or "piano" in files):
        raise RuntimeError("Demucs produced no instrumental or piano stem")
    for name in ["piano_without_voices.wav","piano_stem.wav"]:
        f=output/name
        if f.exists():
            run("ffmpeg","-hide_banner","-loglevel","error","-y","-i",f,"-codec:a","libmp3lame","-q:a","2",f.with_suffix(".mp3"))
    metadata={"original_filename":src.name,"model":"htdemucs_6s" if piano_stem else model,"files":files,"notice":"AI estimates can remove or distort piano notes when speech overlaps. Compare against the untouched recording."}
    (output/"manifest.json").write_text(json.dumps(metadata,indent=2),encoding="utf8")
    print("\nDone. Import the generated WAVs into Little Keys Studio.",flush=True)
    return metadata

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("input",help="MP4, MOV, MP3, WAV, or other FFmpeg-readable recording")
    p.add_argument("--output","-o",default="little-keys-output")
    p.add_argument("--model",default="htdemucs")
    p.add_argument("--piano-stem",action="store_true",help="Use 6-stem model to estimate a piano-only track (more resource-intensive)")
    a=p.parse_args()
    try:process(a.input,a.output,a.model,a.piano_stem)
    except (FileNotFoundError,RuntimeError,subprocess.CalledProcessError) as e:
        print("Failed:",e,file=sys.stderr)
        sys.exit(1)
