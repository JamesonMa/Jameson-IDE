## ----message=FALSE------------------------------------------------------------
library(RNAseqData.HNRNPC.bam.chr14)
bamfiles <- RNAseqData.HNRNPC.bam.chr14_BAMFILES
names(bamfiles) # the names of the runs

## ----message=FALSE------------------------------------------------------------
library(Rsamtools)
quickBamFlagSummary(bamfiles[1], main.groups.only=TRUE)

## -----------------------------------------------------------------------------
flag1 <- scanBamFlag(isFirstMateRead=TRUE, isSecondMateRead=FALSE, isDuplicate=FALSE, isNotPassingQualityControls=FALSE)
param1 <- ScanBamParam(flag=flag1, what="seq")

## ----message=FALSE------------------------------------------------------------
library(GenomicAlignments)
gal1 <- readGAlignments(bamfiles[1], use.names=TRUE, param=param1)

## -----------------------------------------------------------------------------
mcols(gal1)$seq

## -----------------------------------------------------------------------------
oqseq1 <- mcols(gal1)$seq
is_on_minus <- as.logical(strand(gal1) == "-")
oqseq1[is_on_minus] <- reverseComplement(oqseq1[is_on_minus])

## -----------------------------------------------------------------------------
is_dup <- duplicated(names(gal1))
table(is_dup)

## -----------------------------------------------------------------------------
dup2unq <- match(names(gal1), names(gal1))
stopifnot(all(oqseq1 == oqseq1[dup2unq]))

## -----------------------------------------------------------------------------
oqseq1 <- oqseq1[!is_dup]

## -----------------------------------------------------------------------------
head(sort(table(cigar(gal1)), decreasing=TRUE))

## -----------------------------------------------------------------------------
colSums(cigarOpTable(cigar(gal1)))

## -----------------------------------------------------------------------------
table(njunc(gal1))

## ----message=FALSE------------------------------------------------------------
library(pasillaBamSubset)
flag0 <- scanBamFlag(isDuplicate=FALSE, isNotPassingQualityControls=FALSE)
param0 <- ScanBamParam(flag=flag0)
U3.galp <- readGAlignmentPairs(untreated3_chr4(), use.names=TRUE, param=param0)
head(U3.galp)

## -----------------------------------------------------------------------------
head(first(U3.galp))
head(last(U3.galp))

## -----------------------------------------------------------------------------
table(isProperPair(U3.galp))

## -----------------------------------------------------------------------------
U3.GALP <- U3.galp[isProperPair(U3.galp)]

## -----------------------------------------------------------------------------
U3.GALP_names_is_dup <- duplicated(names(U3.GALP))
table(U3.GALP_names_is_dup)

## -----------------------------------------------------------------------------
U3.uqnames <- unique(names(U3.GALP))
U3.GALP_qnames <- factor(names(U3.GALP), levels=U3.uqnames)

## -----------------------------------------------------------------------------
U3.GALP_dup2unq <- match(U3.GALP_qnames, U3.GALP_qnames)

## -----------------------------------------------------------------------------
head(unique(cigar(first(U3.GALP))))
head(unique(cigar(last(U3.GALP))))
table(njunc(first(U3.GALP)), njunc(last(U3.GALP)))

## -----------------------------------------------------------------------------
colSums(cigarOpTable(cigar(first(U3.GALP))))
colSums(cigarOpTable(cigar(last(U3.GALP))))

## -----------------------------------------------------------------------------
sessionInfo()

