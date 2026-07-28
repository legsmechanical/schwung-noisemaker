/* Off-device checks for the delay-feedback control law (K_FBGAIN).
 *
 *   g++ -O2 -std=c++14 -fpermissive -Wno-write-strings \
 *       -Isrc/dsp -Isrc/dsp/Engine tests/delay_fb_test.cpp src/dsp/Engine/Lfo.cpp \
 *       -o build/delay_fb_test && ./build/delay_fb_test
 *
 * The wrapper displays the delay's LOOP GAIN rather than TAL's raw knob
 * position, because TAL's getDelayFeedback() warp is steep enough that a
 * linear percent readout is actively misleading (see the K_FBGAIN block in
 * noisemaker_plugin.cpp). Three things have to hold for that to be safe:
 *
 *   1. The mapping is lossless -- a value written is the value read back, or
 *      saving and reloading a patch would walk the feedback around.
 *   2. It is monotonic, or the knob would reverse somewhere.
 *   3. The promise the on-device HUD makes -- "below 100 the tail ends" -- is
 *      true of the RENDERED audio, not just of the coefficient. This one is
 *      measured, because the loop EQ sits inside the feedback path and the
 *      coefficient alone does not decide the outcome.
 */
#include "../src/dsp/noisemaker_plugin.cpp"

#include <cstdio>
#include <cmath>
#include <cstring>

static const int SR = MOVE_SAMPLE_RATE, BS = MOVE_FRAMES_PER_BLOCK;
static int failures = 0;

static void check(bool ok, const char *what) {
    if (!ok) { printf("  FAIL: %s\n", what); failures++; }
}

/* Renders a plucked note into a wide-open delay and reports the 4-8 s and
 * 20-24 s windows in dBFS. The SLOPE between them says whether the tail is
 * dying; the late LEVEL says whether it is already gone -- both are needed,
 * because a tail that has fully decayed before 4 s reads as a flat slope
 * between two silent windows. */
static double tailSlope(int knob, int hiCut, double *lateDb = NULL) {
    void *inst = v2_create_instance(".", "{}");
    v2_set_param(inst, "preset", "0");
    v2_set_param(inst, "reverb_wet", "0");
    v2_set_param(inst, "chorus1", "0");
    v2_set_param(inst, "chorus2", "0");
    v2_set_param(inst, "aenv_a", "0"); v2_set_param(inst, "aenv_d", "6");
    v2_set_param(inst, "aenv_s", "0"); v2_set_param(inst, "aenv_r", "4");
    v2_set_param(inst, "delay_wet", "100");
    v2_set_param(inst, "delay_time", "25");
    v2_set_param(inst, "delay_lo", "0");
    char b[16];
    snprintf(b, sizeof(b), "%d", hiCut); v2_set_param(inst, "delay_hi", b);
    snprintf(b, sizeof(b), "%d", knob);  v2_set_param(inst, "delay_fb", b);

    uint8_t on[3] = { 0x90, 45, 60 };
    v2_on_midi(inst, on, 3, 0);

    int16_t buf[BS * 2];
    double eA = 0, eB = 0;
    long nA = 0, nB = 0, t = 0;
    const long noteoff = (long)(0.05 * SR), end = (long)(24.0 * SR);
    while (t < end) {
        memset(buf, 0, sizeof(buf));
        v2_render_block(inst, buf, BS);
        for (int i = 0; i < BS; i++) {
            if (t == noteoff) { uint8_t off[3] = { 0x80, 45, 0 }; v2_on_midi(inst, off, 3, 0); }
            double v = buf[i * 2] / 32768.0, s = (double)t / SR;
            if (s >= 4 && s < 8)   { eA += v * v; nA++; }
            if (s >= 20 && s < 24) { eB += v * v; nB++; }
            t++;
        }
    }
    v2_destroy_instance(inst);
    double a = nA ? sqrt(eA / nA) : 0, b2 = nB ? sqrt(eB / nB) : 0;
    if (a < 1e-12) a = 1e-12;
    if (b2 < 1e-12) b2 = 1e-12;
    if (lateDb) *lateDb = 20 * log10(b2);
    return 20 * log10(b2 / a);
}

