new_DelayedUnaryIsoOpStack <- DelayedArray:::new_DelayedUnaryIsoOpStack

.TEST_MATRIX2a <- matrix(c(5:-2, rep.int(c(0L, 99L), 11)), ncol=6,
                         dimnames=list(NULL, LETTERS[1:6]))

.TEST_SVT3 <- SVT_SparseArray(dim=c(40, 100, 1))
.TEST_SVT3[Lindex2Mindex(1:50, c(10, 5, 1))] <- 1:50

.TEST_ARRAY3 <- as.array(.TEST_SVT3)


.basic_checks_on_DelayedOp_with_DIM2 <- function(a, x)
{
    ## We use suppressWarnings() to suppress the warnings that some
    ## calls to extract_array() could generate on some particular
    ## DelayedOp objects. For example on a DelayedUnaryIsoOpStack object
    ## with the log() function in its OPS stack and negative array elements
    ## in its seed. These warnings are expected but annoying in the context
    ## of unit tests.
    checkIdentical(dim(a), dim(x))
    checkIdentical(dimnames(a), dimnames(x))
    checkIdentical(a, suppressWarnings(as.array(x)))

    i2 <- c(1:2, 6:2, 2:1)
    current <- suppressWarnings(extract_array(x, list(5:2, i2)))
    checkIdentical(unname(a[5:2, i2]), unname(current))
    current <- suppressWarnings(extract_array(x, list(5:2, NULL)))
    checkIdentical(unname(a[5:2, ]), unname(current))
    current <- suppressWarnings(extract_array(x, list(5:2, 2L)))
    checkIdentical(unname(a[5:2, 2L, drop=FALSE]), unname(current))
    current <- suppressWarnings(extract_array(x, list(5:2, integer(0))))
    checkIdentical(unname(a[5:2, integer(0)]), unname(current))
}

.basic_checks_on_DelayedOp_with_DIM3 <- function(a, x)
{
    checkIdentical(dim(a), dim(x))
    checkIdentical(dimnames(a), dimnames(x))
    checkIdentical(a, as.array(x))

    i3 <- c(3:8, 1L)
    current <- extract_array(x, list(i3, 6:5, NULL))
    checkIdentical(unname(a[i3, 6:5, , drop=FALSE]), unname(current))
    current <- extract_array(x, list(i3, c(6:5, 6L), NULL))
    checkIdentical(unname(a[i3, c(6:5, 6L), , drop=FALSE]), unname(current))
    current <- extract_array(x, list(i3, c(6:5, 6L), integer(0)))
    checkIdentical(unname(a[i3, c(6:5, 6L), integer(0)]), unname(current))
}

.check_extract_sparse_array_on_DelayedOp_with_DIM3 <- function(a, x)
{
    checkTrue(is_sparse(x))

    ## The behavior of extract_sparse_array() is **undefined** when the
    ## subscripts in 'index' contain duplicates. See "extract_sparse_array()
    ## contract" in SparseArray/R/extract_sparse_array.R (SparseArray package).
    ## So do NOT use such subscripts in the tests below.
    current <- extract_sparse_array(x, list(NULL, NULL, NULL))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(a, as.array(current))

    i3 <- c(3:8, 1L)
    current <- extract_sparse_array(x, list(i3, 6:5, NULL))
    checkTrue(is(current, "SVT_SparseArray"))
    target <- extract_array(a, list(i3, 6:5, NULL))
    checkIdentical(target, as.array(current))

    current <- extract_sparse_array(x, list(i3, 6:5, integer(0)))
    checkTrue(is(current, "SVT_SparseArray"))
    target <- extract_array(a, list(i3, 6:5, integer(0)))
    checkIdentical(target, as.array(current))
}


### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
### test_* functions
###

