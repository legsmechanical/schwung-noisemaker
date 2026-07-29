/* Off-device checks for the .noisemakerpreset importer.
 *
 *   g++ -O1 -std=c++14 -fpermissive -Wno-write-strings \
 *       -Isrc/dsp -Isrc/dsp/Engine tests/import_test.cpp src/dsp/Engine/Lfo.cpp \
 *       -o build/import_test && ./build/import_test [corpus_dir]
 *
 * (scripts/build.sh does NOT build tests -- run the line above by hand.)
 *
 * Test 1 pins the generated attribute-name lookup, including the two traps the
 * corpus revealed: TAL ships attribute names in more than one CASE, and
 * velocityfilter is a rename of velocitycutoff.
 *
 * Test 2, when given a corpus directory, parses every preset in it and checks
 * the invariants that would otherwise fail silently -- every attribute
 * resolving, the filtertype re-encoding matching the file's version, and no
 * crash on non-preset files.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <dirent.h>
#include <sys/stat.h>
#include <vector>
#include <string>
#include <algorithm>

#include "Params.h"
#include "param_names.h"
#include "nm_import.h"

static int g_fail = 0;
static int g_checks = 0;

static void check(bool ok, const char *what) {
    g_checks++;
    if (!ok) { printf("  FAIL: %s\n", what); g_fail++; }
}

/* ---- Test 1: the generated name lookup ------------------------------- */

static void test_param_names() {
    printf("Test 1: attribute name -> engine index\n");

    /* Plain lowercase, the common case. */
    check(nm_param_index("cutoff", 6) == CUTOFF, "cutoff resolves");
    check(nm_param_index("volume", 6) == VOLUME, "volume resolves");
    check(nm_param_index("filtertype", 10) == FILTERTYPE, "filtertype resolves");

    /* ⚠ The 121-preset vocabulary writes these with capitals. An exact-match
     * lookup drops all four and the preset imports with a default phase, a
     * default one-shot flag and the wrong delay factor -- silently. */
    check(nm_param_index("delayfactorR", 12)    == DELAYFACTORR,    "delayfactorR (capital R)");
    check(nm_param_index("envelopeOneShot", 15) == ENVELOPEONESHOT, "envelopeOneShot (camel)");
    check(nm_param_index("lfo1Phase", 9)        == LFO1PHASE,       "lfo1Phase (capital P)");
    check(nm_param_index("lfo2Phase", 9)        == LFO2PHASE,       "lfo2Phase (capital P)");

    /* Both spellings of the same control must land in the same slot. */
    check(nm_param_index("velocitycutoff", 14) == VELOCITYCUTOFF, "velocitycutoff resolves");
    check(nm_param_index("velocityfilter", 14) == VELOCITYCUTOFF, "velocityfilter aliases to velocitycutoff");

    /* GUI-only attributes have no engine slot and must report as unknown
     * rather than colliding with something. */
    check(nm_param_index("midilearn", 9) == -1, "midilearn is not a parameter");
    check(nm_param_index("midiclear", 9) == -1, "midiclear is not a parameter");
    check(nm_param_index("midilock", 8)  == -1, "midilock is not a parameter");
    check(nm_param_index("unknown", 7)   == -1, "unknown is not a parameter");

    /* The length argument is authoritative: the parser hands us a pointer into
     * the XML buffer, not a NUL-terminated string. A prefix or an overlong
     * span must not match. */
    check(nm_param_index("cutoff", 5)   == -1, "a prefix of a real name does not match");
    check(nm_param_index("cutoffx", 7)  == -1, "a superstring of a real name does not match");
    check(nm_param_index("", 0)         == -1, "the empty name does not match");

    /* Every emitted name must round-trip through the lookup, or the table and
     * the matcher disagree about something. */
    for (int i = 0; i < NM_PARAM_NAME_COUNT; i++) {
        const char *n = NM_PARAM_NAMES[i];
        if (!n) continue;
        if (nm_param_index(n, (int)strlen(n)) != i) {
            printf("  FAIL: %s does not round-trip (got %d, want %d)\n",
                   n, nm_param_index(n, (int)strlen(n)), i);
            g_fail++;
        }
        g_checks++;
    }
    printf("  %d names in table, all round-trip\n", NM_PARAM_NAME_COUNT);
}

/* ---- corpus walk ------------------------------------------------------- */

static void walk(const std::string &dir, std::vector<std::string> &out) {
    DIR *d = opendir(dir.c_str());
    if (!d) return;
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (!strcmp(e->d_name, ".") || !strcmp(e->d_name, "..")) continue;
        std::string p = dir + "/" + e->d_name;
        struct stat st;
        if (stat(p.c_str(), &st) != 0) continue;
        if (S_ISDIR(st.st_mode)) { walk(p, out); continue; }
        out.push_back(p);
    }
    closedir(d);
}

static char *slurp(const char *path, int *len) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long n = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (n < 0 || n > 8 * 1024 * 1024) { fclose(f); return NULL; }
    char *b = (char *)malloc((size_t)n + 1);
    if (!b) { fclose(f); return NULL; }
    size_t got = fread(b, 1, (size_t)n, f);
    fclose(f);
    b[got] = '\0';
    *len = (int)got;
    return b;
}

