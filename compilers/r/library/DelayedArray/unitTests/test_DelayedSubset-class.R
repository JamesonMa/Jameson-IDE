new_DelayedSubset <- DelayedArray:::new_DelayedSubset

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

test_DelayedSubset_constructor <- function(silent=FALSE)
{
    ## We also test nseed(), seed(), and is_noop()

    x <- new_DelayedSubset()
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(new("array"), seed(x))
    checkIdentical(list(NULL), x@index)
    checkTrue(is_noop(x))

    x <- new_DelayedSubset(.TEST_MATRIX2a)
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(NULL, NULL), x@index)
    checkTrue(is_noop(x))

    x <- new_DelayedSubset(.TEST_MATRIX2a, list(NULL, 5:4))
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(NULL, 5:4), x@index)
    checkIdentical(FALSE, is_noop(x))

    ## Test normalization of user-supplied 'Nindex' argument

    checkException(new_DelayedSubset(.TEST_MATRIX2a, 5:4),
                   silent=silent)
    checkException(new_DelayedSubset(.TEST_MATRIX2a, list(5:4)),
                   silent=silent)
    checkException(new_DelayedSubset(.TEST_MATRIX2a, list(NULL, 7:4)),
                   silent=silent)
    checkException(new_DelayedSubset(.TEST_MATRIX2a, list(NULL, "zz")),
                   silent=silent)

    x <- new_DelayedSubset(.TEST_MATRIX2a, list(0, c(5:4, 5.99, 6.99)))
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(integer(0), c(5:4, 5:6)), x@index)
    checkIdentical(FALSE, is_noop(x))

    x <- new_DelayedSubset(.TEST_MATRIX2a, list(NULL, -3))
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(NULL, c(1:2, 4:6)), x@index)
    checkIdentical(FALSE, is_noop(x))

    x <- new_DelayedSubset(.TEST_MATRIX2a, list(NULL, 1:6))
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(NULL, NULL), x@index)
    checkTrue(is_noop(x))

    x <- new_DelayedSubset(.TEST_MATRIX2a, list(-22, TRUE))
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(NULL, NULL), x@index)
    checkTrue(is_noop(x))

    x <- new_DelayedSubset(.TEST_MATRIX2a, list(NULL, c("E", "B", "C", "C")))
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(NULL, c(5L, 2L, 3L, 3L)), x@index)
    checkIdentical(FALSE, is_noop(x))

    x <- new_DelayedSubset(.TEST_MATRIX2a, list(IRanges(3:2, 5), IRanges(1, 6)))
    checkTrue(is(x, "DelayedSubset"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(c(3:5, 2:5), NULL), x@index)
    checkIdentical(FALSE, is_noop(x))

    checkException(new_DelayedSubset(.TEST_MATRIX2a, list(NULL, IRanges(0, 3))),
                   silent=silent)
    checkException(new_DelayedSubset(.TEST_MATRIX2a, list(NULL, IRanges(2, 7))),
                   silent=silent)
}

test_DelayedSubset_API <- function()
{
    ## 1. Ordinary array seed -- no-op

    x1 <- new_DelayedSubset(.TEST_MATRIX2a)

    .basic_checks_on_DelayedOp_with_DIM2(.TEST_MATRIX2a, x1)

    checkIdentical(FALSE, is_sparse(x1))

    ## 2. Ordinary array seed

    Nindex2 <- list(5:2, c(1:2, 5, 2:1))
    x2 <- new_DelayedSubset(.TEST_MATRIX2a, Nindex2)

    a2 <- .TEST_MATRIX2a[5:2, c(1:2, 5L, 2:1)]
    checkIdentical(dim(a2), dim(x2))
    checkIdentical(dimnames(a2), dimnames(x2))
    checkIdentical(a2, as.array(x2))

    current <- extract_array(x2, list(NULL, 4:2))
    checkIdentical(unname(a2[ , 4:2]), unname(current))
    current <- extract_array(x2, list(NULL, 4L))
    checkIdentical(unname(a2[ , 4L, drop=FALSE]), unname(current))
    current <- extract_array(x2, list(integer(0), NULL))
    checkIdentical(unname(a2[integer(0), ]), unname(current))

    checkIdentical(FALSE, is_sparse(x2))

    ## 3. Sparse seed -- no-op

    x3 <- new_DelayedSubset(.TEST_SVT3)

    .basic_checks_on_DelayedOp_with_DIM3(.TEST_ARRAY3, x3)
    .check_extract_sparse_array_on_DelayedOp_with_DIM3(.TEST_ARRAY3, x3)

    ## 4. Sparse seed -- structural sparsity propagated

    i3 <- c(3:8, 1L)
    index4 <- list(i3, 6:5, NULL)
    x4 <- new_DelayedSubset(.TEST_SVT3, index4)

    a4 <- .TEST_ARRAY3[i3, 6:5, , drop=FALSE]
    checkIdentical(dim(a4), dim(x4))
    checkIdentical(dimnames(a4), dimnames(x4))
    checkIdentical(a4, as.array(x4))

    current <- extract_array(x4, list(7:5, NULL, NULL))
    checkIdentical(unname(a4[7:5, , , drop=FALSE]), unname(current))
    current <- extract_array(x4, list(7:5, 2L, integer(0)))
    checkIdentical(unname(a4[7:5, 2L, integer(0), drop=FALSE]), unname(current))

    checkTrue(is_sparse(x4))
    svt4 <- extract_sparse_array(.TEST_SVT3, index4)
    ## The behavior of extract_sparse_array() is **undefined** when the
    ## subscripts in 'index' contain duplicates. See "extract_sparse_array()
    ## contract" in SparseArray/R/extract_sparse_array.R (SparseArray package).
    ## So do NOT use such subscripts in the tests below.
    current <- extract_sparse_array(x4, list(NULL, NULL, NULL))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(svt4, current)
    current <- extract_sparse_array(x4, list(c(6:7, 3:2), NULL, NULL))
    target <- extract_sparse_array(svt4, list(c(6:7, 3:2), NULL, NULL))
    checkIdentical(target, current)
    current <- extract_sparse_array(x4, list(c(6:7, 3:2), NULL, integer(0)))
    target <- extract_sparse_array(svt4, list(c(6:7, 3:2), NULL, integer(0)))
    checkIdentical(target, current)
    current <- extract_sparse_array(x4, list(c(6:7, 3:2), 2L, NULL))
    target <- extract_sparse_array(svt4, list(c(6:7, 3:2), 2L, NULL))
    checkIdentical(target, current)

    ## 5. Sparse seed but structural sparsity NOT propagated because
    ##    subscripts in 'Nindex' argument contain duplicates

    i3 <- c(3:8, 1L)
    Nindex5 <- list(i3, c(6:5, 6L), NULL)  # Nindex5[[2]] contains duplicates!
    x5 <- new_DelayedSubset(.TEST_SVT3, Nindex5)

    a5 <- .TEST_ARRAY3[i3, c(6:5, 6L), , drop=FALSE]
    checkIdentical(dim(a5), dim(x5))
    checkIdentical(dimnames(a5), dimnames(x5))
    checkIdentical(a5, as.array(x5))

    checkIdentical(FALSE, is_sparse(x5))  # structural sparsity not propagated!
}

