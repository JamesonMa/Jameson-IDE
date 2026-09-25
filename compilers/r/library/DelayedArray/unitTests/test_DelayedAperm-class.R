new_DelayedAperm <- DelayedArray:::new_DelayedAperm

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

test_DelayedAperm_constructor <- function(silent=FALSE)
{
    ## We also test nseed(), seed(), and is_noop()

    x <- new_DelayedAperm()
    checkTrue(is(x, "DelayedAperm"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(new("array"), seed(x))
    checkIdentical(1L, x@perm)
    checkTrue(is_noop(x))

    x <- new_DelayedAperm(.TEST_SVT3)
    checkTrue(is(x, "DelayedAperm"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_SVT3, seed(x))
    checkIdentical(1:3, x@perm)
    checkTrue(is_noop(x))

    x <- new_DelayedAperm(.TEST_SVT3, 3:1)
    checkTrue(is(x, "DelayedAperm"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_SVT3, seed(x))
    checkIdentical(3:1, x@perm)
    checkIdentical(FALSE, is_noop(x))

    checkException(new_DelayedAperm(.TEST_SVT3, "2"), silent=silent)
    checkException(new_DelayedAperm(.TEST_SVT3, integer(0)), silent=silent)
    checkException(new_DelayedAperm(.TEST_SVT3, NA_integer_), silent=silent)
    checkException(new_DelayedAperm(.TEST_SVT3, 9L), silent=silent)
    checkException(new_DelayedAperm(.TEST_SVT3, 1L), silent=silent)

    x <- new_DelayedAperm(.TEST_SVT3, 2:1)
    checkTrue(is(x, "DelayedAperm"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_SVT3, seed(x))
    checkIdentical(2:1, x@perm)
    checkIdentical(FALSE, is_noop(x))
}

test_DelayedAperm_API <- function()
{
    ## 1. Ordinary array seed -- no-op

    x1 <- new_DelayedAperm(.TEST_MATRIX2a)

    .basic_checks_on_DelayedOp_with_DIM2(.TEST_MATRIX2a, x1)

    checkIdentical(FALSE, is_sparse(x1))

    ## 2. Ordinary array seed -- transposition

    x2 <- new_DelayedAperm(.TEST_MATRIX2a, 2:1)

    a2 <- t(.TEST_MATRIX2a)
    checkIdentical(dim(a2), dim(x2))
    checkIdentical(dimnames(a2), dimnames(x2))
    checkIdentical(a2, as.array(x2))

    current <- extract_array(x2, list(4:2, NULL))
    checkIdentical(unname(a2[4:2, ]), unname(current))
    current <- extract_array(x2, list(4L, NULL))
    checkIdentical(unname(a2[4L, , drop=FALSE]), unname(current))
    current <- extract_array(x2, list(NULL, integer(0)))
    checkIdentical(unname(a2[ , integer(0)]), unname(current))

    checkIdentical(FALSE, is_sparse(x2))

    ## 3. Sparse seed -- no-op

    x3 <- new_DelayedAperm(.TEST_SVT3)

    .basic_checks_on_DelayedOp_with_DIM3(.TEST_ARRAY3, x3)
    .check_extract_sparse_array_on_DelayedOp_with_DIM3(.TEST_ARRAY3, x3)

    ## 4. Sparse seed -- transpose 1st and 3rd dims

    x4 <- new_DelayedAperm(.TEST_SVT3, 3:1)

    a4 <- aperm(.TEST_ARRAY3, 3:1)
    checkIdentical(dim(a4), dim(x4))
    checkIdentical(dimnames(a4), dimnames(x4))
    checkIdentical(a4, as.array(x4))

    i3 <- c(3:8, 1L)
    current <- extract_array(x4, list(NULL, 6:5, i3))
    checkIdentical(unname(a4[ , 6:5, i3, drop=FALSE]), unname(current))
    current <- extract_array(x4, list(NULL, c(6:5, 6L), i3))
    checkIdentical(unname(a4[ , c(6:5, 6L), i3, drop=FALSE]), unname(current))
    current <- extract_array(x4, list(integer(0), c(6:5, 6L), i3))
    checkIdentical(unname(a4[integer(0), c(6:5, 6L), i3]), unname(current))

    checkTrue(is_sparse(x4))
    svt4 <- aperm(.TEST_SVT3, 3:1)
    ## The behavior of extract_sparse_array() is **undefined** when the
    ## subscripts in 'index' contain duplicates. See "extract_sparse_array()
    ## contract" in SparseArray/R/extract_sparse_array.R (SparseArray package).
    ## So do NOT use such subscripts in the tests below.
    current <- extract_sparse_array(x4, list(NULL, NULL, NULL))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(svt4, current)
    current <- extract_sparse_array(x4, list(NULL, 6:5, i3))
    target <- extract_sparse_array(svt4, list(NULL, 6:5, i3))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(target, current)
    current <- extract_sparse_array(x4, list(integer(0), 6:5, i3))
    target <- extract_sparse_array(svt4, list(integer(0), 6:5, i3))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(target, current)

    ## 5. Sparse seed -- transpose 1st and 2nd dims and drop 3rd dim

    x5 <- new_DelayedAperm(.TEST_SVT3, 2:1)

    a5 <- t(drop(.TEST_ARRAY3))
    checkIdentical(dim(a5), dim(x5))
    checkIdentical(dimnames(a5), dimnames(x5))
    checkIdentical(a5, as.array(x5))

    i3 <- c(3:8, 1L)
    current <- extract_array(x5, list(6:5, i3))
    checkIdentical(unname(a5[6:5, i3]), unname(current))
    current <- extract_array(x5, list(c(6:5, 6L), i3))
    checkIdentical(unname(a5[c(6:5, 6L), i3]), unname(current))
    current <- extract_array(x5, list(c(6:5, 6L), integer(0)))
    checkIdentical(unname(a5[c(6:5, 6L), integer(0)]), unname(current))

    checkTrue(is_sparse(x5))
    svt5 <- aperm(.TEST_SVT3, 2:1)
    ## The behavior of extract_sparse_array() is **undefined** when the
    ## subscripts in 'index' contain duplicates. See "extract_sparse_array()
    ## contract" in SparseArray/R/extract_sparse_array.R (SparseArray package).
    ## So do NOT use such subscripts in the tests below.
    current <- extract_sparse_array(x5, list(NULL, NULL))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(svt5, current)
    current <- extract_sparse_array(x5, list(6:5, i3))
    target <- extract_sparse_array(svt5, list(6:5, i3))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(target, current)
    current <- extract_sparse_array(x5, list(6:5, integer(0)))
    target <- extract_sparse_array(svt5, list(6:5, integer(0)))
    checkTrue(is(current, "SVT_SparseArray"))
    checkIdentical(target, current)
}