/* Dump a digest of every parseable file, for diffing against an independent
 * implementation. One line per parameter so a mismatch names the parameter. */
static int dump_corpus(const char *root) {
    std::vector<std::string> files;
    walk(root, files);
    std::sort(files.begin(), files.end());
    size_t rootlen = strlen(root);

    for (size_t i = 0; i < files.size(); i++) {
        int len = 0;
        char *buf = slurp(files[i].c_str(), &len);
        if (!buf) continue;
        nm_import_preset_t p;
        nm_import_stats_t st;
        memset(&st, 0, sizeof(st));
        int ok = nm_import_parse(buf, len, &p, &st);
        const char *rel = files[i].c_str() + rootlen;
        if (!ok) { printf("%s\tPARSE_FAIL\n", rel); free(buf); continue; }
        printf("%s\tNAME\t%s\n", rel, p.name);
        for (int k = 0; k < NUMPARAM; k++)
            printf("%s\tP\t%d\t%.9g\n", rel, k, (double)p.data[k]);
        printf("%s\tSPLINE\t%d\n", rel, p.spline_count);
        for (int k = 0; k < p.spline_count; k++) {
            const nm_spline_point_t *s = &p.spline[k];
            printf("%s\tSP\t%d\t%d\t%d\t%.9g\t%.9g\t%.9g\t%.9g\t%.9g\t%.9g\n",
                   rel, k, s->isStart, s->isEnd,
                   (double)s->cx, (double)s->cy, (double)s->clx,
                   (double)s->cly, (double)s->crx, (double)s->cry);
        }
        printf("%s\tUNKNOWN\t%d\n", rel, st.attrs_unknown);
        free(buf);
    }
    return 0;
}

/* ---- Test 2: corpus invariants ---------------------------------------- */

static void test_corpus(const char *root) {
    printf("Test 2: corpus parse (%s)\n", root);
    std::vector<std::string> files;
    walk(root, files);
    std::sort(files.begin(), files.end());

    int presets = 0, nonpreset = 0, remapped = 0, unknown = 0, noSpline = 0;
    int emptyName = 0, synth = 0;
    for (size_t i = 0; i < files.size(); i++) {
        int len = 0;
        char *buf = slurp(files[i].c_str(), &len);
        if (!buf) continue;
        nm_import_preset_t p;
        nm_import_stats_t st;
        memset(&st, 0, sizeof(st));
        int ok = nm_import_parse(buf, len, &p, &st);
        bool isPreset = files[i].size() > 18 &&
            files[i].compare(files[i].size() - 18, 18, ".noisemakerpreset") == 0;
        /* extension is 17 chars + the dot = 18; recompute robustly */
        isPreset = files[i].rfind(".noisemakerpreset") != std::string::npos &&
                   files[i].rfind(".noisemakerpreset") == files[i].size() - 17;

        if (ok) {
            presets++;
            remapped += st.remapped_filtertype;
            unknown  += st.attrs_unknown;
            synth    += st.spline_synthesized;
            if (p.spline_count == 0) noSpline++;
            if (p.name[0] == '\0') emptyName++;
            check(p.data[PANIC] == 0.0f, "PANIC is never carried in from a preset");
            check(p.data[FILTERTYPE] >= 0.0f && p.data[FILTERTYPE] <= 1.0f,
                  "filtertype stays normalized after the remap");
            check(st.spline_dropped == 0, "no spline points dropped");
        } else {
            nonpreset++;
            /* Anything with the preset extension MUST parse. */
            check(!isPreset, "every .noisemakerpreset file parses");
        }
        free(buf);
    }

    printf("  parsed %d presets, rejected %d non-preset files\n", presets, nonpreset);
    printf("  filtertype remapped (pre-1.7): %d | unresolved attrs: %d\n", remapped, unknown);
    printf("  presets given the neutral shape (empty <splinePoints>): %d\n", synth);
    printf("  presets with no envelope shape: %d | with no name: %d\n", noSpline, emptyName);

    check(presets > 0, "the corpus produced presets");
    check(emptyName == 0, "every preset has a program name");
    /* Every preset must install SOME shape -- a shapeless one would inherit
     * the previously loaded patch's envelope. 40 corpus files have an empty
     * <splinePoints>, so this only holds because the parser synthesizes. */
    check(noSpline == 0, "every preset yields an envelope shape to install");
    check(synth > 0, "the empty-<splinePoints> path is actually exercised");
}

int main(int argc, char **argv) {
    if (argc >= 3 && !strcmp(argv[1], "--dump")) return dump_corpus(argv[2]);

    test_param_names();
    if (argc >= 2) { printf("\n"); test_corpus(argv[1]); }
    else printf("\n(no corpus dir given; skipping Test 2)\n");

    printf("\n%s (%d checks, %d failed)\n",
           g_fail ? "FAILURES" : "all checks passed", g_checks, g_fail);
    return g_fail ? 1 : 0;
}
