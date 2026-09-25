### ===========================================================================
### EXAMPLE 1
### On the importance of acknowledging the geometry of physical chunks

library(DelayedArray)
library(HDF5Array)

super_BLOCK_mult <- DelayedArray:::.super_BLOCK_mult
BLOCK_mult_Lgrid <- DelayedArray:::BLOCK_mult_Lgrid
BLOCK_mult_Rgrid <- DelayedArray:::BLOCK_mult_Rgrid

set.seed(2009)
m1 <- matrix(runif(15e6), ncol=1000)   # 15000 x 1000
m2 <- matrix(runif(4000), nrow=1000)   # 1000 x 4
#M1 <- writeTENxMatrix(m1, "M1.h5", group="M1")
M1 <- TENxMatrix("M1.h5", group="M1")  # column oriented!
M2 <- writeTENxMatrix(m2)

m0 <- m1 %*% m2

setAutoBlockSize(1e6)

## m1 %*% m2
res1 <- super_BLOCK_mult(m1, m2, MULT=`%*%`)
stopifnot(identical(as.matrix(res1), m0))
res2 <- BLOCK_mult_Lgrid(m1, m2)
stopifnot(all.equal(res2, m0))

## M1 %*% m2
res3 <- super_BLOCK_mult(M1, m2, MULT=`%*%`)         # 120 s
stopifnot(identical(as.matrix(res3), m0))
res4 <- BLOCK_mult_Lgrid(M1, m2)  # 1.58 s
stopifnot(all.equal(res4, m0))
### The difference lies in how super_BLOCK_mult() and
### BLOCK_mult_Lgrid() walk on M1. The former
### walks on blocks made of full rows while the latter walks on
### blocks made of full cols. For a TENxMatrix object like M1,
### loading a full row is bad because it actually loads the entire
### dataset in memory. This means that, for each block that it processes,
### super_BLOCK_mult() will load the entire dataset in memory!

## m1 %*% M2
res5 <- super_BLOCK_mult(m1, M2, MULT=`%*%`)
stopifnot(identical(as.matrix(res5), m0))
res6 <- BLOCK_mult_Rgrid(m1, M2)
stopifnot(all.equal(res6, m0))


### ===========================================================================
### EXAMPLE 2

### With a subset of the 1.3 Million Brain Cell Dataset
library(HDF5Array)
DelayedArray:::set_verbose_block_processing(TRUE)
library(ExperimentHub)
hub <- ExperimentHub()
tenx <- TENxMatrix(hub[["EH1039"]], group="mm10")

### 12.5k cols:
M <- tenx[ , 1:12500]
set.seed(2009)
m <- cbind(runif(ncol(M)), runif(ncol(M)))
system.time(res <- M %*% m)  # 4.3s / 1.1Gb (was 32s / 2.1Gb)

### 25k cols:
M <- tenx[ , 1:25000]
set.seed(2009)
m <- cbind(runif(ncol(M)), runif(ncol(M)))
system.time(res <- M %*% m)  # 7.6s / 1.1Gb (was 110s / 3.1Gb)

### 50k cols:
M <- tenx[ , 1:50000]
set.seed(2009)
m <- cbind(runif(ncol(M)), runif(ncol(M)))
system.time(res <- M %*% m)  # 13.4s / 1.1Gb  (was 495s / 5.6Gb)

### 100k cols:
M <- tenx[ , 1:100000]
set.seed(2009)
m <- cbind(runif(ncol(M)), runif(ncol(M)))
system.time(res <- M %*% m)  # 24s / 1.2Gg  (was 2409s / 9.1Gb)


### ===========================================================================
### EXAMPLE 3

library(HDF5Array)
library(ExperimentHub)
hub <- ExperimentHub()
M <- TENxMatrix(hub[["EH1039"]], group="mm10") # 1.3 Million Brain Cell Dataset

### Find Singular Values with RSpectra::svds() (note that one would
### typically log-normalize the data before doing this but we're skipping
### that step here to keep things as simple as possible):
library(RSpectra)
#DelayedArray:::set_verbose_block_processing(TRUE)
system.time(row_means <- rowMeans(M))  # 368s / 1.2Gb
Ax <- function(x, args) {M %*% x - row_means * sum(x)}
Atx <- function(x, args) {x %*% M - as.vector(row_means %*% x)}
### Will take a while, but memory usage will stay under 2Gb!
svd <- RSpectra::svds(Ax, Atrans=Atx, k=2, dim=dim(M))


### ===========================================================================
### EXAMPLE 4

library(DelayedArray)
library(HDF5Array)
super_BLOCK_mult <- DelayedArray:::.super_BLOCK_mult
BLOCK_mult_Lgrid <- DelayedArray:::BLOCK_mult_Lgrid
DelayedArray:::set_verbose_block_processing(TRUE)
#setAutoBlockSize(1e6)
setAutoBlockSize(1e7)
setAutoBPPARAM(BiocParallel::SnowParam(2))

set.seed(2009)
m3 <- matrix(runif(21e6), ncol=600) # 35000 x 600
set.seed(1972)
m4 <- matrix(runif(9e6), nrow=600)  # 600 x 15000
#M3 <- writeHDF5Array(m3, "M3.h5", name="M3", chunkdim=c(50, 50))
#M3 <- HDF5Array("M3.h5", name="M3")

#m34 <- m3 %*% m4  # 168s / 4.5g

## m3 %*% m4
res1 <- super_BLOCK_mult(m3, m4, MULT=`%*%`)
# block size = 1e6 -> 113s / 8.5g
# block size = 1e7 -> 107s / 8.4g
# block size = 1e7; SnowParam(2) -> 73s / 8.5g
# block size = 1e7; SnowParam(4) -> 62s / 8.5g (4 workers used 11g!)
stopifnot(identical(as.matrix(res1), m34))
res2 <- BLOCK_mult_Lgrid(m3, m4)
# block size = 1e6 -> 118s / 8.7g
# block size = 1e7 -> 112s / 8.5g
# block size = 1e7; SnowParam(2) -> 76s / 8.5g
# block size = 1e7; SnowParam(4) -> 64s / 8.5 g (4 workers used 16g!)
stopifnot(all.equal(res2, m34))

## m3 %*% m4 but now writing the result to disk
setAutoRealizationBackend("HDF5Array")
res3 <- super_BLOCK_mult(m3, m4, MULT=`%*%`)
# block size = 1e6 -> 206s / 9.2g
# block size = 1e7 -> 201s / 9.2g
stopifnot(identical(as.matrix(res3), m34))
res4 <- BLOCK_mult_Lgrid(m3, m4)
# block size = 1e6 -> 213s / 1g
# block size = 1e7 -> 202s / 1.9g
res4b <- realize(res4)
# block size = 1e6 -> 287s / 1.2g
# block size = 1e7 -> 141s / 1.5g
stopifnot(all.equal(res4b, m34))

# and if we parallelize?
