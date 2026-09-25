new_DelayedNaryIsoOp <- DelayedArray:::new_DelayedNaryIsoOp

.TEST_DIM2 <- c(5L, 6L)

.TEST_ARRAY2b <- array(FALSE, .TEST_DIM2)
.TEST_ARRAY2b[c(2:3, 12:22, 30)] <- TRUE
.TEST_SVT2b <- as(.TEST_ARRAY2b, "SVT_SparseArray")

.TEST_ARRAY2c <- array(FALSE, .TEST_DIM2)
.TEST_ARRAY2c[c(8:16, 21)] <- TRUE
.TEST_SVT2c <- as(.TEST_ARRAY2c, "SVT_SparseArray")

.TEST_DIM4 <- c(6L, 10L, 3L, 2L)

.TEST_ARRAY4a <- array(seq_len(prod(.TEST_DIM4)), .TEST_DIM4,
                       dimnames=list(NULL,
                                     NULL,
                                     c("z1", "z2", "z3"),
                                     c("a1", "a2")))

set.seed(99L)
.TEST_ARRAY4b <- array(runif(prod(.TEST_DIM4)), .TEST_DIM4,
                       dimnames=list(NULL,
                                     LETTERS[1:10],
                                     NULL,
                                     c("b1", "b2")))

.TEST_SVT4c <- SVT_SparseArray(dim=.TEST_DIM4)
.TEST_SVT4c[51:130] <- 51:130
.TEST_ARRAY4c <- as.array(.TEST_SVT4c)

.TEST_SVT4d <- SVT_SparseArray(dim=.TEST_DIM4)
.TEST_SVT4d[11:110] <- runif(100, max=150)
.TEST_ARRAY4d <- as.array(.TEST_SVT4d)


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

.basic_checks_on_DelayedOp_with_DIM4 <- function(a, x)
{
    checkIdentical(dim(a), dim(x))
    checkIdentical(dimnames(a), dimnames(x))
    checkIdentical(a, as.array(x))

    i1 <- c(3:6, 1L)
    current <- extract_array(x, list(i1, 6:5, NULL, 2:1))
    checkIdentical(unname(a[i1, 6:5, , 2:1]),
                   unname(current))
    current <- extract_array(x, list(i1, c(6:5, 6L), NULL, 2:1))
    checkIdentical(unname(a[i1, c(6:5, 6L), , 2:1]),
                   unname(current))
    current <- extract_array(x, list(i1, c(6:5, 6L), 3L, 2:1))
    checkIdentical(unname(a[i1, c(6:5, 6L), 3L, 2:1, drop=FALSE]),
                   unname(current))
    current <- extract_array(x, list(i1, c(6:5, 6L), integer(0), 2:1))
    checkIdentical(unname(a[i1, c(6:5, 6L), integer(0), 2:1]),
                   unname(current))
}


### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
### test_* functions
###

test_DelayedNaryIsoOp_constructor <- function(silent=FALSE)
{
    ## We also test nseed(), seed(), and is_noop()

    x <- new_DelayedNaryIsoOp()
    checkTrue(is(x, "DelayedNaryIsoOp"))
    checkTrue(validObject(x))
    checkIdentical(1L, nseed(x))
    checkException(seed(x), silent=silent)
    checkIdentical(identity, x@OP)
    checkIdentical(list(new("array")), x@seeds)
    checkIdentical(list(), x@Rargs)
    checkException(is_noop(x), silent=silent)

    x <- new_DelayedNaryIsoOp("/", .TEST_ARRAY4a, .TEST_SVT4c)
    checkTrue(is(x, "DelayedNaryIsoOp"))
    checkTrue(validObject(x))
    checkIdentical(2L, nseed(x))
    checkException(seed(x), silent=silent)
    checkIdentical(`/`, x@OP)
    checkIdentical(list(.TEST_ARRAY4a, .TEST_SVT4c), x@seeds)
    checkIdentical(list(), x@Rargs)
    checkException(is_noop(x), silent=silent)

    OP <- function(a1, a2, a3) (a1 + a2 + a3) / 3  # ternary mean
    x <- new_DelayedNaryIsoOp(OP, .TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_SVT4c)
    checkTrue(is(x, "DelayedNaryIsoOp"))
    checkTrue(validObject(x))
    checkIdentical(3L, nseed(x))
    checkException(seed(x), silent=silent)
    checkIdentical(OP, x@OP)
    checkIdentical(list(.TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_SVT4c), x@seeds)
    checkIdentical(list(), x@Rargs)
    checkException(is_noop(x), silent=silent)

    ## Two alternate ways to represent the above DelayedNaryIsoOp.

    OP <- function(a1, a2, a3, d=3) (a1 + a2 + a3) / d 
    x <- new_DelayedNaryIsoOp(OP, .TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_SVT4c)
    checkTrue(is(x, "DelayedNaryIsoOp"))
    checkTrue(validObject(x))
    checkIdentical(3L, nseed(x))
    checkException(seed(x), silent=silent)
    checkIdentical(OP, x@OP)
    checkIdentical(list(.TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_SVT4c), x@seeds)
    checkIdentical(list(), x@Rargs)
    checkException(is_noop(x), silent=silent)

    OP <- function(a1, a2, a3, d) (a1 + a2 + a3) / d 
    Rargs <- list(d=3)
    x <- new_DelayedNaryIsoOp(OP, .TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_SVT4c,
                                  Rargs=Rargs)
    checkTrue(is(x, "DelayedNaryIsoOp"))
    checkTrue(validObject(x))
    checkIdentical(3L, nseed(x))
    checkException(seed(x), silent=silent)
    checkIdentical(OP, x@OP)
    checkIdentical(list(.TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_SVT4c), x@seeds)
    checkIdentical(Rargs, x@Rargs)
    checkException(is_noop(x), silent=silent)

    checkException(new_DelayedNaryIsoOp(NULL),
                   silent=silent)
    checkException(new_DelayedNaryIsoOp(list(NULL)),
                   silent=silent)
    checkException(new_DelayedNaryIsoOp("not-an-existing-function"),
                   silent=silent)
    checkException(new_DelayedNaryIsoOp("<=", array(dim=4:2), array(dim=2:4)),
                   silent=silent)
}

