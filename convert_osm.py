#!/usr/bin/env python3
"""
OSM to LandscapeData converter — supports multiple map files.

Usage:
  python3 convert_osm.py                        # convert all maps
  python3 convert_osm.py --map golden_gate      # convert specific map
  python3 convert_osm.py --file public/maps/Foo.osm --output src/game/maps/foo.ts
"""
import xml.etree.ElementTree as ET
import math
import argparse
import os

MAPS = {
    'golden_gate': {
        'file': 'public/maps/GoldenGate.osm',
        'output': 'src/game/maps/golden_gate.ts',
        'bounds': {
            'minlat': 37.803418, 'maxlat': 37.810157,
            'minlon': -122.479148, 'maxlon': -122.466853,
        },
        'label': 'Golden Gate / Presidio',
    },
    'union_square': {
        'file': 'public/maps/UnionSquare.osm',
        'output': 'src/game/maps/union_square.ts',
        'bounds': None,
        'label': 'Union Square / Downtown SF',
    },
}

ROAD_COLORS = {
    'motorway': '#334455',
    'motorway_link': '#334455',
    'primary': '#444466',
    'secondary': '#333344',
    'tertiary': '#2a2a3a',
    'residential': '#2a2a3a',
    'unclassified': '#2a2a3a',
}

BUILDING_COLORS = [
    '#1a1a3a', '#151535', '#202050', '#0f0f2a', '#1e1e40',
    '#12122a', '#18183a', '#222245', '#0d0d25', '#1c1c3a',
]


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
    xs = [latlon_to_game(lat, lon, bounds)[0] for lat, lon in way_nodes]
    zs = [latlon_to_game(lat, lon, bounds)[1] for lat, lon in way_nodes]
    x = sum(xs) / len(xs)
    z = sum(zs) / len(zs)
    width = max(xs) - min(xs)
    depth = max(zs) - min(zs)
    return x, z, width, depth


def polygon_area(way_nodes, bounds):
    if len(way_nodes) < 3:
        return 0
    nodes_xy = [latlon_to_game(lat, lon, bounds) for lat, lon in way_nodes]
    area = 0
    for i in range(len(nodes_xy)):
        j = (i + 1) % len(nodes_xy)
        area += nodes_xy[i][0] * nodes_xy[j][1]
        area -= nodes_xy[j][0] * nodes_xy[i][1]
    return abs(area) / 2


