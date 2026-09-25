## ----style, echo=FALSE, results="asis", message=FALSE-------------------------
knitr::opts_chunk$set(tidy = FALSE,
		   message = FALSE)

## ----echo=FALSE, results='hide', message=FALSE--------------------------------
library(ggplot2)
library(tidydr) 

## -----------------------------------------------------------------------------
library(tidydr)
x <- dr(data = iris[,1:4], fun = prcomp)

## ----message = TRUE-----------------------------------------------------------
available_methods()

## -----------------------------------------------------------------------------
library(ggplot2)
## metadata as a vector
ggplot(x, aes(Dim1, Dim2), metadata=iris$Species) + 
  geom_point(aes(color=.group))

## -----------------------------------------------------------------------------
## metadata as a data frame
autoplot(x, aes(color=Species), metadata = iris[, 5, drop=FALSE]) +
  theme_dr()

