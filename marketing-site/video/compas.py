# Mide el pulso de una pista: periodo exacto del tiempo y fase del primer golpe, para cuadrar los cortes del vídeo.
# Uso: uv run --with numpy --with scipy python compas.py <pista.wav mono 22050> <bpm aproximado | auto>   →  JSON {beat, beat0, bar0, conf}
import sys, json
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

sr, x = wavfile.read(sys.argv[1])
x = x.astype(np.float64)
if x.ndim > 1:
    x = x.mean(1)
x /= np.max(np.abs(x)) + 1e-9
AUTO = sys.argv[2] == 'auto'
bpm0 = 90.0 if AUTO else float(sys.argv[2])
hop = 128


def env(sig):
    n = len(sig) // hop
    e = np.sqrt((sig[:n * hop].reshape(n, hop) ** 2).mean(1))
    d = np.maximum(0, np.diff(np.log(e + 1e-4), prepend=np.log(e[0] + 1e-4)))
    return d


full = env(x)
low = env(sosfilt(butter(4, 140, 'low', fs=sr, output='sos'), x))
fps = sr / hop
T = len(full) / fps


def score(e, period, phase):
    t = np.arange(phase, T, period)
    i = np.clip((t * fps).astype(int), 1, len(e) - 2)
    return (e[i - 1] + e[i] + e[i + 1]).mean()


best = (0, 0, 0)
def scan(lo, hi, step, dph):
    global best
    for bpm in np.arange(lo, hi + 1e-6, step):
        p = 60 / bpm
        for ph in np.arange(0, p, dph):
            s = score(full, p, ph) + score(low, p, ph)
            if s > best[0]:
                best = (s, p, ph)


if AUTO:  # sin tempo de partida: barrido grueso de 62 a 118 y luego fino alrededor del mejor
    scan(62, 118, .25, .012)
    bpm0 = 60 / best[1]
    best = (0, 0, 0)
scan(bpm0 - 1.0, bpm0 + 1.0, .02, .006)
s, p, ph = best
rnd = np.mean([score(full, p * 1.37, q) + score(low, p * 1.37, q) for q in np.arange(0, p, .05)])
bars = [score(low, p * 4, ph + k * p) for k in range(4)]
k = int(np.argmax(bars))
print(json.dumps({'beat': round(p, 5), 'bpm': round(60 / p, 2), 'beat0': round(ph, 3), 'bar0': round(ph + k * p, 3), 'conf': round(s / (rnd + 1e-9), 2), 'bars': [round(b, 3) for b in bars]}))
