# Golden fixture example

Example fixture file (`spikes/0001-detect-circles/fixtures/golden.json`) — rich expected outputs with easy and hard inputs, bounding boxes, difficulty tags, and edge-case markers.

```json
{
  "inputs/easy-01.jpg": {
    "expected": [
      { "bbox": [120, 80, 240, 200], "label": "circle", "size": "large", "lighting": "even" }
    ],
    "difficulty": "easy",
    "edge_cases": []
  },
  "inputs/hard-01.jpg": {
    "expected": [
      { "bbox": [50, 60, 90, 100], "label": "circle", "size": "small", "lighting": "low" },
      { "bbox": [200, 80, 260, 140], "label": "circle", "size": "medium", "lighting": "even", "occluded": true }
    ],
    "difficulty": "hard",
    "edge_cases": ["low-light", "partial-occlusion", "multiple-objects"]
  }
}
```
