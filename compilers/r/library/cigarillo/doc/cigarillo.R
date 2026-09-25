## ----setup, include=FALSE-----------------------------------------------------
library(BiocStyle)
library(cigarillo)

## ----install, eval=FALSE------------------------------------------------------
# if (!require("BiocManager", quietly=TRUE))
#     install.packages("BiocManager")
# BiocManager::install("cigarillo")

## ----load, message=FALSE------------------------------------------------------
library(cigarillo)

## ----explode_cigars-----------------------------------------------------------
my_cigars <- c(
    "40M2I9M",
    "60M",
    "3H15M55N4M2I6M2D5M6S",
    "50=2X3=1X10=",
    "2S10M2000N15M",
    "3H33M5H"
)
explode_cigar_ops(my_cigars)
explode_cigar_oplens(my_cigars)

## ----tabulate_cigar_ops-------------------------------------------------------
tabulate_cigar_ops(my_cigars)

## ----cigar_extent-------------------------------------------------------------
cigar_extent_along_ref(my_cigars)
cigar_extent_along_query(my_cigars)

## ----trim_cigars--------------------------------------------------------------
cigar1 <- "3H15M55N4M2I6M2D5M6S"

trim_cigars_along_ref(cigar1)  # only drops the soft/hard clipping

trim_cigars_along_ref(cigar1, Lnpos=14, Rnpos=16)

trim_cigars_along_query(cigar1, Lnpos=19, Rnpos=2)

## ----cigars_as_ranges---------------------------------------------------------
cigars_as_ranges_along_ref(my_cigars, with.ops=TRUE)

lmmpos <- c(1001, 2001, 3001, 4001, 5001, 6001)
cigars_as_ranges_along_ref(my_cigars, lmmpos=lmmpos, with.ops=TRUE)

cigars_as_ranges_along_query(my_cigars, with.ops=TRUE)

## ----project_positions--------------------------------------------------------
my_query_pos <- 1:9
my_cigars <- rep("3M2I2M60N2M", 9)
query_pos_as_ref_pos(my_query_pos, my_cigars, lmmpos=51, narrow.left=TRUE)

## ----project_sequences_1------------------------------------------------------
qseqs <- BStringSet(c(id1="XZ",  id2="ABCdeFGKL",  id3="MNoPQTUV"))
rseqs <- BStringSet(c(id1="XyZ", id2="ABCFGhijKL", id3="MNPQrsTUV"))

## ----project_sequences_2------------------------------------------------------
aligned_qseqs <- BStringSet(c(id1="X-Z", id2="ABCdeFG...KL", id3="MNoPQ--TUV"))
aligned_rseqs <- BStringSet(c(id1="XyZ", id2="ABC--FGhijKL", id3="MN-PQrsTUV"))

## ----project_sequences_3------------------------------------------------------
cigars <- c(id1="1M1D1M", id2="3M2I2M3N2M", id3="2M1I2M2D3M")

## ----project_sequences_4------------------------------------------------------
project_sequences(qseqs, cigars, from="query", to="pairwise")
project_sequences(rseqs, cigars, from="reference", to="pairwise")

## ----project_sequences_5------------------------------------------------------
project_sequences(aligned_qseqs, cigars, from="pairwise", to="query")
project_sequences(aligned_rseqs, cigars, from="pairwise", to="reference")

## ----project_sequences_6------------------------------------------------------
project_sequences(qseqs, cigars, from="query", to="reference")

## ----project_sequences_7------------------------------------------------------
project_sequences(rseqs, cigars, from="reference", to="query")

## ----sessionInfo--------------------------------------------------------------
sessionInfo()

