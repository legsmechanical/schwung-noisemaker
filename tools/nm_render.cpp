/* Off-device render + analysis harness.
 *
 *   g++ -O2 -std=c++14 -fpermissive -Wno-write-strings -Isrc/dsp -Isrc/dsp/Engine \
 *       tools/nm_render.cpp src/dsp/Engine/Lfo.cpp -o build/nm_render
 *
 *   build/nm_render --preset 38            --wav out.wav
 *   build/nm_render --state patch.json     --wav out.wav --notes 40,47,52 --hold 1.5
 *   build/nm_render --state patch.json     --analyze
 *
 * Drives the REAL plugin entry points (create / set_param("state") / on_midi /
 * render_block), so what it renders is what the device plays — including the
 * state-restore path, which is where authored presets actually live or die.
 *
 * --analyze prints objective numbers rather than opinions: peak, RMS, whether
 * anything sounded at all, the amp envelope's measured attack/decay/release,
 * spectral centroid (brightness) and stereo width. Enough to catch a silent,
 * clipping, dull or accidentally-mono patch before anyone has to listen.
 */
#include "../src/dsp/noisemaker_plugin.cpp"

#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <cmath>
#include <string>
#include <vector>

static const int SR = MOVE_SAMPLE_RATE, BS = MOVE_FRAMES_PER_BLOCK;

static void renderSeconds(void *inst, std::vector<int16_t> &out, double secs) {
    int blocks = (int)(secs * SR / BS);
    int16_t buf[BS * 2];
    for (int b = 0; b < blocks; b++) {
        memset(buf, 0, sizeof(buf));
        v2_render_block(inst, buf, BS);
        out.insert(out.end(), buf, buf + BS * 2);
    }
}

static void noteOn(void *inst, int note, int vel) {
    uint8_t m[3] = { 0x90, (uint8_t)note, (uint8_t)vel };
    v2_on_midi(inst, m, 3, 0);
}
static void noteOff(void *inst, int note) {
    uint8_t m[3] = { 0x80, (uint8_t)note, 0 };
    v2_on_midi(inst, m, 3, 0);
}

static bool writeWav(const char *path, const std::vector<int16_t> &s) {
    FILE *f = fopen(path, "wb");
    if (!f) return false;
    const uint32_t dataBytes = (uint32_t)(s.size() * 2);
    const uint32_t byteRate = SR * 2 * 2;
    fwrite("RIFF", 1, 4, f);
    uint32_t riff = 36 + dataBytes; fwrite(&riff, 4, 1, f);
    fwrite("WAVEfmt ", 1, 8, f);
    uint32_t fmtLen = 16; fwrite(&fmtLen, 4, 1, f);
    uint16_t fmt = 1, ch = 2, bits = 16, align = 4; uint32_t rate = SR;
    fwrite(&fmt, 2, 1, f); fwrite(&ch, 2, 1, f); fwrite(&rate, 4, 1, f);
    fwrite(&byteRate, 4, 1, f); fwrite(&align, 2, 1, f); fwrite(&bits, 2, 1, f);
    fwrite("data", 1, 4, f); fwrite(&dataBytes, 4, 1, f);
    fwrite(s.data(), 2, s.size(), f);
    fclose(f);
    return true;
}

/* Spectral centroid + high-frequency energy share, over the LOUDEST window of
 * the render.
 *
 * The previous version of this was blind in both axes and quietly reported
 * "0 Hz (dark)" for most of the bank:
 *   - it analysed a fixed point halfway through the hold, which for any
 *     plucked patch (aenv_s = 0) is silence -- so `den` underflowed and it
 *     returned 0, which reads as "very dark" rather than "measured nothing";
 *   - its highest bin was k=510 of a 4096-point transform = ~2.7 kHz, so
 *     everything that actually distinguishes bright from dull was above its
 *     ceiling and it could not have ranked brightness even on a sustained note.
 * Both faults push the answer the same way -- toward "dark" -- which is exactly
 * the kind of metric that confirms whatever you already suspected.
 *
 * Now: find the highest-energy N-sample window anywhere in the render, Hann it,
 * and take a full radix-2 FFT to Nyquist. Returns the centroid in Hz and, via
 * hfShare, the fraction of magnitude above 2 kHz (which is what "sparkle"
 * actually means here, and is far less sensitive to the fundamental than the
 * centroid is). Returns 0 only when the render is genuinely silent. */
