/* Math.h — TAL Noisemaker port shim.
 *
 * The upstream TAL Noisemaker sources `#include "Math.h"` in ~12 files but ship
 * no such header. On the case-insensitive filesystems TAL was developed on
 * (Windows/macOS), the quoted include silently resolved to the system <math.h>.
 * On the case-sensitive aarch64 Linux build for Move it does not, so we provide
 * this shim. No TAL code references a `Math::` namespace — the includes only
 * needed the C math functions — so forwarding to <math.h>/<cmath> is sufficient.
 */
#ifndef TAL_NOISEMAKER_MATH_SHIM_H
#define TAL_NOISEMAKER_MATH_SHIM_H

#define _USE_MATH_DEFINES   /* expose M_PI & friends where the platform gates them */
#include <math.h>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#endif /* TAL_NOISEMAKER_MATH_SHIM_H */
