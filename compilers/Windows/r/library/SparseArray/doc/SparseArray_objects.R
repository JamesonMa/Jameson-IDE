## ----setup, include=FALSE-----------------------------------------------------
library(BiocStyle)

## ----eval=FALSE---------------------------------------------------------------
# if (!require("BiocManager", quietly=TRUE))
#     install.packages("BiocManager")
# BiocManager::install("SparseArray")

## ----message=FALSE------------------------------------------------------------
library(SparseArray)

## -----------------------------------------------------------------------------
svt1 <- SVT_SparseArray(dim=c(6, 4))
svt1[c(1:2, 8, 10, 15:17, 24)] <- (1:8)*10L
svt1

svt2 <- SVT_SparseArray(dim=5:3)
svt2[c(1:2, 8, 10, 15:17, 20, 24, 40, 56:60)] <- (1:15)*10L
svt2

## -----------------------------------------------------------------------------
# Coerce a dgCMatrix object to SVT_SparseArray:
dgcm <- Matrix::rsparsematrix(12, 5, density=0.15)
svt3 <- as(dgcm, "SVT_SparseArray")

# Coerce a TENxMatrix object to SVT_SparseArray:
suppressMessages(library(HDF5Array))
M <- writeTENxMatrix(svt3)
svt3b <- as(M, "SVT_SparseArray")

# Sanity check:
stopifnot(identical(svt3, svt3b))

## -----------------------------------------------------------------------------
svt3  <- SVT_SparseArray(dgcm)  # same as as(dgcm, "SVT_SparseArray")
svt3b <- SVT_SparseArray(M)     # same as as(M, "SVT_SparseArray")

## -----------------------------------------------------------------------------
# Coerce an ordinary matrix to SparseArray:
a <- array(rpois(80, lambda=0.35), dim=c(5, 8, 2))
class(as(a, "SparseArray"))  # SVT_SparseArray

# Coerce a dgCMatrix object to SparseArray:
svt3  <- as(dgcm, "SparseArray")
class(svt3)  # SVT_SparseArray

# Coerce a TENxMatrix object to SparseArray:
svt3b <- as(M, "SparseArray")
class(svt3)  # SVT_SparseArray

## -----------------------------------------------------------------------------
SparseArray(a)              # same as as(a, "SparseArray")
svt3  <- SparseArray(dgcm)  # same as as(dgcm, "SparseArray")
svt3b <- SparseArray(M)     # same as as(M, "SparseArray")

## -----------------------------------------------------------------------------
ngrm <- sparseMatrix(i=c(1, 5, 5, 6), j=c(4, 2, 3, 2), repr="R")
class(ngrm)  # ngRMatrix
class(SparseArray(ngrm))  # COO_SparseMatrix

## -----------------------------------------------------------------------------
svt <- as(SparseArray(ngrm), "SVT_SparseArray")
class(svt)  # SVT_SparseMatrix

## -----------------------------------------------------------------------------
as.array(svt1)  # same as as.matrix(svt1)

as.array(svt2)

## -----------------------------------------------------------------------------
dim(svt2)

length(svt2)

dimnames(svt2) <- list(NULL, letters[1:4], LETTERS[1:3])
svt2

## -----------------------------------------------------------------------------
type(svt1)

type(svt1) <- "double"
svt1

is_sparse(svt1)

## -----------------------------------------------------------------------------
is_nonzero(svt1)

## Get the number of nonzero array elements in 'svt1':
nzcount(svt1)

## Extract the "linear indices" of the nonzero array elements in 'svt1':
nzwhich(svt1)

## Extract the "array indices" (a.k.a. "array coordinates") of the
## nonzero array elements in 'svt1':
nzwhich(svt1, arr.ind=TRUE)

## Extract the values of the nonzero array elements in 'svt1':
nzvals(svt1)

## -----------------------------------------------------------------------------
svt2[5:3, , "C"]

## -----------------------------------------------------------------------------
type(svt2)
svt2[5, 1, 3] <- NaN
type(svt2)

## -----------------------------------------------------------------------------
anyNA(svt2)

range(svt2, na.rm=TRUE)

mean(svt2, na.rm=TRUE)

var(svt2, na.rm=TRUE)

## -----------------------------------------------------------------------------
signif((svt1^1.5 + svt1) %% 100 - 0.6 * svt1, digits=2)

## -----------------------------------------------------------------------------
t(svt1)

## -----------------------------------------------------------------------------
aperm(svt2)

## -----------------------------------------------------------------------------
svt4 <- poissonSparseMatrix(6, 2, density=0.5)

cbind(svt1, svt4)

## -----------------------------------------------------------------------------
svt5a <- poissonSparseArray(c(5, 6, 2), density=0.4)
svt5b <- poissonSparseArray(c(5, 6, 5), density=0.2)
svt5c <- poissonSparseArray(c(5, 6, 4), density=0.2)
abind(svt5a, svt5b, svt5c)

svt6a <- aperm(svt5a, c(1, 3:2))
svt6b <- aperm(svt5b, c(1, 3:2))
svt6c <- aperm(svt5c, c(1, 3:2))
abind(svt6a, svt6b, svt6c, along=2)

## -----------------------------------------------------------------------------
svt7 <- SVT_SparseArray(dim=5:6, dimnames=list(letters[1:5], LETTERS[1:6]))
svt7[c(2, 6, 12:17, 22:30)] <- 101:117

colVars(svt7)

## -----------------------------------------------------------------------------
colVars(svt2)
colVars(svt2, dims=2)

colAnyNAs(svt2)
colAnyNAs(svt2, dims=2)

## -----------------------------------------------------------------------------
rowsum(svt7, group=c(1:3, 2:1))

colsum(svt7, group=c("A", "B", "A", "B", "B", "A"))

## -----------------------------------------------------------------------------
svt7 %*% svt4

## -----------------------------------------------------------------------------
crossprod(svt4)

## -----------------------------------------------------------------------------
randomSparseArray(c(5, 6, 2), density=0.5)

poissonSparseArray(c(5, 6, 2), density=0.5)

## -----------------------------------------------------------------------------
csv_file <- tempfile()
writeSparseCSV(svt7, csv_file)

## -----------------------------------------------------------------------------
readSparseCSV(csv_file)

## -----------------------------------------------------------------------------
suppressMessages(library(HDF5Array))
suppressMessages(library(ExperimentHub))
hub <- ExperimentHub()
oneM <- TENxMatrix(hub[["EH1039"]], group="mm10")
oneM

## -----------------------------------------------------------------------------
nzcount(oneM)

## ----eval=FALSE---------------------------------------------------------------
# # WARNING: This takes a couple of minutes on a modern laptop, and will
# # consume about 25Gb of RAM!
# svt <- as(oneM, "SVT_SparseArray")

## ----eval=FALSE---------------------------------------------------------------
# # This will fail because 'oneM' has more than 2^31 nonzero values!
# as(oneM, "dgCMatrix")

## -----------------------------------------------------------------------------
sessionInfo()