static void fftRadix2(std::vector<double> &re, std::vector<double> &im) {
    const size_t n = re.size();
    for (size_t i = 1, j = 0; i < n; i++) {         // bit-reversal permutation
        size_t bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { std::swap(re[i], re[j]); std::swap(im[i], im[j]); }
    }
    for (size_t len = 2; len <= n; len <<= 1) {
        double ang = -2.0 * M_PI / (double)len;
        double wr = cos(ang), wi = sin(ang);
        for (size_t i = 0; i < n; i += len) {
            double cr = 1, ci = 0;
            for (size_t k = 0; k < len / 2; k++) {
                double ur = re[i + k],           ui = im[i + k];
                double vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
                double vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
                re[i + k] = ur + vr;             im[i + k] = ui + vi;
                re[i + k + len / 2] = ur - vr;   im[i + k + len / 2] = ui - vi;
                double ncr = cr * wr - ci * wi;
                ci = cr * wi + ci * wr;          cr = ncr;
            }
        }
    }
}

static double spectralCentroid(const std::vector<int16_t> &s, double *hfShare) {
    const int N = 4096;
    const size_t frames = s.size() / 2;
    if (hfShare) *hfShare = 0.0;
    if (frames < (size_t)N) return 0.0;

    /* Loudest window, hopped by N/2 -- no assumption about where the sound is. */
    size_t best = 0; double bestE = -1;
    for (size_t off = 0; off + N <= frames; off += N / 2) {
        double e = 0;
        for (int n = 0; n < N; n++) { double x = s[(off + n) * 2] / 32768.0; e += x * x; }
        if (e > bestE) { bestE = e; best = off; }
    }
    if (bestE <= 1e-12) return 0.0;                 // genuinely silent

    std::vector<double> re(N), im(N, 0.0);
    for (int n = 0; n < N; n++) {
        double w = 0.5 - 0.5 * cos(2.0 * M_PI * n / (N - 1));   // Hann
        re[n] = (s[(best + n) * 2] / 32768.0) * w;
    }
    fftRadix2(re, im);

    double num = 0, den = 0, hf = 0;
    for (int k = 1; k < N / 2; k++) {               // skip DC
        double f = (double)k * SR / N;
        double mag = sqrt(re[k] * re[k] + im[k] * im[k]);
        num += f * mag; den += mag;
        if (f >= 2000.0) hf += mag;
    }
    if (den <= 1e-12) return 0.0;
    if (hfShare) *hfShare = hf / den;
    return num / den;
}

