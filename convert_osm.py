#!/usr/bin/env python3
"""
OSM to LandscapeData converter for Golden Gate / Presidio area.
Run: python3 convert_osm.py

Outputs: src/game/maps/golden_gate.ts
The map covers ~750m N-S × ~1081m E-W around the Presidio/Crissy Field area.
Coordinate system: 1 game unit = 1 meter.
Map origin (0,0) = center of OSM bounds.
"""
import xml.etree.ElementTree as ET
import math
import json

def latlon_to_game(lat, lon, bounds):
    mid_lat = (bounds['minlat'] + bounds['maxlat']) / 2
    m_per_deg_lat = 111320
    m_per_deg_lon = 111320 * math.cos(math.radians(mid_lat))
    cx = (bounds['minlon'] + bounds['maxlon']) / 2
    cz = (bounds['minlat'] + bounds['maxlat']) / 2
    x = (lon - cx) * m_per_deg_lon
    z = (lat - cz) * m_per_deg_lat
    return round(x, 1), round(z, 1)

def compute_path_points(way_nodes, bounds):
    """Convert lat/lon way nodes to PathPoint[] with tangents."""
    if len(way_nodes) < 2:
        return []
    pts = []
    for lat, lon in way_nodes:
        x, z = latlon_to_game(lat, lon, bounds)
        pts.append({'x': x, 'z': z})
    # Compute angles between consecutive points
    path = []
    for i in range(len(pts)):
        if i == 0:
            dx = pts[1]['x'] - pts[0]['x']
            dz = pts[1]['z'] - pts[0]['z']
        elif i == len(pts) - 1:
            dx = pts[-1]['x'] - pts[-2]['x']
            dz = pts[-1]['z'] - pts[-2]['z']
        else:
            dx = pts[i+1]['x'] - pts[i-1]['x']
            dz = pts[i+1]['z'] - pts[i-1]['z']
        angle = round(math.atan2(dx, dz), 3)
        path.append({'x': pts[i]['x'], 'z': pts[i]['z'], 'angle': angle})
    return path

def compute_aabb(way_nodes, bounds):
    """Compute axis-aligned bounding box center and dimensions."""
    xs = [latlon_to_game(lat, lon, bounds)[0] for lat, lon in way_nodes]
    zs = [latlon_to_game(lat, lon, bounds)[1] for lat, lon in way_nodes]
    x = sum(xs) / len(xs)
    z = sum(zs) / len(zs)
    width = max(xs) - min(xs)
    depth = max(zs) - min(zs)
    return x, z, width, depth

def polygon_area(way_nodes, bounds):
    """Shoelace formula for polygon area in meters."""
    if len(way_nodes) < 3:
        return 0
    nodes_xy = [latlon_to_game(lat, lon, bounds) for lat, lon in way_nodes]
    area = 0
    for i in range(len(nodes_xy)):
        j = (i + 1) % len(nodes_xy)
        area += nodes_xy[i][0] * nodes_xy[j][1]
        area -= nodes_xy[j][0] * nodes_xy[i][1]
    return abs(area) / 2

tree = ET.parse('public/maps/GoldenGate.osm')
root = tree.getroot()

bounds = {
    'minlat': 37.803418, 'maxlat': 37.810157,
    'minlon': -122.479148, 'maxlon': -122.466853
}

# Build node index
nodes = {}
for n in root.findall('.//node'):
    lat, lon = float(n.get('lat')), float(n.get('lon'))
    nodes[n.get('id')] = (lat, lon)

# Road color by highway type
ROAD_COLORS = {
    'motorway': '#334455',
    'motorway_link': '#334455',
    'primary': '#444466',
    'secondary': '#333344',
    'tertiary': '#2a2a3a',
    'residential': '#2a2a3a',
    'unclassified': '#2a2a3a',
}

# ── Parse all roads ──────────────────────────────────────────────────────────
roads = []
road_way_nodes = {}  # way_id -> [(lat,lon), ...]

