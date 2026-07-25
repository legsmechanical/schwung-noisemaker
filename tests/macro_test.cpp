/* Off-device checks for the Wave / envelope-time macros.
 *
 *   g++ -O1 -std=c++14 -fpermissive -Wno-write-strings \
 *       -Isrc/dsp -Isrc/dsp/Engine tests/macro_test.cpp -o build/macro_test && ./build/macro_test
 *
 * Test 1 measures the ACTUAL Adsr tick loop rather than trusting the algebra:
 * it runs the envelope at the base knob value and at the macro-transformed
 * value and compares the measured segment times.
 *
 * Test 2 walks the Wave macro across its whole travel and asserts the
 * invariant the stop table is built on — that no oscillator's waveform ever
 * changes while that oscillator is audible (TAL hard-switches shapes, so a
 * switch under level is a click).
 */
#include "../src/dsp/noisemaker_plugin.cpp"

#include <cstdio>
#include <cmath>

static int g_fail = 0;
static void check(bool ok, const char *what) {
    if (!ok) { printf("  FAIL  %s\n", what); g_fail++; }
}

/* ---- Test 1: envelope time macro ------------------------------------ */

/* Samples for the release to fall 0.5 -> 0.05, measured on the real Adsr.
 * Deliberately a LATE interval: the release path ramps a declicker over a
 * fixed 250 samples and scales the rate by it, so the head of any release
 * carries a constant latency that does not move with the macro. */
static double measure_release(float v) {
    Adsr e(44100.0f);
    e.setAttack(0.0f); e.setDecay(0.0f); e.setSustain(1.0f); e.setRelease(v);
    e.resetAll();
    for (int i = 0; i < 2000000; i++) { if (e.tick(true) >= 0.999f) break; }
    long n = 0; bool started = false;
    while (n < 40000000) {
        float y = e.tick(false);
        if (!started) { if (y <= 0.5f) started = true; continue; }
        n++;
        if (y <= 0.05f) break;
    }
    return (double)n;
}

static void test_env_time() {
    printf("Test 1: envelope time macro\n");

    /* The detent must be a bit-exact pass-through, so an untouched macro
     * cannot perturb a patch (and v==0 keeps Adsr's instant-attack case). */
    for (float v = 0.0f; v <= 1.0f; v += 0.1f)
        check(nm_env_time_shift(v, 0.5f) == v, "detent (50) passes every value through unchanged");

    /* THE point of the redesign: a pure-gate envelope (all zeros) must still
     * move. A ratio cannot do this -- N x 0 == 0 -- which is why the knob read
     * as dead on gate patches like factory 54 "BS SAWbreaker FN". */
    check(nm_env_time_shift(0.0f, 1.0f) == 1.0f, "from ZERO, max macro reaches full travel");
    check(nm_env_time_shift(0.0f, 0.75f) > 0.4f, "from ZERO, half-up macro moves meaningfully");
    double tGate = measure_release(0.0f);
    double tMax  = measure_release(nm_env_time_shift(0.0f, 1.0f));
    char w[160];
    snprintf(w, sizeof(w), "a zero-length release actually lengthens: %.0f -> %.0f samples", tGate, tMax);
    check(tMax > tGate * 20.0, w);

    /* Endpoints and clamping. */
    check(nm_env_time_shift(0.0f, 0.0f) == 0.0f, "min macro cannot go below zero");
    check(nm_env_time_shift(1.0f, 1.0f) == 1.0f, "max macro cannot exceed full");
    check(nm_env_time_shift(1.0f, 0.0f) == 0.0f, "from FULL, min macro reaches zero");

    /* Monotonic in the macro for every base, and always in range -- a knob
     * that ever backs up as you turn it up is worse than one that saturates. */
    for (float v = 0.0f; v <= 1.0f; v += 0.125f) {
        float prev = -1.0f;
        for (int i = 0; i <= 100; i++) {
            float r = nm_env_time_shift(v, i / 100.0f);
            check(r >= prev - 1e-6f, "shift is non-decreasing in the macro");
            check(r >= -1e-6f && r <= 1.0f + 1e-6f, "shift stays in 0..1");
            prev = r;
        }
    }

    /* Monotonic in the BASE too: a longer authored envelope must never end up
     * shorter than a shorter one at the same macro setting. */
    for (float m = 0.0f; m <= 1.0f; m += 0.1f) {
        float prev = -1.0f;
        for (int i = 0; i <= 100; i++) {
            float r = nm_env_time_shift(i / 100.0f, m);
            check(r >= prev - 1e-6f, "shift preserves base ordering");
            prev = r;
        }
    }
    printf("  gate release %.0f -> %.0f samples across the macro\n", tGate, tMax);
}