int main(int argc, char **argv) {
    const char *statePath = NULL, *wavPath = NULL;
    int presetIdx = -1;
    bool analyze = false;
    double hold = 1.2, tail = 1.8;
    std::vector<int> notes;
    std::vector<std::string> sets;   /* --set key=val, applied AFTER the state
                                      * loads: the live knob-turn path, which
                                      * is not the same code path as state
                                      * restore and must be tested separately */

    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--state") && i + 1 < argc) statePath = argv[++i];
        else if (!strcmp(argv[i], "--preset") && i + 1 < argc) presetIdx = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--wav") && i + 1 < argc) wavPath = argv[++i];
        else if (!strcmp(argv[i], "--analyze")) analyze = true;
        else if (!strcmp(argv[i], "--hold") && i + 1 < argc) hold = atof(argv[++i]);
        else if (!strcmp(argv[i], "--tail") && i + 1 < argc) tail = atof(argv[++i]);
        else if (!strcmp(argv[i], "--set") && i + 1 < argc) { sets.push_back(argv[++i]); }
        else if (!strcmp(argv[i], "--notes") && i + 1 < argc) {
            char *t = strtok(argv[++i], ",");
            while (t) { notes.push_back(atoi(t)); t = strtok(NULL, ","); }
        }
    }
    if (notes.empty()) notes.push_back(48);

    void *inst = v2_create_instance(".", NULL);
    if (!inst) { fprintf(stderr, "create failed\n"); return 1; }

    if (statePath) {
        FILE *f = fopen(statePath, "rb");
        if (!f) { fprintf(stderr, "cannot open %s\n", statePath); return 1; }
        std::string js; char buf[4096]; size_t n;
        while ((n = fread(buf, 1, sizeof(buf), f)) > 0) js.append(buf, n);
        fclose(f);
        /* Accept either a bare state dict or the wrapped module-preset form. */
        size_t sp = js.find("\"state\"");
        if (sp != std::string::npos) {
            size_t b = js.find('{', sp);
            int depth = 0; size_t e = b;
            for (; e < js.size(); e++) {
                if (js[e] == '{') depth++;
                else if (js[e] == '}' && --depth == 0) break;
            }
            js = js.substr(b, e - b + 1);
        }
        v2_set_param(inst, "state", js.c_str());
    } else if (presetIdx >= 0) {
        char v[16]; snprintf(v, sizeof(v), "%d", presetIdx);
        v2_set_param(inst, "preset", v);
    }

    for (size_t i = 0; i < sets.size(); i++) {
        size_t eq = sets[i].find('=');
        if (eq == std::string::npos) continue;
        std::string k = sets[i].substr(0, eq), v = sets[i].substr(eq + 1);
        v2_set_param(inst, k.c_str(), v.c_str());
        char rb[64]; v2_get_param(inst, k.c_str(), rb, sizeof rb);
        fprintf(stderr, "  set %s=%s  readback=%s\n", k.c_str(), v.c_str(), rb);
    }

    std::vector<int16_t> out;
    renderSeconds(inst, out, 0.05);                 // settle
    size_t onAt = out.size() / 2;
    for (size_t i = 0; i < notes.size(); i++) noteOn(inst, notes[i], 100);
    renderSeconds(inst, out, hold);
    size_t offAt = out.size() / 2;
    for (size_t i = 0; i < notes.size(); i++) noteOff(inst, notes[i]);
    renderSeconds(inst, out, tail);

    if (wavPath && !writeWav(wavPath, out)) { fprintf(stderr, "wav write failed\n"); return 1; }

    if (analyze) {
        double peak = 0, sum = 0; long cnt = 0;
        double peakL = 0, peakR = 0, sumDiff = 0;
        for (size_t i = 0; i < out.size(); i += 2) {
            double l = out[i] / 32768.0, r = out[i + 1] / 32768.0;
            double a = fabs(l) > fabs(r) ? fabs(l) : fabs(r);
            if (a > peak) peak = a;
            if (fabs(l) > peakL) peakL = fabs(l);
            if (fabs(r) > peakR) peakR = fabs(r);
            sumDiff += fabs(l - r);
            sum += l * l + r * r; cnt += 2;
        }
        double rms = sqrt(sum / (cnt ? cnt : 1));

        /* Amp envelope, measured off the rendered signal in 5 ms windows. */
        const int WIN = SR / 200;
        std::vector<double> env;
        for (size_t i = 0; i + WIN * 2 < out.size(); i += WIN * 2) {
            double m = 0;
            for (int j = 0; j < WIN * 2; j += 2) { double a = fabs(out[i + j] / 32768.0); if (a > m) m = a; }
            env.push_back(m);
        }
        double emax = 0; size_t epk = 0;
        for (size_t i = 0; i < env.size(); i++) if (env[i] > emax) { emax = env[i]; epk = i; }
        double atkMs = 0, relMs = 0;
        if (emax > 1e-5) {
            for (size_t i = onAt / WIN; i < env.size(); i++)
                if (env[i] >= 0.9 * emax) { atkMs = (i - onAt / (double)WIN) * 5.0; break; }
            double atOff = env[std::min(env.size() - 1, offAt / (size_t)WIN)];
            for (size_t i = offAt / WIN; i < env.size(); i++)
                if (env[i] <= 0.1 * atOff) { relMs = (i - offAt / (double)WIN) * 5.0; break; }
        }

        double hfShare = 0;
        double cen = spectralCentroid(out, &hfShare);
        double width = sumDiff / (cnt / 2.0);

        printf("peak      %.3f  (%.1f dBFS)%s\n", peak, 20 * log10(peak > 1e-9 ? peak : 1e-9),
               peak >= 0.999 ? "   ** CLIPPING **" : "");
        printf("rms       %.4f (%.1f dBFS)\n", rms, 20 * log10(rms > 1e-9 ? rms : 1e-9));
        printf("audible   %s\n", peak > 0.005 ? "yes" : "NO -- SILENT");
        printf("attack    %.0f ms   release %.0f ms\n", atkMs, relMs);
        printf("centroid  %.0f Hz   %s\n", cen, cen < 400 ? "(dark)" : cen < 1500 ? "(mid)" : "(bright)");
        printf("hf>2k     %.3f  %s\n", hfShare,
               hfShare < 0.05 ? "(no sparkle)" : hfShare < 0.15 ? "(some)" : "(bright top)");
        printf("width     %.4f %s\n", width, width < 0.001 ? "(MONO)" : "(stereo)");
    }

    v2_destroy_instance(inst);
    return 0;
}