test_DelayedNaryIsoOp_API <- function()
{
    ## 1. Unary op

    OP1 <- function(a) 1 / (log(a)^2 + 1)
    x1 <- new_DelayedNaryIsoOp(OP1, .TEST_SVT4c)

    a1 <- OP1(.TEST_ARRAY4c)
    .basic_checks_on_DelayedOp_with_DIM4(a1, x1)

    checkTrue(is_sparse(x1))

    ## 2. Binary op

    x2 <- new_DelayedNaryIsoOp(`/`, .TEST_ARRAY4a, .TEST_SVT4c)

    a2 <- .TEST_ARRAY4a / .TEST_ARRAY4c
    .basic_checks_on_DelayedOp_with_DIM4(a2, x2)

    checkIdentical(FALSE, is_sparse(x2))

    ## 3. Ternary op with right args

    ## Ternary array sum with weights on the 2nd and 3rd arrays (weights
    ## should be single values)
    OP3 <- function(a1, a2, a3, w2, w3) a1 + w2*a2 + w3*a3
    Rargs3 <- list(w2=0.5, w3=100L)
    x3 <- new_DelayedNaryIsoOp(OP3, .TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_SVT4c,
                                    Rargs=Rargs3)

    a3 <- OP3(.TEST_ARRAY4a, .TEST_ARRAY4b, .TEST_ARRAY4c, w2=0.5, w3=100L)
    .basic_checks_on_DelayedOp_with_DIM4(a3, x3)

    checkIdentical(FALSE, is_sparse(x3))

    ## 4-11. "Ops" group generics with propagation of structural sparsity

    x4 <- new_DelayedNaryIsoOp("+", .TEST_SVT4c, .TEST_SVT4d)

    a4 <- .TEST_ARRAY4c + .TEST_ARRAY4d
    .basic_checks_on_DelayedOp_with_DIM4(a4, x4)

    checkTrue(is_sparse(x4))

    x5 <- new_DelayedNaryIsoOp("-", .TEST_SVT4c, .TEST_SVT4d)

    a5 <- .TEST_ARRAY4c - .TEST_ARRAY4d
    .basic_checks_on_DelayedOp_with_DIM4(a5, x5)

    checkTrue(is_sparse(x5))

    x6 <- new_DelayedNaryIsoOp("*", .TEST_SVT4c, .TEST_SVT4d)

    a6 <- .TEST_ARRAY4c * .TEST_ARRAY4d
    .basic_checks_on_DelayedOp_with_DIM4(a6, x6)

    checkTrue(is_sparse(x6))

    x7 <- new_DelayedNaryIsoOp(">", .TEST_SVT4c, .TEST_SVT4d)

    a7 <- .TEST_ARRAY4c > .TEST_ARRAY4d
    .basic_checks_on_DelayedOp_with_DIM4(a7, x7)

    checkTrue(is_sparse(x7))

    x8 <- new_DelayedNaryIsoOp("<", .TEST_SVT4c, .TEST_SVT4d)

    a8 <- .TEST_ARRAY4c < .TEST_ARRAY4d
    .basic_checks_on_DelayedOp_with_DIM4(a8, x8)

    checkTrue(is_sparse(x8))

    x9 <- new_DelayedNaryIsoOp("!=", .TEST_SVT4c, .TEST_SVT4d)

    a9 <- .TEST_ARRAY4c != .TEST_ARRAY4d
    .basic_checks_on_DelayedOp_with_DIM4(a9, x9)

    checkTrue(is_sparse(x9))

    x10 <- new_DelayedNaryIsoOp("&", .TEST_SVT2b, .TEST_SVT2c)

    a10 <- .TEST_ARRAY2b & .TEST_ARRAY2c
    .basic_checks_on_DelayedOp_with_DIM2(a10, x10)

    checkTrue(is_sparse(x10))

    x11 <- new_DelayedNaryIsoOp("|", .TEST_SVT2b, .TEST_SVT2c)

    a11 <- .TEST_ARRAY2b | .TEST_ARRAY2c
    .basic_checks_on_DelayedOp_with_DIM2(a11, x11)

    checkTrue(is_sparse(x11))

    ## 12. "pmax2" with propagation of structural sparsity

    # TODO

    ## 13. "pmin2" with propagation of structural sparsity

    # TODO
}

