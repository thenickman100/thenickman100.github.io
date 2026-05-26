# Objective Network Analyzer

**[Live Demo](clustering-demo-202605261552.html)**

A browser-based tool for visualizing and analyzing curriculum learning objectives as an interactive force-directed network. Objectives are connected by tag-based similarity and can be grouped using a variety of clustering algorithms.

## File Structure

The following structure must be present and unzipped:

```
objective-network/
├── index.html
├── README.md
├── styles/
│   └── stylesheet.css
├── scripts/
│   ├── color_palettes.js
│   ├── data_loader.js
│   ├── similarity.js
│   ├── clustering.js
│   ├── network_graph.js
│   └── display_graph.js
└── files/
    ├── jquery.v3.7.1.js
    └── d3.v7.9.0.js
```

Open `index.html` directly in a browser — no server required.

## CSV Format

| Objective Description | Course Number | Skill Tags |
|---|---|---|
| Describe the major subdisciplines of psychology and the kinds of questions each addresses | Beh Sci 110 | nature_of_science\|logical_structure_analysis\|scientific_skepticism\|interdisciplinary_transfer |

- Tags are pipe-delimited (`|`)
- Column headers are matched flexibly (case-insensitive)

## Usage

1. Drag and drop a CSV file onto the page to load objectives.
2. Adjust edge settings (similarity metric, mode, k) as needed.
3. Click **Rebuild Graph** to recompute the network.
4. Use the **Clustering** panel to color-code nodes by community.
5. Use **Export** to save a self-contained HTML snapshot of the current state.

## Edge Settings

**Similarity metric** — how tag overlap is scored between two objectives:

| Metric | Description |
|---|---|
| Jaccard | Balanced; penalises both missing and extra tags equally |
| Dice | Weights shared tags more heavily than Jaccard |
| Cosine | Less sensitive to differences in total tag count |
| Overlap | Fraction of the smaller tag set that is shared |
| Resource Allocation | Rare shared tags count more than common ones |
| Adamic-Adar | Like Resource Allocation with a softer logarithmic penalty |

**Edge mode:**
- **kNN union** — connect if either node ranks the other in its top-k
- **kNN mutual** — connect only if both nodes mutually rank each other
- **Threshold** — draw all edges at or above a minimum similarity score

## Clustering Algorithms

| Algorithm | Type | Notes |
|---|---|---|
| Louvain | Graph | Modularity maximisation; usually aligns well with visual layout |
| Label Propagation | Graph | Fast; sensitive to tie-breaking — use multiple restarts |
| K-Medoids | Partition | Uses Jaccard distance; robust to outliers |
| K-Means | Partition | Binary tag vectors; fast and stable with a fixed seed |
| Hierarchical | Hierarchy | Deterministic; good for exploring nested structure |
| DBSCAN | Density | No k required; marks sparse nodes as noise |
| Spectral | Spectral | Good for non-convex clusters; slower on large datasets |
| Affinity Propagation | Affinity | No k required; k emerges from the preference parameter |
| Spatial | Positional | Clusters by screen position; run after layout settles |
| Hybrid | Positional | Blends position and tag similarity |
| By Course | Categorical | One cluster per course number |
| By Department | Categorical | One cluster per department prefix |

Use **Fixed seed** to get reproducible results across runs.

## Graph Controls

- **Click a node** — pin it in place; click again to release
- **Drag background** — pan the canvas
- **Scroll / pinch** — zoom
- **Show labels** — display truncated objective text on nodes
- **Export** — saves a self-contained HTML file with the current graph state, node positions, zoom, and cluster assignments
