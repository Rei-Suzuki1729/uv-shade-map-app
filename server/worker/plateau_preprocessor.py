#!/usr/bin/env python3
"""
PLATEAU建物データ前処理スクリプト
CityGMLからGeoJSON形式に変換し、高さ情報を抽出する

PoC用: まずは簡易的なGeoJSON形式を想定
実際のPLATEAU CityGMLパーサーは別途実装が必要
"""

import json
import argparse
from pathlib import Path
from typing import List, Dict


def create_sample_buildings_geojson(
    bbox: Dict[str, float],
    output_path: str,
    grid_size: int = 5,
    default_height: float = 20.0
) -> None:
    """
    PoC用: サンプル建物データを生成

    実際のPLATEAUデータが準備できるまでの暫定措置
    bbox内にグリッド状の建物を配置

    Args:
        bbox: {'north', 'south', 'east', 'west'}
        output_path: 出力GeoJSONファイルパス
        grid_size: グリッドサイズ（N x N 個の建物）
        default_height: デフォルト建物高さ（メートル）
    """
    features = []

    # 経度・緯度の刻み
    lon_step = (bbox['east'] - bbox['west']) / grid_size
    lat_step = (bbox['north'] - bbox['south']) / grid_size

    building_id = 1

    for i in range(grid_size):
        for j in range(grid_size):
            # 建物の中心位置
            lon_center = bbox['west'] + (i + 0.5) * lon_step
            lat_center = bbox['south'] + (j + 0.5) * lat_step

            # 建物のフットプリント（50m x 50m 相当）
            # 1度 ≒ 111km なので、50m ≒ 0.00045度
            offset = 0.00025  # 約28m四方

            footprint = [
                [lon_center - offset, lat_center - offset],
                [lon_center + offset, lat_center - offset],
                [lon_center + offset, lat_center + offset],
                [lon_center - offset, lat_center + offset],
                [lon_center - offset, lat_center - offset],  # 閉じる
            ]

            # 高さをランダム化（10m〜50m）
            import random
            height = random.uniform(10.0, 50.0)

            feature = {
                'type': 'Feature',
                'properties': {
                    'id': f'poc-building-{building_id}',
                    'height': height,
                    'building_type': 'sample',
                },
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [footprint]
                }
            }

            features.append(feature)
            building_id += 1

    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }

    # 出力
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(features)} sample buildings")
    print(f"Saved to: {output_path}")


def parse_plateau_citygml(
    citygml_path: str,
    output_geojson_path: str,
    bbox: Dict[str, float] | None = None
) -> None:
    """
    PLATEAU CityGMLファイルをGeoJSONに変換

    TODO: 実際のCityGMLパーサーを実装
    現在は未実装（PoC後に実装予定）

    Args:
        citygml_path: CityGMLファイルパス
        output_geojson_path: 出力GeoJSONファイルパス
        bbox: フィルタリング用bbox（オプション）
    """
    raise NotImplementedError(
        "PLATEAU CityGML parser is not yet implemented. "
        "Use create_sample_buildings_geojson() for PoC."
    )


def main():
    parser = argparse.ArgumentParser(description='PLATEAU建物データ前処理')
    parser.add_argument('--mode', choices=['sample', 'plateau'], default='sample',
                        help='処理モード: sample=サンプル生成, plateau=CityGMLパース')
    parser.add_argument('--bbox', type=str, required=True,
                        help='bbox (JSON形式): {"north":N,"south":S,"east":E,"west":W}')
    parser.add_argument('--output', type=str, required=True,
                        help='出力GeoJSONファイルパス')
    parser.add_argument('--grid-size', type=int, default=10,
                        help='サンプルモードのグリッドサイズ（デフォルト: 10）')

    args = parser.parse_args()

    bbox = json.loads(args.bbox)

    if args.mode == 'sample':
        create_sample_buildings_geojson(
            bbox=bbox,
            output_path=args.output,
            grid_size=args.grid_size
        )
    elif args.mode == 'plateau':
        # TODO: 実装
        print("Error: PLATEAU mode is not yet implemented")
        return 1

    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
