/* End-to-end checks for imported preset banks, off device.
 *
 *   g++ -O1 -std=c++14 -fpermissive -Wno-write-strings \
 *       -Isrc/dsp -Isrc/dsp/Engine -DNM_TEST_MODULE_DIR='"/tmp/nm_test_module"' \
 *       tests/bank_test.cpp src/dsp/Engine/Lfo.cpp -o build/bank_test && ./build/bank_test
 *
 * (scripts/build.sh does NOT build tests -- run the line above by hand. The
 * runner below builds its own tree, so pass the corpus dir to also exercise
 * real TAL presets: ./build/bank_test /path/to/TAL-NoiseMaker)
 *
 * The bank layer is all statics inside the plugin translation unit, and what
 * matters is the behaviour through the PARAMETER surface the host actually
 * drives -- so this includes the plugin directly and pokes set_param /
 * get_param exactly as the Shadow UI would.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include <string>

#include "../src/dsp/noisemaker_plugin.cpp"

/* Banks live at <module_dir>/presets, and module_dir is just an argument to
 * v2_create_instance -- so the test points the whole bank layer at a scratch
 * tree by passing one, with no compile-time override. */
#ifndef NM_TEST_MODULE_DIR
#define NM_TEST_MODULE_DIR "/tmp/nm_test_module"
#endif

static int g_fail = 0, g_checks = 0;
static void check(bool ok, const char *what) {
    g_checks++;
    if (!ok) { printf("  FAIL: %s\n", what); g_fail++; }
}

static std::string G(void *inst, const char *key) {
    static char buf[65536];
    buf[0] = '\0';
    int n = v2_get_param(inst, key, buf, (int)sizeof(buf));
    if (n < 0) return std::string("<none>");
    return std::string(buf);
}

static void S(void *inst, const char *key, const char *val) {
    v2_set_param(inst, key, val);
}

static void rm_rf(const char *path) {
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "rm -rf '%s'", path);
    if (system(cmd) != 0) { /* best effort */ }
}

static void mkdirs(const char *path) {
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "mkdir -p '%s'", path);
    if (system(cmd) != 0) { /* best effort */ }
}

/* A minimal but REAL preset: the parser must accept it, so it carries a <tal>
 * version, a <program> with resolvable attributes, and a spline. */
static void write_preset(const char *path, const char *name, float cutoff,
                         const char *version, float filtertype) {
    FILE *f = fopen(path, "wb");
    if (!f) { printf("  (could not write %s)\n", path); return; }
    fprintf(f,
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n\r\n"
        "<tal curprogram=\"0\" version=\"%s\">\r\n"
        "  <programs>\r\n"
        "    <program programname=\"%s\" volume=\"0.5\" cutoff=\"%.6f\"\r\n"
        "             filtertype=\"%.6f\" resonance=\"0.25\" voices=\"1.0\">\r\n"
        "      <splinePoints>\r\n"
        "        <splinePoint isStartPoint=\"1\" isEndPoint=\"0\" centerPointX=\"0.0\" centerPointY=\"0.5\"\r\n"
        "                     controlPointLeftX=\"0.0\" controlPointLeftY=\"0.5\"\r\n"
        "                     controlPointRightX=\"0.1\" controlPointRightY=\"0.5\"/>\r\n"
        "        <splinePoint isStartPoint=\"0\" isEndPoint=\"1\" centerPointX=\"1.0\" centerPointY=\"0.5\"\r\n"
        "                     controlPointLeftX=\"0.9\" controlPointLeftY=\"0.5\"\r\n"
        "                     controlPointRightX=\"1.0\" controlPointRightY=\"0.5\"/>\r\n"
        "      </splinePoints>\r\n"
        "    </program>\r\n"
        "  </programs>\r\n"
        "</tal>\r\n",
        version, name, cutoff, filtertype);
    fclose(f);
}

/* ⚠ These mirror what src/shadow/shadow_ui.js ACTUALLY does with items_param,
 * which is the contract that matters -- not whatever shape looks reasonable:
 *
 *     label: item.label || item.name || `Item ${item.index}`
 *     ...on click: setSlotParam(select_param, String(item.index))
 *
 * The first cut of bank_list emitted a plain array of strings. It parsed, it
 * round-tripped through this test's own helpers, and on the device every row
 * read "Item undefined" and every click selected index 0. A test that asserts
 * the format you invented cannot catch that; assert the CONSUMER's shape. */