def parse_osm(map_id, config):
    osm_path = config['file']
    print(f"\n{'='*60}")
    print(f"Converting: {map_id} ({osm_path})")

    if not os.path.exists(osm_path):
        print(f"  ERROR: File not found: {osm_path}")
        return None

    tree = ET.parse(osm_path)
    root = tree.getroot()

    bounds_el = root.find('bounds')
    if config['bounds']:
        bounds = config['bounds']
    elif bounds_el is not None:
        bounds = {
            'minlat': float(bounds_el.get('minlat')),
            'maxlat': float(bounds_el.get('maxlat')),
            'minlon': float(bounds_el.get('minlon')),
            'maxlon': float(bounds_el.get('maxlon')),
        }
    else:
        print("  ERROR: No bounds in OSM file and no fallback configured.")
        return None

    print(f"  Bounds: lat {bounds['minlat']}–{bounds['maxlat']}, lon {bounds['minlon']}–{bounds['maxlon']}")

    # Build node index
    nodes = {}
    for n in root.findall('.//node'):
        lat, lon = float(n.get('lat')), float(n.get('lon'))
        nodes[n.get('id')] = (lat, lon)

    # Parse roads
    roads = []
    road_way_nodes = {}
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
        step = max(1, len(way_nodes) // 6)
        for i in range(0, len(way_nodes), step):
            lat, lon = way_nodes[i]
            x, z = latlon_to_game(lat, lon, bounds)
            control.append({'x': x, 'z': z})
        if len(control) < 2:
            control = [
                {'x': latlon_to_game(way_nodes[0][0], way_nodes[0][1], bounds)[0],
                 'z': latlon_to_game(way_nodes[0][0], way_nodes[0][1], bounds)[1]},
                {'x': latlon_to_game(way_nodes[-1][0], way_nodes[-1][1], bounds)[0],
                 'z': latlon_to_game(way_nodes[-1][0], way_nodes[-1][1], bounds)[1]},
            ]
        name = tags.get('name', tags.get('ref', f'Road-{w.get("id")}'))
        width = {'motorway': 14, 'motorway_link': 10, 'primary': 12,
                 'secondary': 10, 'tertiary': 8, 'residential': 6, 'unclassified': 5}.get(hw, 8)
        roads.append({'name': name, 'color': ROAD_COLORS[hw], 'controlPoints': control,
                      'width': width, '_way_id': w.get('id')})

    road_paths = []
    for road in roads:
        way_nodes = road_way_nodes.get(road['_way_id'], [])
        path = compute_path_points(way_nodes, bounds)
        road_paths.append(path)
    for road in roads:
        del road['_way_id']

    # Parse buildings
    buildings = []
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
        if area < 5:
            continue
        x, z, width, depth = compute_aabb(way_nodes, bounds)
        h_str = tags.get('height') or tags.get('building:levels', '8')
        try:
            if 'building:levels' in tags:
                h = float(h_str) * 3.5
            elif 'm' in h_str:
                h = float(h_str.replace('m', ''))
            else:
                h = float(h_str)
        except:
            h = 8.0
        est_side = math.sqrt(area * 1.3)
        if width < 2 or depth < 2:
            width = est_side
            depth = est_side * 0.7
        if width < 3:
            width = 3
        if depth < 3:
            depth = 3
        label = tags.get('name', None)
        color_idx = int(abs(x + z) / 10) % len(BUILDING_COLORS)
        buildings.append({
            'x': round(x, 1), 'z': round(z, 1), 'width': round(width, 1),
            'depth': round(depth, 1), 'height': round(h, 1),
            'color': BUILDING_COLORS[color_idx], 'label': label,
        })

    # Parse sidewalks (footways / pedestrian paths)
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
                'x': pt['x'], 'z': pt['z'], 'angle': pt['angle'], 'len': 6,
                'label': f'{tags.get("name", hw)} sidewalk',
            })

    # Crosswalks
    crosswalks = []
    for path in road_paths:
        for i in range(0, len(path), 10):
            pt = path[i]
            crosswalks.append({'x': pt['x'], 'z': pt['z'], 'angle': pt['angle'], 'label': 'Crosswalk'})

    # Street lamps
    streetLamps = []
    for path in road_paths:
        for i in range(0, len(path), 15):
            pt = path[i]
            perp = pt['angle'] + math.pi / 2
            lamp_x = pt['x'] + math.cos(perp) * 6
            lamp_z = pt['z'] + math.sin(perp) * 6
            streetLamps.append({'x': round(lamp_x, 1), 'z': round(lamp_z, 1), 'label': 'Street lamp'})

    # Trees
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
        x, z, width, depth = compute_aabb(way_nodes, bounds)
        count = min(8, max(2, int(width * depth / 400)))
        for _ in range(count):
            angle = (tree_id * 17.3) % (2 * math.pi)
            dist = ((tree_id * 7.7) % 0.9) * min(width, depth) * 0.4
            tx = x + math.cos(angle) * dist
            tz = z + math.sin(angle) * dist
            trees.append({'x': round(tx, 1), 'z': round(tz, 1), 'label': f'Tree #{tree_id+1}'})
            tree_id += 1

    # Water
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
                water_polygons.append((x, z, width, depth))

    if water_polygons:
        all_wx = [p[0] for p in water_polygons]
        all_wz = [p[1] for p in water_polygons]
        water = {
            'x': round(sum(all_wx) / len(all_wx), 1),
            'z': round(sum(all_wz) / len(all_wz), 1),
            'width': round(max(p[2] for p in water_polygons) * 1.2, 1),
            'height': round(max(p[3] for p in water_polygons) * 1.2, 1),
        }
    else:
        water = {'x': 0, 'z': 0, 'width': 0, 'height': 0}

    # Print summary
    total_pts = sum(len(p) for p in road_paths)
    print(f"  Roads: {len(roads)} ({total_pts} path points)")
    print(f"  Buildings: {len(buildings)}")
    print(f"  Trees: {len(trees)}")
    print(f"  Street lamps: {len(streetLamps)}")
    print(f"  Sidewalks: {len(sidewalks)}")
    print(f"  Crosswalks: {len(crosswalks)}")
    print(f"  Water: x={water['x']}, z={water['z']}, w={water['width']}, h={water['height']}")

    return {
        'roads': roads, 'roadPaths': road_paths, 'buildings': buildings,
        'trees': trees, 'streetLamps': streetLamps, 'sidewalks': sidewalks,
        'crosswalks': crosswalks, 'water': water, 'mapId': map_id,
        'osmFile': osm_path, 'bounds': bounds,
    }