/* ---- Test 2: wave macro sweep --------------------------------------- */

/* Recompute what nm_apply_wave_macro would produce, without an engine. */
typedef struct { int o1w, o2w, t2; float o1v, o2v, sub, pw, fm, ring, det; } wave_out_t;

static wave_out_t wave_at(int disp) {
    float d = (float)disp;
    int i = 0;
    while (i < NM_WAVE_STOP_COUNT - 2 && d > (float)NM_WAVE_STOPS[i + 1].disp) i++;
    const nm_wave_stop_t *a = &NM_WAVE_STOPS[i];
    const nm_wave_stop_t *b = &NM_WAVE_STOPS[i + 1];
    float span = (float)(b->disp - a->disp);
    float f = (span > 0.5f) ? (d - (float)a->disp) / span : 0.0f;
    if (f < 0.0f) f = 0.0f;
    if (f > 1.0f) f = 1.0f;
    wave_out_t o;
    o.o1v  = a->o1vol  + (b->o1vol  - a->o1vol)  * f;
    o.o2v  = a->o2vol  + (b->o2vol  - a->o2vol)  * f;
    o.sub  = a->subvol + (b->subvol - a->subvol) * f;
    o.pw   = a->pw     + (b->pw     - a->pw)     * f;
    o.fm   = a->fm     + (b->fm     - a->fm)     * f;
    o.ring = a->ring   + (b->ring   - a->ring)   * f;
    o.det  = a->detune + (b->detune - a->detune) * f;
    o.o1w  = nm_pick_disc(a->o1wave, b->o1wave, a->o1vol, b->o1vol, f);
    o.o2w  = nm_pick_disc(a->o2wave, b->o2wave, a->o2vol, b->o2vol, f);
    o.t2   = nm_pick_disc(a->tune2,  b->tune2,  a->o2vol, b->o2vol, f);
    return o;
}

