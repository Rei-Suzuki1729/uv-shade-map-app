#!/usr/bin/env python3
"""
日陰タイル生成ワーカー
Node.jsから呼び出されて、タイル生成ジョブを実行する
"""

import sys
import json
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict

from shade_calculator import Building
from tile_generator import generate_tiles_for_bbox


def load_buildings_from_geojson(geojson_path: str) -> List[Building]:
    """
    GeoJSONファイルから建物データを読み込む

    Args:
        geojson_path: GeoJSONファイルパス

    Returns:
        建物リスト
    """
    import geojson

    buildings = []

    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = geojson.load(f)

    for feature in data['features']:
        # PLATEAU形式を想定
        # properties に height または building_height があると仮定
        props = feature.get('properties', {})
        height = props.get('height') or props.get('building_height') or props.get('measuredHeight')

        if height is None:
            # デフォルト高さ（PoC用）
            height = 15.0  # 5階建て相当

        # Polygon or MultiPolygon
        geom = feature['geometry']

        if geom['type'] == 'Polygon':
            # 外周のみ使用（穴は無視）
            footprint = geom['coordinates'][0]
            buildings.append(Building(
                footprint=[(lon, lat) for lon, lat in footprint],
                height=float(height),
                building_id=props.get('id', '')
            ))
        elif geom['type'] == 'MultiPolygon':
            # 各Polygonを別々の建物として扱う
            for polygon in geom['coordinates']:
                footprint = polygon[0]
                buildings.append(Building(
                    footprint=[(lon, lat) for lon, lat in footprint],
                    height=float(height),
                    building_id=props.get('id', '')
                ))

    return buildings


def format_time_bucket(dt: datetime) -> str:
    """
    タイムバケット文字列を生成
    例: 20260110_1530 (10分刻み)

    Args:
        dt: datetime (UTC)

    Returns:
        タイムバケット文字列
    """
    # 10分刻みに丸める
    minute = (dt.minute // 10) * 10
    dt_rounded = dt.replace(minute=minute, second=0, microsecond=0)

    return dt_rounded.strftime('%Y%m%d_%H%M')


def generate_shade_tiles_job(
    bounds: Dict[str, float],
    start_time: str,
    end_time: str,
    step_minutes: int,
    zoom_levels: List[int],
    buildings_geojson: str,
    output_dir: str
) -> Dict[str, any]:
    """
    日陰タイル生成ジョブを実行

    Args:
        bounds: {'north', 'south', 'east', 'west'}
        start_time: 開始時刻（ISO 8601）
        end_time: 終了時刻（ISO 8601）
        step_minutes: 時間刻み（分）
        zoom_levels: ズームレベルリスト
        buildings_geojson: 建物GeoJSONファイルパス
        output_dir: 出力ディレクトリ

    Returns:
        {'success': bool, 'tiles_generated': int, 'time_buckets': [...]}
    """
    print(f"Loading buildings from {buildings_geojson}...")
    buildings = load_buildings_from_geojson(buildings_geojson)
    print(f"Loaded {len(buildings)} buildings")

    # 時間範囲を生成
    dt_start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    dt_end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))

    current_dt = dt_start
    time_buckets = []
    total_tiles = 0

    while current_dt <= dt_end:
        time_bucket = format_time_bucket(current_dt)
        time_buckets.append(time_bucket)

        print(f"\nGenerating tiles for {time_bucket} ({current_dt.isoformat()})...")

        tiles = generate_tiles_for_bbox(
            bbox=bounds,
            zoom_levels=zoom_levels,
            buildings=buildings,
            dt=current_dt,
            output_dir=output_dir,
            time_bucket=time_bucket
        )

        total_tiles += len(tiles)
        print(f"  Generated {len(tiles)} tiles")

        # 次の時刻へ
        current_dt += timedelta(minutes=step_minutes)

    return {
        'success': True,
        'tiles_generated': total_tiles,
        'time_buckets': time_buckets,
    }


def main():
    parser = argparse.ArgumentParser(description='日陰タイル生成ワーカー')
    parser.add_argument('--config', type=str, required=True, help='設定JSONファイルパス')

    args = parser.parse_args()

    # 設定を読み込み
    with open(args.config, 'r') as f:
        config = json.load(f)

    # ジョブ実行
    result = generate_shade_tiles_job(
        bounds=config['bounds'],
        start_time=config['startTime'],
        end_time=config['endTime'],
        step_minutes=config.get('stepMinutes', 10),
        zoom_levels=config.get('zooms', [15, 16, 17]),
        buildings_geojson=config['buildingsGeojson'],
        output_dir=config['outputDir']
    )

    # 結果を出力
    print('\n' + '='*60)
    print('JOB COMPLETED')
    print('='*60)
    print(json.dumps(result, indent=2))

    return 0


if __name__ == '__main__':
    sys.exit(main())
