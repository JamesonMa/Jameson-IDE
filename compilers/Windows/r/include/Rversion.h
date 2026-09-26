/* Rversion.h.  Generated automatically. */
#ifndef R_VERSION_H
#define R_VERSION_H

#ifdef __cplusplus
extern "C" {
#endif

#define R_VERSION 263680
#define R_NICK "Because it was There"
#define R_Version(v,p,s) (((v) * 65536) + ((p) * 256) + (s))
#define R_MAJOR  "4"
#define R_MINOR  "6.0"
#define R_STATUS ""
#define R_YEAR   "2026"
#define R_MONTH  "04"
#define R_DAY    "24"
#define R_SVN_REVISION 89956
#ifdef __llvm__
# define R_FILEVERSION    4,60,24420,0
#else
# define R_FILEVERSION    4,60,89956,0
#endif

#ifdef __cplusplus
}
#endif

#endif /* not R_VERSION_H */