def generate_ts(data, output_path, map_label):
    """Generate TypeScript from parsed OSM data."""
    output = []
    output.append(f"// {map_label} — real-world OSM data")
    output.append(f"// Source: {data['osmFile']} (OpenStreetMap contributors, ODbL 1.0)")
    output.append(f"// Scale: 1 unit = 1 meter")
    output.append("")
    output.append("import type { LandscapeData } from '../landscape.types'")
    output.append("")

    # Compute a good spawn point (first road path point, or center)
    spawn_x, spawn_z = 0, 0
    if data['roadPaths'] and len(data['roadPaths']) > 0:
        for p in data['roadPaths']:
            if len(p) > 0:
                spawn_x, spawn_z = p[0]['x'], p[0]['z']
                break

    output.append(f"// Spawn point: ({spawn_x}, {spawn_z})")
    output.append("")
    output.append("export const SPAWN_POINT: [number, number, number] = "
                  f"[{spawn_x}, 3, {spawn_z}]")
    output.append("")
    output.append("export const MAP_DATA: LandscapeData = {")

    # Roads
    output.append("  // ─── Roads ───────────────────────────────────────────────────")
    output.append("  roads: [")
    for road in data['roads']:
        output.append("    {")
        output.append(f"      name: '{road['name']}',")
        output.append(f"      color: '{road['color']}',")
        output.append("      controlPoints: [")
        for cp in road['controlPoints']:
            output.append(f"        {{ x: {cp['x']}, z: {cp['z']} }},")
        output.append("      ],")
        output.append(f"      width: {road['width']},")
        output.append("    },")
    output.append("  ],")

    # Road paths
    output.append("")
    output.append("  // ─── Road paths (for NPC / vehicle navigation) ─────────────")
    output.append("  roadPaths: [")
    for path in data['roadPaths']:
        output.append("    [")
        for pt in path:
            output.append(f"      {{ x: {pt['x']}, z: {pt['z']}, angle: {pt['angle']} }},")
        output.append("    ],")
    output.append("  ],")

    # Buildings
    output.append("")
    output.append("  // ─── Buildings ─────────────────────────────────────────────")
    output.append("  buildings: [")
    for b in data['buildings']:
        lbl = f"'{b['label']}'" if b['label'] else 'undefined'
        output.append(f"  {{ x: {b['x']}, z: {b['z']}, width: {b['width']}, depth: {b['depth']}, "
                      f"height: {b['height']}, color: '{b['color']}', label: {lbl} }},")
    output.append("  ],")

    # Trees
    output.append("")
    output.append("  // ─── Trees ─────────────────────────────────────────────────")
    output.append("  trees: [")
    for t in data['trees']:
        output.append(f"  {{ x: {t['x']}, z: {t['z']}, label: '{t['label']}' }},")
    output.append("  ],")

    # Street lamps
    output.append("")
    output.append("  streetLamps: [")
    for l in data['streetLamps']:
        output.append(f"  {{ x: {l['x']}, z: {l['z']}, label: '{l['label']}' }},")
    output.append("  ],")

    # Sidewalks
    output.append("")
    output.append("  sidewalks: [")
    for sw in data['sidewalks']:
        output.append(f"  {{ x: {sw['x']}, z: {sw['z']}, angle: {sw['angle']}, "
                      f"len: {sw['len']}, label: '{sw['label']}' }},")
    output.append("  ],")

    # Crosswalks
    output.append("")
    output.append("  crosswalks: [")
    for cw in data['crosswalks']:
        output.append(f"  {{ x: {cw['x']}, z: {cw['z']}, angle: {cw['angle']}, "
                      f"label: '{cw['label']}' }},")
    output.append("  ],")

    # Empty arrays for unpopulated types
    for field in ['trafficLights', 'busStops', 'parkingLots', 'benches',
                  'hydrants', 'caltransLines', 'caltransPaths']:
        output.append(f"  {field}: [],")

    # Water
    output.append("")
    output.append("  water: { x: " + str(data['water']['x']) + ", z: " + str(data['water']['z']) +
                  ", width: " + str(data['water']['width']) + ", height: " + str(data['water']['height']) + " },")
    output.append("}")

    content = '\n'.join(output)
    with open(output_path, 'w') as f:
        f.write(content)
    print(f"  Wrote: {output_path} ({len(content)} chars)")


def main():
    parser = argparse.ArgumentParser(description='Convert OSM files to LandscapeData TypeScript')
    parser.add_argument('--map', choices=list(MAPS.keys()), help='Convert specific map only')
    parser.add_argument('--file', help='OSM input file path')
    parser.add_argument('--output', help='TypeScript output path')
    args = parser.parse_args()

    to_convert = []

    if args.file and args.output:
        # Custom file + output pair
        custom_config = {'file': args.file, 'bounds': None}
        to_convert.append(('custom', custom_config, args.output))
    elif args.map and args.map in MAPS:
        to_convert.append((args.map, MAPS[args.map], MAPS[args.map]['output']))
    else:
        # Convert all registered maps
        for map_id, config in MAPS.items():
            to_convert.append((map_id, config, config['output']))

    success_count = 0
    for map_id, config, output_path in to_convert:
        data = parse_osm(map_id, config)
        if data:
            generate_ts(data, output_path, MAPS.get(map_id, {}).get('label', map_id))
            success_count += 1

    print(f"\n{'='*60}")
    print(f"Done. {success_count}/{len(to_convert)} map(s) converted.")


if __name__ == '__main__':
    main()