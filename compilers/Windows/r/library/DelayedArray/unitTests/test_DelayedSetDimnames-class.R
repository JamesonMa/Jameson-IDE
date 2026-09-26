new_DelayedSetDimnames <- DelayedArray:::new_DelayedSetDimnames
.INHERIT_FROM_SEED <- DelayedArray:::.INHERIT_FROM_SEED

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


### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
### test_* functions
###

test_DelayedSetDimnames_constructor <- function(silent=FALSE)
{
    ## We also test nseed(), seed(), and is_noop()

    x <- new_DelayedSetDimnames()
    checkTrue(is(x, "DelayedSetDimnames"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(new("array"), seed(x))
    checkIdentical(list(.INHERIT_FROM_SEED), x@dimnames)
    checkTrue(is_noop(x))

    x <- new_DelayedSetDimnames(.TEST_MATRIX2a)
    checkTrue(is(x, "DelayedSetDimnames"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(rep(list(.INHERIT_FROM_SEED), 2), x@dimnames)
    checkTrue(is_noop(x))

    x <- new_DelayedSetDimnames(.TEST_MATRIX2a, dimnames(.TEST_MATRIX2a))
    checkTrue(is(x, "DelayedSetDimnames"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(rep(list(.INHERIT_FROM_SEED), 2), x@dimnames)
    checkTrue(is_noop(x))

    x <- new_DelayedSetDimnames(.TEST_MATRIX2a, NULL)
    checkTrue(is(x, "DelayedSetDimnames"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(.INHERIT_FROM_SEED, NULL), x@dimnames)
    checkIdentical(FALSE, is_noop(x))
    x2 <- new_DelayedSetDimnames(.TEST_MATRIX2a, list(NULL))
    checkIdentical(x, x2)
    x3 <- new_DelayedSetDimnames(.TEST_MATRIX2a, list(NULL, NULL))
    checkIdentical(x, x3)

    x <- new_DelayedSetDimnames(.TEST_MATRIX2a, list(letters[1:5], NULL))
    checkTrue(is(x, "DelayedSetDimnames"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkIdentical(.TEST_MATRIX2a, seed(x))
    checkIdentical(list(letters[1:5], NULL), x@dimnames)
    checkIdentical(FALSE, is_noop(x))
    x2 <- new_DelayedSetDimnames(.TEST_MATRIX2a, list(letters[1:5]))
    checkIdentical(x, x2)

    checkException(new_DelayedSetDimnames(.TEST_MATRIX2a, letters),
                   silent=silent)
    checkException(new_DelayedSetDimnames(.TEST_MATRIX2a, list(NULL, NULL, NULL)),
                   silent=silent)
    checkException(new_DelayedSetDimnames(.TEST_MATRIX2a, list(ls, NULL)),
                   silent=silent)
    checkException(new_DelayedSetDimnames(.TEST_MATRIX2a, list(letters, NULL)),
                   silent=silent)
}

test_DelayedSetDimnames_API <- function()
{
    ## 1. Ordinary array seed -- no-op

    x1 <- new_DelayedSetDimnames(.TEST_MATRIX2a)

    .basic_checks_on_DelayedOp_with_DIM2(.TEST_MATRIX2a, x1)

    checkIdentical(FALSE, is_sparse(x1))

    ## 2. Ordinary array seed

    dimnames2 <- list(letters[1:5], NULL)
    x2 <- new_DelayedSetDimnames(.TEST_MATRIX2a, dimnames2)

    a2 <- .TEST_MATRIX2a
    dimnames(a2) <- dimnames2
    .basic_checks_on_DelayedOp_with_DIM2(a2, x2)

    checkIdentical(FALSE, is_sparse(x2))

    ## 3. Sparse seed -- no-op

    x3 <- new_DelayedSetDimnames(.TEST_SVT3)

    .basic_checks_on_DelayedOp_with_DIM3(.TEST_ARRAY3, x3)

    checkTrue(is_sparse(x3))

    ## 4. Sparse seed

    dimnames4 <- list(NULL, sprintf("ID%03d", seq_len(ncol(.TEST_SVT3))), NULL)
    x4 <- new_DelayedSetDimnames(.TEST_SVT3, dimnames4)

    a4 <- .TEST_ARRAY3
    dimnames(a4) <- dimnames4
    .basic_checks_on_DelayedOp_with_DIM3(a4, x4)

    checkTrue(is_sparse(x4))
}

