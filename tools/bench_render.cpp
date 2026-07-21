/* bench_render.cpp — on-device DSP-load benchmark for Noisemaker.
 *
 * Renders audio through the REAL plugin path (create_instance + render_block),
 * timing ONLY render_block, and reports ns/frame + % of one core @44.1kHz.
 * MUST run ON the Move for meaningful numbers (ARM CM4/CM5, not x86/Docker).
 *
 * Worst case by default: 6-voice chord + chorus I/II + reverb all on.
 *
 * Build (cross): aarch64-linux-gnu-g++ -O3 -std=c++14 -fpermissive
 *   -Wno-write-strings -I src/dsp -I src/dsp/Engine tools/bench_render.cpp
 *   src/dsp/Engine/Lfo.cpp -o bench_render -lm -static
 * Usage: ./bench_render [secs=10] [voices=6] [preset=-1]
 *   preset<0 => hand-set worst-case FX patch; preset>=0 => load that factory patch.
 */
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <ctime>
#include "noisemaker_plugin.cpp"

static double now_ns() {
    struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec * 1e9 + (double)ts.tv_nsec;
}

int main(int argc, char **argv) {
    float secs   = argc > 1 ? (float)atof(argv[1]) : 10.0f;
    int   voices = argc > 2 ? atoi(argv[2]) : 6;
    int   preset = argc > 3 ? atoi(argv[3]) : -1;

    plugin_api_v2_t *api = move_plugin_init_v2(NULL);
    void *inst = api->create_instance("/tmp", NULL);
    if (!inst) { printf("FAIL create_instance\n"); return 1; }

    if (preset >= 0) {
        char v[16]; snprintf(v, sizeof(v), "%d", preset);
        api->set_param(inst, "preset", v);
    } else {
        /* Explicit worst case: full FX chain (chorus+reverb+delay) + max voices. */
        api->set_param(inst, "chorus1", "1");
        api->set_param(inst, "chorus2", "1");
        api->set_param(inst, "reverb_wet", "80");
        api->set_param(inst, "reverb_decay", "80");
        api->set_param(inst, "delay_wet", "70");
        api->set_param(inst, "delay_fb", "60");
        api->set_param(inst, "osc2_vol", "80");   // 2nd osc active
        api->set_param(inst, "osc3_vol", "60");   // sub active
    }
    { char v[16]; snprintf(v, sizeof(v), "%d", voices); api->set_param(inst, "voices", v); }

    /* Hold a `voices`-note chord so every voice is actually rendering. */
    int base = 48;
    for (int i = 0; i < voices; i++) {
        uint8_t on[3] = {0x90, (uint8_t)(base + i * 4), 100};
        api->on_midi(inst, on, 3, 0);
    }

    static int16_t out[128 * 2];
    long blocks = (long)(secs * 44100.0f) / 128;

    /* 1s warmup (denormals, cache, envelope ramps) — untimed. */
    for (int b = 0; b < 44100 / 128; b++) api->render_block(inst, out, 128);

    double t0 = now_ns();
    for (long b = 0; b < blocks; b++) api->render_block(inst, out, 128);
    double dt = now_ns() - t0;

    double ns_frame = dt / (double)(blocks * 128);
    double pct = ns_frame * 44100.0 / 1e9 * 100.0;
    printf("noisemaker: %d voices, %s: %.1f ns/frame -> %.2f%% of one core @44.1k\n",
           voices, preset >= 0 ? "factory patch" : "worst-case FX",
           ns_frame, pct);

    api->destroy_instance(inst);
    return 0;
}