int main() {
    const param_def_t *p = find_param("delay_fb");
    printf("Test 1: delay_fb display round-trip\n");
    check(p != NULL && p->kind == K_FBGAIN, "delay_fb is K_FBGAIN");
    for (int d = 0; d <= NM_FB_DISP_MAX; d++) {
        char in[16], out[32];
        snprintf(in, sizeof(in), "%d", d);
        engine_to_disp(p, disp_to_engine(p, in), out, sizeof(out));
        if (atoi(out) != d) {
            printf("  FAIL: %d -> %s\n", d, out);
            failures++;
            break;
        }
    }
    printf("  all %d display values survive the round-trip\n", NM_FB_DISP_MAX + 1);

    printf("Test 2: monotonic + endpoints\n");
    float prev = -1.0f;
    for (int d = 0; d <= NM_FB_DISP_MAX; d++) {
        char in[16];
        snprintf(in, sizeof(in), "%d", d);
        float k = disp_to_engine(p, in);
        if (k < prev) { printf("  FAIL: knob reverses at %d\n", d); failures++; break; }
        prev = k;
    }
    /* The display is the coefficient x100, so these are exact by definition:
     * 0 = dead, 100 = the delay line stops decaying on its own, 200 = TAL's
     * engine maximum (k = 1). Anchoring all three pins the whole curve. */
    check(fabsf(disp_to_engine(p, "0")) < 1e-6f, "0 maps to engine 0.0");
    check(fabsf(disp_to_engine(p, "100") - 0.5f) < 1e-4f, "100 maps to engine 0.5 (coefficient 1.0)");
    check(fabsf(disp_to_engine(p, "200") - 1.0f) < 1e-4f, "200 maps to engine 1.0 (coefficient 2.0)");
    printf("  monotonic across the range, endpoints exact\n");

    printf("Test 3: factory presets read back in gain space\n");
    /* TAL ships patches above unity; they must survive load_preset (which
     * raw-applies engine values and must NOT be re-warped) and then read out
     * as the gain they actually are. "PD Bionic Pad TAL" sits at k=0.84. */
    for (int i = 0; i < NM_FACTORY_COUNT; i++) {
        if (strcmp(NM_FACTORY_BANK[i].name, "PD Bionic Pad TAL") != 0) continue;
        void *inst = v2_create_instance(".", "{}");
        char idx[8]; snprintf(idx, sizeof(idx), "%d", i);
        v2_set_param(inst, "preset", idx);
        char rb[32]; v2_get_param(inst, "delay_fb", rb, sizeof(rb));
        printf("  \"%s\" -> delay_fb %s (engine %.3f)\n",
               NM_FACTORY_BANK[i].name, rb, NM_FACTORY_BANK[i].programData[DELAYFEEDBACK]);
        check(atoi(rb) == 131, "PD Bionic Pad TAL reads back 131");
        v2_destroy_instance(inst);
        break;
    }

    printf("Test 4: below 100 the tail actually ends (rendered)\n");
    /* hiCut = 0 is the WORST case for this claim: the loop EQ is wide open, so
     * nothing but the feedback coefficient is bringing the level down. */
    double late62 = 0, late99 = 0, late160 = 0;
    double s62  = tailSlope(62, 0, &late62);
    double s99  = tailSlope(99, 0, &late99);
    printf("  knob  62 -> %+.1f dB slope, %.0f dBFS late\n", s62, late62);
    printf("  knob  99 -> %+.1f dB slope, %.0f dBFS late\n", s99, late99);
    check(late62 < -100.0, "knob 62 is silent well before 20 s");
    check(s99 < 0.0, "knob 99 still decays with the cuts wide open");
    /* And the top of the range must genuinely reach self-oscillation, or the
     * extra travel bought nothing. */
    double s160 = tailSlope(160, 0, &late160);
    printf("  knob 160 -> %+.1f dB slope, %.0f dBFS late\n", s160, late160);
    check(s160 > 0.0, "knob 160 sustains/blooms");

    printf(failures ? "\n%d CHECK(S) FAILED\n" : "\nall checks passed\n", failures);
    return failures ? 1 : 0;
}