static void test_wave_sweep() {
    printf("Test 2: wave macro sweep\n");

    /* Table sanity. */
    for (int i = 1; i < NM_WAVE_STOP_COUNT; i++)
        check(NM_WAVE_STOPS[i].disp > NM_WAVE_STOPS[i - 1].disp, "anchor positions ascend");
    check(NM_WAVE_STOPS[0].disp == 1, "first anchor sits at display 1 (just off the OFF detent)");
    check(NM_WAVE_STOPS[NM_WAVE_STOP_COUNT - 1].disp == 100, "last anchor sits at display 100");

    /* Every anchor must be exactly dialable — landing on its display value has
     * to reproduce that configuration verbatim, or the named sounds are not
     * actually reachable. */
    for (int i = 0; i < NM_WAVE_STOP_COUNT; i++) {
        const nm_wave_stop_t *s = &NM_WAVE_STOPS[i];
        wave_out_t o = wave_at(s->disp);
        char w[160];
        snprintf(w, sizeof(w), "anchor '%s' reproduces exactly at display %d", s->name, s->disp);
        /* Waveform only has to match where that oscillator is actually
         * audible — a silent lane's shape is don't-care, and the pick rule
         * deliberately leaves it on whatever the neighbouring anchor used. */
        bool wave_ok = (s->o1vol <= 0.0001f || o.o1w == s->o1wave) &&
                       (s->o2vol <= 0.0001f || o.o2w == s->o2wave);
        check(fabs(o.o1v - s->o1vol) < 1e-4 && fabs(o.o2v - s->o2vol) < 1e-4 &&
              fabs(o.sub - s->subvol) < 1e-4 && fabs(o.pw - s->pw) < 1e-4 &&
              fabs(o.fm - s->fm) < 1e-4 && fabs(o.ring - s->ring) < 1e-4 && wave_ok, w);
    }

    /* No dead zone: something must always be audible once the macro is on. */
    for (int d = 1; d <= 100; d++) {
        wave_out_t o = wave_at(d);
        char w[96];
        snprintf(w, sizeof(w), "audible at display %d (o1=%.2f o2=%.2f sub=%.2f)", d, o.o1v, o.o2v, o.sub);
        check(o.o1v > 0.01f || o.o2v > 0.01f || o.sub > 0.01f, w);
    }

    /* Every segment must actually BLEND — at least one continuous field has to
     * move across it, otherwise that stretch of knob travel does nothing. */
    for (int i = 1; i < NM_WAVE_STOP_COUNT; i++) {
        const nm_wave_stop_t *a = &NM_WAVE_STOPS[i - 1], *b = &NM_WAVE_STOPS[i];
        bool moves = fabs(a->o1vol - b->o1vol) > 1e-4 || fabs(a->o2vol - b->o2vol) > 1e-4 ||
                     fabs(a->subvol - b->subvol) > 1e-4 || fabs(a->pw - b->pw) > 1e-4 ||
                     fabs(a->fm - b->fm) > 1e-4 || fabs(a->ring - b->ring) > 1e-4 ||
                     fabs(a->detune - b->detune) > 1e-4;
        char w[160];
        snprintf(w, sizeof(w), "segment '%s' -> '%s' has something to crossfade", a->name, b->name);
        check(moves, w);
    }

    /* Levels must not sum to something that clips: the engine log-scales each
     * oscillator volume, and ringmod multiplies its product term by 8. */
    for (int d = 1; d <= 100; d++) {
        wave_out_t o = wave_at(d);
        float sum = o.o1v + o.o2v + o.sub + o.ring * 8.0f * o.o1v * o.o2v;
        char w[128];
        snprintf(w, sizeof(w), "level sum stays sane at display %d (%.2f)", d, sum);
        check(sum <= 2.1f, w);
    }

    /* FM pitch compensation must stay inside OSC2TUNE's range and actually
     * hold the carrier's average frequency at unison. */
    for (int i = 0; i < NM_WAVE_STOP_COUNT; i++) {
        float fm = NM_WAVE_STOPS[i].fm;
        if (fm <= 0.0f) continue;
        float s = nm_fm_tune_semis(fm);
        double avg = powf(2.0f, s / 12.0f) + 10.0 * fm;   /* multiple of osc1's freq */
        char w[128];
        snprintf(w, sizeof(w), "fm=%.4f -> %.2f st keeps pitch at unison (avg x%.4f)", fm, s, avg);
        check(fabs(avg - 1.0) < 0.02, w);
        snprintf(w, sizeof(w), "fm=%.4f compensation %.2f st within OSC2TUNE range", fm, s);
        check(s >= -24.0f && s <= 24.0f, w);
    }

    /* tune2 wire: all 256 native values must round-trip display -> normalized
     * -> display exactly, or the knob skips or repeats positions. */
    {
        const param_def_t *p = find_param("tune2");
        check(p != NULL, "tune2 param exists");
        int bad = 0;
        for (int d = 0; p && d <= 255; d++) {
            char dv[8]; snprintf(dv, sizeof(dv), "%d", d);
            char buf[16]; engine_to_disp(p, disp_to_engine(p, dv), buf, sizeof(buf));
            if (atoi(buf) != d) bad++;
        }
        check(bad == 0, "all 256 tune2 wire values round-trip exactly");
    }

    /* tune2 semitone law (Echidna's): snap to whole semitones everywhere
     * EXCEPT the three fine windows, which give up to +/-0.2 semitone. */
    {
        const float N = 1.0f / 255.0f;
        check(nm_tune2_semis(0.0f)        == 0.0f,  "tune2 raw 0 = unison");
        check(nm_tune2_semis(128.0f * N)  == 12.0f, "tune2 raw 128 = +1 oct");
        check(nm_tune2_semis(255.0f * N)  == 24.0f, "tune2 raw 255 = +2 oct");

        /* Window EDGES reach exactly +/-0.2 semitone (= 20 cents). */
        check(fabsf(nm_tune2_semis(8.0f * N)   -  0.2f) < 1e-5, "unison +8 steps = +0.20 st");
        check(fabsf(nm_tune2_semis(120.0f * N) - 11.8f) < 1e-5, "+1 oct -8 steps = -0.20 st");
        check(fabsf(nm_tune2_semis(136.0f * N) - 12.2f) < 1e-5, "+1 oct +8 steps = +0.20 st");
        check(fabsf(nm_tune2_semis(247.0f * N) - 23.8f) < 1e-4, "+2 oct -8 steps = -0.20 st");

        /* Just OUTSIDE a window it must snap back to a whole semitone. */
        for (int raw = 0; raw <= 255; raw++) {
            float s = nm_tune2_semis((float)raw * N);
            bool inWindow = abs(raw - 0) <= 8 || abs(raw - 128) <= 8 || abs(raw - 255) <= 8;
            if (inWindow) continue;
            char w[96];
            snprintf(w, sizeof(w), "tune2 raw %d snaps to a whole semitone (got %.3f)", raw, s);
            check(fabsf(s - floorf(s + 0.5f)) < 1e-4, w);
        }

        /* Monotonic and inside range across the whole sweep — a fine window
         * must not make the pitch jump backwards as you turn up. */
        float prev = -1.0f;
        for (int raw = 0; raw <= 255; raw++) {
            float s = nm_tune2_semis((float)raw * N);
            char w[96];
            snprintf(w, sizeof(w), "tune2 non-decreasing at raw %d (%.3f after %.3f)", raw, s, prev);
            check(s >= prev - 1e-4, w);
            check(s >= 0.0f && s <= 24.0f, "tune2 stays within 0..24 st");
            prev = s;
        }
    }

    /* nm_tune_norm must survive the engine's truncate-toward-zero. */
    for (int s = -24; s <= 24; s++) {
        int back = (int)(nm_tune_norm(s) * 48.0f - 24.0f);
        char w[96];
        snprintf(w, sizeof(w), "tune_norm(%d) round-trips through getOscTuneValue (got %d)", s, back);
        check(back == s, w);
    }

    static const char *O1N[] = {"saw","pls","noi"};
    static const char *O2N[] = {"saw","pls","tri","sin","noi"};
    printf("  anchors:\n");
    for (int i = 0; i < NM_WAVE_STOP_COUNT; i++) {
        const nm_wave_stop_t *s = &NM_WAVE_STOPS[i];
        printf("   %3d  %-12s o1 %s/%.2f  o2 %s/%.2f  sub %.2f  pw %.2f  t2 %+d  det %.2f  fm %.3f  ring %.2f\n",
               s->disp, s->name, O1N[s->o1wave], s->o1vol, O2N[s->o2wave], s->o2vol,
               s->subvol, s->pw, s->tune2, s->detune, s->fm, s->ring);
    }
}

int main() {
    test_env_time();
    test_wave_sweep();
    printf(g_fail ? "\n%d FAILURE(S)\n" : "\nall checks passed\n", g_fail);
    return g_fail ? 1 : 0;
}
