### R code from vignette source 'Sweave.Rnw'

###################################################
### code chunk number 1: Sweave.Rnw:144-146
###################################################
rnwfile <- system.file("Sweave", "example-1.Rnw", package = "utils")
Sweave(rnwfile)


###################################################
### code chunk number 2: Sweave.Rnw:148-152
###################################################
rnwfileb <- basename(rnwfile)
texfileb <- sub("Rnw$", "tex", rnwfileb)
pdffileb <- sub("Rnw$", "pdf", rnwfileb)
plotfileb <- sub("\\.tex$", "-003.pdf", texfileb)


###################################################
### code chunk number 3: Sweave.Rnw:157-158
###################################################
tools::texi2pdf("example-1.tex")


###################################################
### code chunk number 4: Sweave.Rnw:394-395
###################################################
SweaveSyntConv(rnwfile, SweaveSyntaxLatex)


###################################################
### code chunk number 5: Sweave.Rnw:522-523 (eval = FALSE)
###################################################
## help("Sweave")


###################################################
### code chunk number 6: Sweave.Rnw:532-533 (eval = FALSE)
###################################################
## help("RweaveLatex")


###################################################
### code chunk number 7: Sweave.Rnw:545-548
###################################################
rnwfile <- system.file("Sweave", "example-2.Rnw", package = "utils")
Sweave(rnwfile)
tools::texi2pdf("example-2.tex")


###################################################
### code chunk number 8: Sweave.Rnw:550-552
###################################################
rnwfileb <- basename(rnwfile)
pdffileb <- sub("Rnw$", "pdf", rnwfileb)


###################################################
### code chunk number 9: Sweave.Rnw:601-604
###################################################
rnwfile <- system.file("Sweave", "example-3.Rnw", package = "utils")
Sweave(rnwfile)
tools::texi2pdf("example-3.tex")


###################################################
### code chunk number 10: Sweave.Rnw:606-608
###################################################
rnwfileb <- basename(rnwfile)
pdffileb <- sub("Rnw$", "pdf", rnwfileb)


###################################################
### code chunk number 11: Sweave.Rnw:703-704 (eval = FALSE)
###################################################
## options(prompt = "MyR> ", continue = "...")


###################################################
### code chunk number 12: Sweave.Rnw:750-751 (eval = FALSE)
###################################################
## help("Rtangle")


###################################################
### code chunk number 13: Sweave.Rnw:790-791
###################################################
Stangle(rnwfile, split = TRUE, annotate = FALSE, chunk.sep = "\n")


###################################################
### code chunk number 14: Sweave.Rnw:793-794
###################################################
rfile <- sub("\\.Rnw$", "-main.R", rnwfileb)