test_DelayedUnaryIsoOpStack_constructor <- function(silent=FALSE)
{
    ## We also test nseed(), seed(), and is_noop()

    x <- new_DelayedUnaryIsoOpStack()
    checkTrue(is(x, "DelayedUnaryIsoOpStack"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(new("array"), seed(x))
    checkIdentical(list(), x@OPS)
    #checkTrue(is_noop(x))  # no is_noop() yet for DelayedUnaryIsoOpStack objects

    x <- new_DelayedUnaryIsoOpStack(.TEST_SVT3)
    checkTrue(is(x, "DelayedUnaryIsoOpStack"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_SVT3, seed(x))
    checkIdentical(list(), x@OPS)
    #checkTrue(is_noop(x))

    OPS <- list(function(a) log(a),
                function(a) a^2 + 1,
                function(a) 1 / a)
    x <- new_DelayedUnaryIsoOpStack(.TEST_SVT3, OPS)
    checkTrue(is(x, "DelayedUnaryIsoOpStack"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_SVT3, seed(x))
    checkIdentical(OPS, x@OPS)
    #checkIdentical(FALSE, is_noop(x))

    checkException(new_DelayedUnaryIsoOpStack(.TEST_SVT3, NULL),
                   silent=silent)
    checkException(new_DelayedUnaryIsoOpStack(.TEST_SVT3, list(NULL)),
                   silent=silent)
    checkException(new_DelayedUnaryIsoOpStack(.TEST_SVT3,
                                              list("not-an-existing-function")),
                   silent=silent)
}

test_DelayedUnaryIsoOpStack_API <- function()
{
    ## 1. Ordinary array seed -- no-op

    x1 <- new_DelayedUnaryIsoOpStack(.TEST_MATRIX2a)

    .basic_checks_on_DelayedOp_with_DIM2(.TEST_MATRIX2a, x1)

    checkIdentical(FALSE, is_sparse(x1))

    ## 2. Ordinary array seed -- 1 / (log(a)^2 + 1)

    OPS <- list(function(a) log(a),
                function(a) a^2 + 1,
                function(a) 1 / a)
    x2 <- new_DelayedUnaryIsoOpStack(.TEST_MATRIX2a, OPS)

    a2 <- suppressWarnings(1 / (log(.TEST_MATRIX2a)^2 + 1))
    .basic_checks_on_DelayedOp_with_DIM2(a2, x2)

    checkIdentical(FALSE, is_sparse(x2))

    ## 3. Sparse seed -- no-op

    x3 <- new_DelayedUnaryIsoOpStack(.TEST_SVT3)

    .basic_checks_on_DelayedOp_with_DIM3(.TEST_ARRAY3, x3)
    .check_extract_sparse_array_on_DelayedOp_with_DIM3(.TEST_ARRAY3, x3)

    ## 4. Sparse seed -- != 0

    OPS <- list(function(a) a != 0L)
    x4 <- new_DelayedUnaryIsoOpStack(.TEST_SVT3, OPS)

    a4 <- .TEST_ARRAY3 != 0L
    .basic_checks_on_DelayedOp_with_DIM3(a4, x4)
    .check_extract_sparse_array_on_DelayedOp_with_DIM3(a4, x4)

    ## 5. Sparse seed -- 1 / (log(a)^2 + 1)

    OPS <- list(function(a) log(a),
                function(a) a^2 + 1,
                function(a) 1 / a)
    x5 <- new_DelayedUnaryIsoOpStack(.TEST_SVT3, OPS)

    a5 <- 1 / (log(.TEST_ARRAY3)^2 + 1)
    .basic_checks_on_DelayedOp_with_DIM3(a5, x5)
    .check_extract_sparse_array_on_DelayedOp_with_DIM3(a5, x5)

    ## 6. Sparse seed but structural sparsity NOT propagated because
    ##    the stack of operations doesn't preserve the zeros

    OPS <- list(function(a) cos(a),
                function(a) log(a^2 + 1))
    x6 <- new_DelayedUnaryIsoOpStack(.TEST_SVT3, OPS)

    a6 <- log(cos(.TEST_ARRAY3)^2 + 1)  # does not preserve the zeros
    checkIdentical(dim(a6), dim(x6))
    checkIdentical(dimnames(a6), dimnames(x6))
    checkIdentical(a6, as.array(x6))

    checkIdentical(FALSE, is_sparse(x6))  # structural sparsity not propagated!
}

