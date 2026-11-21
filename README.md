# WorldPainter Lake Enhancer

A procedural lake enhancement script for **WorldPainter** that transforms flat and simple lakes into more natural-looking landscapes.

The script adds naturally shaped islands, varied underwater terrain, seagrass meadows, and softer shorelines. It also supports optional reed and lily pad layers for additional environmental detail.

## Features

- **Natural Islands:** Generates randomly positioned islands with organic shapes, adjustable sizes, heights, spacing, and styles.
- **Island Styles:** Choose between grassy, rocky, or mixed island generation.
- **Underwater Terrain Relief:** Adds subtle bumps and dips to lake beds for more realistic underwater landscapes.
- **Seagrass Meadows:** Creates underwater vegetation patterns using procedural noise.
- **Shoreline Variation:** Introduces natural coves and headlands, reducing the artificial appearance of smooth lake boundaries.
- **Custom Vegetation Layers:** Supports optional custom object layers for reeds and lily pads.
- **Regional Processing:** Process the entire map or restrict modifications to a selected square region.
- **Seed Control:** Use a custom seed to generate consistent results.

## Parameters

| Parameter | Default | Description |
|---|---:|---|
| `seed` | 1 | Random generation seed |
| `islands` | 4 | Number of islands (0 = disabled) |
| `islandSize` | 16 | Average island radius |
| `islandHeight` | 2.5 | Average island height above water |
| `islandStyle` | mixed | Island style: mixed, grassy, rocky |
| `islandSpacing` | 200 | Minimum distance between islands |
| `islandMinShore` | 45 | Minimum distance from the shoreline |
| `islandMaxDepth` | 14 | Maximum water depth for island placement |
| `bedRelief` | 2 | Underwater terrain variation (0 = disabled) |
| `seagrass` | true | Enable underwater seagrass patterns |
| `shoreVariation` | 0.8 | Shoreline variation strength (0 = disabled) |
| `shoreBand` | 24 | Width of the shoreline effect zone |
| `reedLayer` | none | Custom object layer for reeds |
| `lilyLayer` | none | Custom object layer for lily pads |
| `regionSize` | 0 | Processing region size (0 = entire map) |
| `regionCenterX` | 0 | Processing region center X |
| `regionCenterY` | 0 | Processing region center Y |

## Usage

1. Open your world in WorldPainter.
2. Open the scripting interface.
3. Load or paste `Lake Enhancer.js`.
4. Configure the script parameters.
5. Run the script and let it process your world.

**Important:** Always create a backup of your world before running the script.

### Custom Object Layers

To use the reed and lily pad features:

1. Create the required custom object layers in WorldPainter.
2. Add your vegetation objects to those layers.
3. Enter the exact layer names in `reedLayer` and `lilyLayer`.
4. Leave either parameter as `none` to disable that feature.

## Performance

The script analyzes the map using a lower-resolution grid before processing individual blocks.

Larger maps may require additional processing time and memory, depending on their size and the selected parameters.

Using `regionSize` can help limit processing to a specific area.

## Compatibility

Designed for WorldPainter's JavaScript scripting environment.

## License

MIT License (if you choose to distribute this project under MIT).
