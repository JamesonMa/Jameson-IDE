## ----setup, include=FALSE-----------------------------------------------------
library(BiocStyle)
library(Seqinfo)
library(GenomeInfoDb)
library(GenomicFeatures)
library(BSgenome)
library(TxDb.Hsapiens.UCSC.hg38.knownGene)
library(BSgenome.Hsapiens.UCSC.hg38)

## ----install, eval=FALSE------------------------------------------------------
# if (!require("BiocManager", quietly=TRUE))
#     install.packages("BiocManager")
# BiocManager::install("Seqinfo")

## ----load, message=FALSE------------------------------------------------------
library(Seqinfo)

## ----Seqinfo_contructor_1-----------------------------------------------------
## Note that all the arguments (except 'genome') must have the
## same length. 'genome' can be of length 1, whatever the lengths
## of the other arguments are.
si1 <- Seqinfo(seqnames=c("chr1", "chr2", "chr3", "chrM"),
               seqlengths=c(100, 200, NA, 15),
               isCircular=c(NA, FALSE, FALSE, TRUE),
               genome="toy")
si1

## ----Seqinfo_contructor_2-----------------------------------------------------
library(GenomeInfoDb)  # just making sure that the package is installed

Seqinfo(genome="GRCh38.p14")

Seqinfo(genome="hg38")

## ----Seqinfo_accessors--------------------------------------------------------
length(si1)
seqnames(si1)
names(si1)
seqlevels(si1)
seqlengths(si1)
isCircular(si1)
genome(si1)

## ----Seqinfo_subsetting-------------------------------------------------------
si1[c("chrY", "chr3", "chr1")]

## ----rename_Seqinfo-----------------------------------------------------------
si <- si1
seqlevels(si) <- sub("chr", "ch", seqlevels(si))
si

## ----reorder_Seqinfo----------------------------------------------------------
seqlevels(si) <- rev(seqlevels(si))
si

## ----drop_add_reorder_Seqinfo-------------------------------------------------
seqlevels(si) <- c("ch1", "ch2", "chY")
si

## ----rename_reorder_drop_add_Seqinfo------------------------------------------
seqlevels(si) <- c(chY="Y", ch1="1", "22")
si

## ----merge_compatible_Seqinfo_objects-----------------------------------------
si2 <- Seqinfo(seqnames=c("chr3", "chr4", "chrM"),
               seqlengths=c(300, NA, 15))
si2

merge(si1, si2)  # rows for chr3 and chrM are merged

suppressWarnings(merge(si1, si2))

## ----merge_is_not_commutative-------------------------------------------------
suppressWarnings(merge(si2, si1))

## ----merge_incompatible_Seqinfo_objects---------------------------------------
## This contradicts what 'x' says about circularity of chr3 and chrM:
isCircular(si2)[c("chr3", "chrM")] <- c(TRUE, FALSE)
si2

## ----eval=FALSE---------------------------------------------------------------
# merge(si1, si2)  # ERROR!
# ## Error in mergeNamedAtomicVectors(isCircular(x), isCircular(y), what = c("sequence",  :
# ##   sequences chr3, chrM have incompatible circularity flags:
# ##   - in 'x': FALSE, TRUE
# ##   - in 'y': TRUE, FALSE

## ----seqinfo_TxDb-------------------------------------------------------------
library(TxDb.Hsapiens.UCSC.hg38.knownGene)
txdb <- TxDb.Hsapiens.UCSC.hg38.knownGene
class(txdb)
seqinfo(txdb)

## ----seqinfo_BSgenome---------------------------------------------------------
library(BSgenome.Hsapiens.UCSC.hg38)
bsg <- BSgenome.Hsapiens.UCSC.hg38
class(bsg)
seqinfo(bsg)

## ----sanity_checks------------------------------------------------------------
stopifnot(identical(seqinfo(txdb), Seqinfo(genome="hg38")))
stopifnot(identical(seqinfo(bsg), Seqinfo(genome="hg38")))

## -----------------------------------------------------------------------------
sessionInfo()

