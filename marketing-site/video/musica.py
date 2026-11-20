# Música de fondo sintetizada para el vídeo de Criterio: colchón cálido, piano eléctrico suave y bajo. Sin samples ni licencias.
# Uso: uv run --with numpy --with scipy python musica.py <salida.wav> <duración> <t de la transición> <t del cierre>
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

OUT, DUR, R, TH = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
SR = 48000
N = int(SR * (DUR + .5))
rng = np.random.default_rng(11)
L = np.zeros(N)
Rr = np.zeros(N)
BPM = 76
BEAT = 60 / BPM
BAR = BEAT * 4


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def lp(x, f):
    return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)


def hp(x, f):
    return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)


def place(sig, at, gain=1.0, pan=0.0):
    i = int(max(0, at) * SR)
    j = min(N, i + len(sig))
    if j <= i:
        return
    L[i:j] += sig[:j - i] * gain * (1 - max(0, pan))
    Rr[i:j] += sig[:j - i] * gain * (1 + min(0, pan))


def pad(notes, dur):
    n = int((dur + 2.2) * SR)
    t = np.arange(n) / SR
    o = np.zeros(n)
    for m in notes:
        f = hz(m)
        wob = 1 + .0016 * np.sin(2 * np.pi * .23 * t + rng.uniform(0, 6))
        ph = 2 * np.pi * np.cumsum(f * wob) / SR
        o += np.sin(ph) + .5 * np.sin(ph * 1.004 + 1) + .16 * np.sin(2 * ph) + .05 * np.sin(3 * ph)
    env = np.minimum(1, t / 1.1) * np.minimum(1, np.maximum(0, (dur + 2.2 - t) / 2.0))
    return lp(o, 1500) * env / len(notes)


def keys(m, vel=1.0, dec=1.5):
    n = int(dec * 2.4 * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t + .9 * np.exp(-t * 7) * np.sin(2 * np.pi * f * 2 * t)) + .22 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)
    return s * np.exp(-t / dec) * np.minimum(1, t / .006) * vel


def bass(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 2.5)
    return s * np.minimum(1, t / .03) * np.exp(-t / (dur * .55))


# Re mayor, cuatro compases que giran: Dmaj9 · Bm9 · Gmaj9 · A6/9
CH = [([50, 57, 61, 64, 66], 38, [62, 66, 69, 73, 76]), ([47, 54, 57, 61, 62], 35, [62, 66, 69, 71, 74]),
      ([43, 50, 54, 57, 59], 31, [62, 66, 67, 71, 74]), ([45, 52, 54, 59, 61], 33, [61, 64, 66, 69, 73])]
bars = int(np.ceil(TH / BAR)) + 1
for b in range(bars):
    t0 = b * BAR
    if t0 >= TH - .3:
        break
    notes, root, arp = CH[b % 4]
    place(pad(notes, BAR), t0 - .35, .22)
    if t0 > R - .2:  # el bajo y el piano entran con el producto
        place(bass(root, BAR * .95), t0, .30)
        pat = [0, 2, 4, 3, 1, 4, 2, 3] if b % 2 == 0 else [1, 3, 4, 2, 0, 3, 4, 1]
        for k, a in enumerate(pat):
            if rng.random() < (.28 if k % 2 else .1):
                continue
            tt = t0 + k * BEAT / 2 + rng.normal(0, .006)
            v = (.105 if k % 2 == 0 else .07) * rng.uniform(.75, 1.05)
            note = keys(arp[a], v, 1.3)
            pan = rng.uniform(-.35, .35)
            place(note, tt, 1, pan)
            place(note, tt + BEAT * .75, .3, -pan)  # eco
# entrada: dos notas de píxel cuando aparece Tino
for k, (m, at) in enumerate([(81, .22), (88, .34)]):
    n = int(.22 * SR)
    t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * hz(m) * t)) * np.exp(-t * 22)
    place(lp(s, 3200), at, .05)
# transición: aire que sube y un golpe blando cuando el visor ya es la ventana
n = int(1.05 * SR)
t = np.arange(n) / SR
ns = rng.normal(0, 1, n)
sw = np.zeros(n)
for k in range(8):
    a, b_ = k * n // 8, (k + 1) * n // 8
    sw[a:b_] = lp(hp(ns, 250 + 260 * k), 900 + 700 * k)[a:b_]
place(sw * (t / 1.05) ** 2.2 * np.minimum(1, (1.05 - t) / .05), R - .1, .09)
n = int(.7 * SR)
t = np.arange(n) / SR
place(np.sin(2 * np.pi * np.cumsum(52 + 60 * np.exp(-t * 26)) / SR) * np.exp(-t * 6), R + .93, .34)
# cierre: el acorde de casa, largo, y una nota arriba
place(pad([50, 57, 61, 64, 66, 69], max(2.5, DUR - TH)), TH - .2, .3)
place(bass(38, 3.5), TH + .05, .32)
for k, m in enumerate([66, 69, 73, 78]):
    place(keys(m, .1, 2.2), TH + .3 + k * .16, 1, (-.3, .3, -.15, .15)[k])
st = np.stack([L, Rr], 1)[:int(SR * DUR)]
st = sosfilt(butter(2, 7000, 'low', fs=SR, output='sos'), st, axis=0)
f = int(.25 * SR)
st[:f] *= np.linspace(0, 1, f)[:, None]
g = int(1.6 * SR)
st[-g:] *= np.linspace(1, 0, g)[:, None] ** 1.5
st = st / np.max(np.abs(st)) * .7
wavfile.write(OUT, SR, (st * 32767).astype(np.int16))
print('musica', round(DUR, 2), 's', bars, 'compases')
