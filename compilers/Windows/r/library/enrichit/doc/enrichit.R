## ----eval=FALSE---------------------------------------------------------------
# devtools::install_github("YuLab-SMU/enrichit")


## -----------------------------------------------------------------------------
library(enrichit)

# Simulate a universe of 1000 genes
universe <- paste0("Gene", 1:1000)

# Define gene sets
gene_sets <- list(
  PathwayA = paste0("Gene", 1:50),       # Genes 1-50
  PathwayB = paste0("Gene", 800:850)     # Genes 800-850
)

# Select 'significant' genes (e.g., top 20 genes)
# PathwayA should be enriched
sig_genes <- paste0("Gene", 1:20)

# Run ORA
ora_result <- ora(
  gene = sig_genes,
  gene_sets = gene_sets,
  universe = universe
)

# View results
as.data.frame(ora_result)


## -----------------------------------------------------------------------------
# Generate synthetic ranked gene list
set.seed(42)
geneList <- sort(rnorm(1000), decreasing = TRUE)
names(geneList) <- paste0("Gene", 1:1000)

# Define gene sets
# PathwayTop is enriched at the top (positive ES)
# PathwayBottom is enriched at the bottom (negative ES)
gene_sets <- list(
  PathwayTop = names(geneList)[1:50],
  PathwayBottom = names(geneList)[951:1000],
  PathwayRandom = sample(names(geneList), 50)
)

# Run GSEA using the multilevel method
gsea_result <- gsea(
  geneList = geneList,
  gene_sets = gene_sets,
  method = "multilevel",
  nPerm = 1000,    # Base permutations
  minGSSize = 10,
  maxGSSize = 500
)

# View results
head(gsea_result)


## ----eval=FALSE---------------------------------------------------------------
# # Assuming you have a GSON object 'g'
# # result <- gsea_gson(geneList = geneList, gson = g)


## -----------------------------------------------------------------------------
sessionInfo()