static bool listHas(const std::string &json, const char *name) {
    std::string needle = std::string("\"name\":\"") + name + "\"";
    return json.find(needle) != std::string::npos;
}

/* Every entry must carry BOTH a usable label field and its own index. */
static bool listEntriesWellFormed(const std::string &j, int expectCount) {
    int seen = 0;
    size_t pos = 0;
    while ((pos = j.find("{\"index\":", pos)) != std::string::npos) {
        size_t idxAt = pos + 9;
        int idx = atoi(j.c_str() + idxAt);
        if (idx != seen) return false;                 /* index == position */
        size_t nameAt = j.find("\"name\":\"", pos);
        if (nameAt == std::string::npos) return false; /* no label source */
        size_t close = j.find('}', pos);
        if (close == std::string::npos || nameAt > close) return false;
        seen++;
        pos = close;
    }
    return seen == expectCount;
}

int main(int argc, char **argv) {
    const char *MODDIR = NM_TEST_MODULE_DIR;
    static char rootbuf[512];
    snprintf(rootbuf, sizeof(rootbuf), "%s/%s", MODDIR, NM_BANK_SUBDIR);
    const char *ROOT = rootbuf;
    printf("Bank tests (module_dir = %s, bank root = %s)\n", MODDIR, ROOT);

    /* ---- build a scratch tree ------------------------------------------ */
    rm_rf(MODDIR);
    mkdirs(ROOT);

    void *inst = v2_create_instance(MODDIR, NULL);
    check(inst != NULL, "instance is created with an empty bank root");
    if (!inst) return 1;

    printf("\nTest 1: an empty root is Factory-only\n");
    check(G(inst, "bank_list") == "[{\"index\":0,\"name\":\"Factory\"}]",
          "bank_list is just Factory, in the host's items_param object shape");
    check(G(inst, "bank_index") == "0", "Factory is selected");
    check(atoi(G(inst, "preset_count").c_str()) == NM_FACTORY_COUNT,
          "preset_count is the factory count");

    /* ---- add banks WITHOUT recreating the instance ---------------------- */
    printf("\nTest 2: folders appear with no rescan action\n");
    mkdirs((std::string(ROOT) + "/Zeta/LEAD").c_str());
    mkdirs((std::string(ROOT) + "/Alpha/BASS").c_str());
    mkdirs((std::string(ROOT) + "/Alpha/PAD").c_str());
    write_preset((std::string(ROOT) + "/Alpha/BASS/BS One.noisemakerpreset").c_str(),
                 "Alpha Bass One", 0.30f, "1.7", 0.0f);
    write_preset((std::string(ROOT) + "/Alpha/PAD/PD Two.noisemakerpreset").c_str(),
                 "Alpha Pad Two", 0.70f, "1.7", 0.0f);
    write_preset((std::string(ROOT) + "/Zeta/LEAD/LD Solo.noisemakerpreset").c_str(),
                 "Zeta Lead", 0.55f, "1.7", 0.0f);

    std::string list = G(inst, "bank_list");
    printf("  bank_list = %s\n", list.c_str());
    check(listHas(list, "Factory"), "Factory still listed");
    check(listHas(list, "Alpha"),   "Alpha appeared without any rescan action");
    check(listHas(list, "Zeta"),    "Zeta appeared without any rescan action");
    check(atoi(G(inst, "bank_count").c_str()) == 3, "three banks");
    check(list.find("Alpha") < list.find("Zeta"), "imported banks are sorted");
    check(list.find("Factory") < list.find("Alpha"), "Factory is pinned first");
    check(listEntriesWellFormed(list, 3),
          "every entry has a name AND an index matching its position");

    printf("\nTest 3: selecting a bank, recursively gathering subfolders\n");
    S(inst, "bank_index", "1");                       /* Alpha */
    check(G(inst, "bank_name") == "Alpha", "Alpha is selected");
    check(atoi(G(inst, "preset_count").c_str()) == 2,
          "Alpha has 2 presets, gathered from two subfolders");
    check(G(inst, "preset") == "0", "selecting a bank lands on its first preset");
    /* Name is the FILE stem, and the sort is by relative path (BASS before PAD). */
    check(G(inst, "preset_name") == "BS One", "preset name is the file stem");
    S(inst, "preset", "1");
    check(G(inst, "preset_name") == "PD Two", "second preset selected");

    printf("\nTest 4: the preset actually reaches the engine\n");
    /* cutoff 0.70 -> display 70. Proves parse -> apply_engine, not just naming. */
    check(G(inst, "cutoff") == "70", "imported cutoff applied to the engine");
    S(inst, "preset", "0");
    check(G(inst, "cutoff") == "30", "switching preset re-applies from file");

    printf("\nTest 5: state round-trips the bank BY NAME\n");
    S(inst, "preset", "1");
    std::string st = G(inst, "state");
    check(st.find("\"bank_name\":\"Alpha\"") != std::string::npos,
          "state stores the bank name");
    /* Insert a bank that sorts BEFORE Alpha: every index shifts. A state blob
     * that stored an index would now select the wrong bank. */
    mkdirs((std::string(ROOT) + "/AAA").c_str());
    write_preset((std::string(ROOT) + "/AAA/x.noisemakerpreset").c_str(),
                 "AAA", 0.10f, "1.7", 0.0f);
    S(inst, "bank_index", "0");                        /* go elsewhere first */
    check(G(inst, "bank_name") == "Factory", "moved away to Factory");
    S(inst, "state", st.c_str());
    check(G(inst, "bank_name") == "Alpha",
          "state restored Alpha after an earlier-sorting bank was inserted");
    check(G(inst, "preset_name") == "PD Two", "and the right preset inside it");

    printf("\nTest 6: a bank that has gone missing falls back to Factory\n");
    std::string stAlpha = G(inst, "state");
    rm_rf((std::string(ROOT) + "/Alpha").c_str());
    S(inst, "state", stAlpha.c_str());
    check(G(inst, "bank_name") == "Factory",
          "a deleted bank falls back to Factory, not to whatever took its index");

    printf("\nTest 7: loose presets in the root, and hostile names\n");
    write_preset((std::string(ROOT) + "/Loose One.noisemakerpreset").c_str(),
                 "Loose", 0.40f, "1.7", 0.0f);
    mkdirs((std::string(ROOT) + "/Quote\"Bank").c_str());
    write_preset((std::string(ROOT) + "/Quote\"Bank/q.noisemakerpreset").c_str(),
                 "Q", 0.20f, "1.7", 0.0f);
    list = G(inst, "bank_list");
    check(listHas(list, "(loose)"), "loose presets in the root form a bank");
    /* A folder name with a quote must not break the JSON the UI parses. */
    check(list.find("Quote\\\"Bank") != std::string::npos,
          "a quote in a folder name is escaped in bank_list");
    check(listEntriesWellFormed(list, atoi(G(inst, "bank_count").c_str())),
          "entries stay well-formed with hostile folder names");
    int braces = 0;
    for (size_t i = 0; i < list.size(); i++)
        if (list[i] == '"' && (i == 0 || list[i-1] != '\\')) braces++;
    check(braces % 2 == 0, "bank_list has balanced quotes");

    printf("\nTest 8: non-preset files are ignored\n");
    mkdirs((std::string(ROOT) + "/Mixed").c_str());
    write_preset((std::string(ROOT) + "/Mixed/real.noisemakerpreset").c_str(),
                 "Real", 0.50f, "1.7", 0.0f);
    { FILE *f = fopen((std::string(ROOT) + "/Mixed/.DS_Store").c_str(), "wb");
      if (f) { fputs("junk", f); fclose(f); } }
    { FILE *f = fopen((std::string(ROOT) + "/Mixed/notes.txt").c_str(), "wb");
      if (f) { fputs("hello", f); fclose(f); } }
    list = G(inst, "bank_list");
    int mixedIdx = -1;
    { nm_instance_t *ni = (nm_instance_t *)inst;
      for (int i = 0; i < ni->bank_count; i++)
        if (strcmp(ni->banks[i].name, "Mixed") == 0) mixedIdx = i; }
    check(mixedIdx > 0, "Mixed bank found");
    if (mixedIdx > 0) {
        char v[8]; snprintf(v, sizeof(v), "%d", mixedIdx);
        S(inst, "bank_index", v);
        check(atoi(G(inst, "preset_count").c_str()) == 1,
              "only the .noisemakerpreset file counts");
    }

    printf("\nTest 9: the pre-1.7 filtertype re-encode survives the whole path\n");
    mkdirs((std::string(ROOT) + "/Old").c_str());
    /* v1.6 authored index 4 of 10 == 4/9 == 0.4444 -> must become 4/11. */
    write_preset((std::string(ROOT) + "/Old/old.noisemakerpreset").c_str(),
                 "Old", 0.50f, "1.6", 4.0f / 9.0f);
    /* and the float-noise version string that must NOT be read as 1.6 */
    mkdirs((std::string(ROOT) + "/New").c_str());
    write_preset((std::string(ROOT) + "/New/new.noisemakerpreset").c_str(),
                 "New", 0.50f, "1.6999999999999999556", 4.0f / 11.0f);
    { nm_instance_t *ni = (nm_instance_t *)inst;
      G(inst, "bank_list");
      int oldIdx = -1, newIdx = -1;
      for (int i = 0; i < ni->bank_count; i++) {
        if (strcmp(ni->banks[i].name, "Old") == 0) oldIdx = i;
        if (strcmp(ni->banks[i].name, "New") == 0) newIdx = i;
      }
      char v[8];
      if (oldIdx > 0) {
        snprintf(v, sizeof(v), "%d", oldIdx); S(inst, "bank_index", v);
        /* index 4 of the 12-item list -> display index 4 == "HP24" */
        check(G(inst, "filter_type") == "4", "v1.6 filtertype re-encoded to the 12-item scheme");
      }
      if (newIdx > 0) {
        snprintf(v, sizeof(v), "%d", newIdx); S(inst, "bank_index", v);
        check(G(inst, "filter_type") == "4",
              "version 1.6999999999999999556 is treated as 1.7 (NOT re-encoded)");
      }
    }

    /* ---- optional: the real corpus -------------------------------------- */
    if (argc >= 2) {
        printf("\nTest 10: the real corpus as a bank root\n");
        char cmd[2048];
        snprintf(cmd, sizeof(cmd), "cp -R '%s'/* '%s'/ 2>/dev/null", argv[1], ROOT);
        if (system(cmd) != 0) { /* best effort */ }
        list = G(inst, "bank_list");
        printf("  bank_list = %s\n", list.c_str());
        nm_instance_t *ni = (nm_instance_t *)inst;
        int total = 0;
        for (int i = 1; i < ni->bank_count; i++) {
            char v[8]; snprintf(v, sizeof(v), "%d", i);
            S(inst, "bank_index", v);
            int c = atoi(G(inst, "preset_count").c_str());
            total += c;
            /* Every preset in every bank must load and name itself. */
            for (int k = 0; k < c; k++) {
                char kv[8]; snprintf(kv, sizeof(kv), "%d", k);
                S(inst, "preset", kv);
                if (G(inst, "preset_name") == "Init") {
                    printf("  FAIL: bank %s preset %d did not load\n", ni->banks[i].name, k);
                    g_fail++;
                }
                g_checks++;
            }
        }
        printf("  loaded %d presets across %d imported banks\n", total, ni->bank_count - 1);
        check(total >= 442, "the whole corpus is reachable through the banks");

        /* ⚠ Regression guard. The "(loose)" bank maps to the ROOT, whose
         * subfolders are the other banks. When it recursed, it swallowed the
         * entire library a second time -- 897 presets out of 449 files, every
         * one of them reachable twice. Total across banks must equal the
         * number of preset files actually on disk. */
        snprintf(cmd, sizeof(cmd),
                 "find '%s' -name '*%s' -type f | wc -l > '%s/.count'", ROOT, NM_PRESET_EXT, ROOT);
        if (system(cmd) != 0) { /* best effort */ }
        int onDisk = -1;
        { FILE *cf = fopen((std::string(ROOT) + "/.count").c_str(), "r");
          if (cf) { if (fscanf(cf, "%d", &onDisk) != 1) onDisk = -1; fclose(cf); } }
        printf("  preset files on disk: %d\n", onDisk);
        check(onDisk > 0 && total == onDisk,
              "every preset is reachable exactly ONCE (no bank duplicates the tree)");
    }

    v2_destroy_instance(inst);
    rm_rf(MODDIR);

    printf("\n%s (%d checks, %d failed)\n",
           g_fail ? "FAILURES" : "all checks passed", g_checks, g_fail);
    return g_fail ? 1 : 0;
}