for w in root.findall('.//way'):
    tags = {tag.get('k'): tag.get('v') for tag in w.findall('tag')}
    hw = tags.get('highway')
    if hw not in ROAD_COLORS:
        continue
    nds = w.findall('nd')
    way_nodes = []
    for nd in nds:
        ref = nd.get('ref')
        if ref in nodes:
            way_nodes.append(nodes[ref])
    if len(way_nodes) < 2:
        continue
    road_way_nodes[w.get('id')] = way_nodes
    control = []
    # Sample every 4th node as a control point
    step = max(1, len(way_nodes) // 6)
    for i in range(0, len(way_nodes), step):
        lat, lon = way_nodes[i]
        x, z = latlon_to_game(lat, lon, bounds)
        control.append({'x': x, 'z': z})
    if len(control) < 2:
        control = [{'x': latlon_to_game(way_nodes[0][0], way_nodes[0][1], bounds)[0],
                    'z': latlon_to_game(way_nodes[0][0], way_nodes[0][1], bounds)[1]},
                   {'x': latlon_to_game(way_nodes[-1][0], way_nodes[-1][1], bounds)[0],
                    'z': latlon_to_game(way_nodes[-1][0], way_nodes[-1][1], bounds)[1]}]
    name = tags.get('name', tags.get('ref', f'Road-{w.get("id")}'))
    width = {'motorway': 14, 'motorway_link': 10, 'primary': 12,
             'secondary': 10, 'tertiary': 8, 'residential': 6, 'unclassified': 5}.get(hw, 8)
    roads.append({
        'name': name,
        'color': ROAD_COLORS[hw],
        'controlPoints': control,
        'width': width,
        '_way_id': w.get('id'),
    })

# Build road paths
road_paths = []
for road in roads:
    way_nodes = road_way_nodes.get(road['_way_id'], [])
    path = compute_path_points(way_nodes, bounds)
    road_paths.append(path)

# Remove temp field
for road in roads:
    del road['_way_id']

# ── Parse all buildings ──────────────────────────────────────────────────────
buildings = []
BUILDING_COLORS = [
    '#1a1a3a', '#151535', '#202050', '#0f0f2a', '#1e1e40',
    '#12122a', '#18183a', '#222245', '#0d0d25', '#1c1c3a',
]
for w in root.findall('.//way'):
    tags = {tag.get('k'): tag.get('v') for tag in w.findall('tag')}
    if not (tags.get('building') or tags.get('building:levels')):
        continue
    nds = w.findall('nd')
    way_nodes = []
    for nd in nds:
        ref = nd.get('ref')
        if ref in nodes:
            way_nodes.append(nodes[ref])
    if len(way_nodes) < 3:
        continue
    area = polygon_area(way_nodes, bounds)
    if area < 5:  # Skip tiny polygons
        continue
    x, z, width, depth = compute_aabb(way_nodes, bounds)
    h_str = tags.get('height') or tags.get('building:levels', '8')
    try:
        if 'building:levels' in tags:
            h = float(h_str) * 3.5  # ~3.5m per floor
        elif 'm' in h_str:
            h = float(h_str.replace('m', ''))
        else:
            h = float(h_str)
    except:
        h = 8.0
    # Use area to estimate building footprint when AABB is too distorted
    est_side = math.sqrt(area * 1.3)
    if width < 2 or depth < 2:
        width = est_side
        depth = est_side * 0.7
    if width < 3: width = 3
    if depth < 3: depth = 3
    label = tags.get('name', None)
    color_idx = int(abs(x + z) / 10) % len(BUILDING_COLORS)
    buildings.append({
        'x': round(x, 1),
        'z': round(z, 1),
        'width': round(width, 1),
        'depth': round(depth, 1),
        'height': round(h, 1),
        'color': BUILDING_COLORS[color_idx],
        'label': label,
    })

# ── Parse footways / pedestrian paths (as sidewalks) ─────────────────────────
sidewalks = []
for w in root.findall('.//way'):
    tags = {tag.get('k'): tag.get('v') for tag in w.findall('tag')}
    hw = tags.get('highway')
    if hw not in ('footway', 'pedestrian', 'path', 'steps'):
        continue
    nds = w.findall('nd')
    way_nodes = []
    for nd in nds:
        ref = nd.get('ref')
        if ref in nodes:
            way_nodes.append(nodes[ref])
    if len(way_nodes) < 2:
        continue
    path = compute_path_points(way_nodes, bounds)
    for i in range(0, len(path), 3):
        pt = path[i]
        sidewalks.append({
            'x': pt['x'],
            'z': pt['z'],
            'angle': pt['angle'],
            'len': 6,
            'label': f'{tags.get("name", hw)} sidewalk',
        })

# ── Crosswalks at highway/footway intersections ──────────────────────────────
crosswalks = []
for path in road_paths:
    for i in range(0, len(path), 10):
        pt = path[i]
        crosswalks.append({
            'x': pt['x'],
            'z': pt['z'],
            'angle': pt['angle'],
            'label': 'Crosswalk',
        })

# ── Street lamps (along roads) ───────────────────────────────────────────────
streetLamps = []
for path in road_paths:
    for i in range(0, len(path), 15):
        pt = path[i]
        # Offset to side of road
        perp = pt['angle'] + math.pi / 2
        lamp_x = pt['x'] + math.cos(perp) * 6
        lamp_z = pt['z'] + math.sin(perp) * 6
        streetLamps.append({
            'x': round(lamp_x, 1),
            'z': round(lamp_z, 1),
            'label': 'Street lamp',
        })

# ── Trees (from landuse=grass / leisure=park areas) ─────────────────────────
trees = []
tree_id = 0
for w in root.findall('.//way'):
    tags = {tag.get('k'): tag.get('v') for tag in w.findall('tag')}
    if tags.get('landuse') not in ('grass', 'recreation_ground') and tags.get('leisure') not in ('park', 'garden'):
        continue
    nds = w.findall('nd')
    way_nodes = []
    for nd in nds:
        ref = nd.get('ref')
        if ref in nodes:
            way_nodes.append(nodes[ref])
    if len(way_nodes) < 3:
        continue
    # Place trees within this polygon — sample points
    x, z, width, depth = compute_aabb(way_nodes, bounds)
    count = min(8, max(2, int(width * depth / 400)))
    for _ in range(count):
        angle = (tree_id * 17.3) % (2 * math.pi)
        dist = ((tree_id * 7.7) % 0.9) * min(width, depth) * 0.4
        tx = x + math.cos(angle) * dist
        tz = z + math.sin(angle) * dist
        trees.append({
            'x': round(tx, 1),
            'z': round(tz, 1),
            'label': f'Tree #{tree_id+1}',
        })
        tree_id += 1

# ── Water body (Crissy Field Marsh / bay) ────────────────────────────────────
# The Golden Gate OSM area includes the bay — find the western edge water
# Check for the Presidio waterfront water
water_polygons = []
for w in root.findall('.//way'):
    tags = {tag.get('k'): tag.get('v') for tag in w.findall('tag')}
    if tags.get('natural') == 'water' or tags.get('waterway') == 'riverbank':
        nds = w.findall('nd')
        way_nodes = []
        for nd in nds:
            ref = nd.get('ref')
            if ref in nodes:
                way_nodes.append(nodes[ref])
        if len(way_nodes) >= 3:
            x, z, width, depth = compute_aabb(way_nodes, bounds)
            # Only include water on the west (negative x) side of the map
            if x < 50:  # West of map center
                water_polygons.append((x, z, width, depth))

if water_polygons:
    # Merge into one bounding water body
    all_wx = [p[0] for p in water_polygons]
    all_wz = [p[1] for p in water_polygons]
    water_x = sum(all_wx) / len(all_wx)
    water_z = sum(all_wz) / len(all_wz)
    water_width = max(p[2] for p in water_polygons) * 1.2
    water_height = max(p[3] for p in water_polygons) * 1.2
    water = {
        'x': round(water_x, 1),
        'z': round(water_z, 1),
        'width': round(water_width, 1),
        'height': round(water_height, 1),
    }
else:
    # Default to the western edge where the bay is
    water = {
        'x': -600,
        'z': 0,
        'width': 500,
        'height': 1200,
    }

# ── Caltrain rail lines ──────────────────────────────────────────────────────
# Presidio doesn't have Caltrain — skip (empty arrays)

# ── Output summary ───────────────────────────────────────────────────────────
print(f"Roads: {len(roads)}")
print(f"Road paths: {len(road_paths)} total segments")
drivable = sum(1 for p in road_paths for _ in p)
print(f"  Total path points: {drivable}")
print(f"Buildings: {len(buildings)}")
print(f"Trees: {len(trees)}")
print(f"Street lamps: {len(streetLamps)}")
print(f"Sidewalks: {len(sidewalks)}")
print(f"Crosswalks: {len(crosswalks)}")
print(f"Water: x={water['x']}, z={water['z']}, w={water['width']}, h={water['height']}")

# ── Generate TypeScript file ─────────────────────────────────────────────────
output = []
output.append("// Golden Gate / Presidio — real-world OSM data")
output.append("// Source: public/maps/GoldenGate.osm (OpenStreetMap contributors, ODbL 1.0)")
output.append("// Scale: 1 unit = 1 meter")
output.append("// Area: ~750m N-S × ~1081m E-W")
output.append("")
output.append("import type { LandscapeData } from '../landscape.types'")
output.append("")
output.append("export const GOLDEN_GATE_MAP: LandscapeData = {")

# Roads
output.append("  // ─── Roads (drivable) ──────────────────────────────────────────────")
output.append("  roads: [")
for road in roads:
    cps = road['controlPoints']
    output.append(f"    {{")
    output.append(f"      name: '{road['name']}',")
    output.append(f"      color: '{road['color']}',")
    output.append(f"      controlPoints: [")
    for cp in cps:
        output.append(f"        {{ x: {cp['x']}, z: {cp['z']} }},")
    output.append(f"      ],")
    output.append(f"      width: {road['width']},")
    output.append(f"    }},")
output.append("  ],")

output.append("")
output.append("  roadPaths: [")
for path in road_paths:
    output.append("    [")
    for pt in path:
        output.append(f"      {{ x: {pt['x']}, z: {pt['z']}, angle: {pt['angle']} }},")
    output.append("    ],")
output.append("  ],")

# Buildings
output.append("")
output.append("  // ─── Buildings ───────────────────────────────────────────────────")
output.append("  buildings: [")
for b in buildings:
    lbl = f"'{b['label']}'" if b['label'] else 'undefined'
    output.append(f"    {{ x: {b['x']}, z: {b['z']}, width: {b['width']}, depth: {b['depth']}, height: {b['height']}, color: '{b['color']}', label: {lbl} }},")
output.append("  ],")

# Trees
output.append("")
output.append("  // ─── Trees ───────────────────────────────────────────────────────")
output.append("  trees: [")
for t in trees:
    output.append(f"    {{ x: {t['x']}, z: {t['z']}, label: '{t['label']}' }},")
output.append("  ],")

# Street lamps
output.append("")
output.append("  streetLamps: [")
for l in streetLamps:
    output.append(f"    {{ x: {l['x']}, z: {l['z']}, label: '{l['label']}' }},")
output.append("  ],")

# Sidewalks
output.append("")
output.append("  sidewalks: [")
for sw in sidewalks:
    output.append(f"    {{ x: {sw['x']}, z: {sw['z']}, angle: {sw['angle']}, len: {sw['len']}, label: '{sw['label']}' }},")
output.append("  ],")

# Crosswalks
output.append("")
output.append("  crosswalks: [")
for cw in crosswalks:
    output.append(f"    {{ x: {cw['x']}, z: {cw['z']}, angle: {cw['angle']}, label: '{cw['label']}' }},")
output.append("  ],")

# Remaining empty arrays
for field in ['trafficLights', 'busStops', 'parkingLots', 'benches', 'hydrants', 'caltransLines', 'caltransPaths']:
    output.append(f"  {field}: [],")

# Water
output.append("")
output.append("  water: { x: " + str(water['x']) + ", z: " + str(water['z']) + ", width: " + str(water['width']) + ", height: " + str(water['height']) + " },")
output.append("}")

# Write file
src_path = 'src/game/maps/golden_gate.ts'
with open(src_path, 'w') as f:
    f.write('\n'.join(output))
print(f"\nWrote: {src_path}")
print(f"File size: {len('\\n'.join(output))} chars")