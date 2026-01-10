"""
タイル生成モジュール
地図タイル（PNG）を生成する
"""

import numpy as np
from PIL import Image
from typing import List, Tuple, Dict
from datetime import datetime
import mercantile
from shade_calculator import Building, calculate_all_shadows, is_point_in_shade, get_sun_position


TILE_SIZE = 256  # 標準的な地図タイルサイズ


def tile_to_bbox(z: int, x: int, y: int) -> Dict[str, float]:
    """
    タイル座標からbboxを計算

    Args:
        z: ズームレベル
        x: タイルX座標
        y: タイルY座標

    Returns:
        {'west': lon, 'south': lat, 'east': lon, 'north': lat}
    """
    bounds = mercantile.bounds(x, y, z)
    return {
        'west': bounds.west,
        'south': bounds.south,
        'east': bounds.east,
        'north': bounds.north,
    }


def pixel_to_lonlat(
    z: int, x: int, y: int,
    pixel_x: int, pixel_y: int
) -> Tuple[float, float]:
    """
    タイル内のピクセル座標を経度・緯度に変換

    Args:
        z, x, y: タイル座標
        pixel_x, pixel_y: タイル内のピクセル座標 (0-255)

    Returns:
        (longitude, latitude)
    """
    bbox = tile_to_bbox(z, x, y)

    # ピクセル位置を0-1の範囲に正規化
    u = pixel_x / TILE_SIZE
    v = pixel_y / TILE_SIZE

    # 経度・緯度を計算
    lon = bbox['west'] + u * (bbox['east'] - bbox['west'])
    lat = bbox['north'] - v * (bbox['north'] - bbox['south'])  # 画像のY軸は上から下

    return lon, lat


def generate_shade_tile(
    z: int, x: int, y: int,
    buildings: List[Building],
    dt: datetime,
    reference_latitude: float,
    sampling_rate: int = 4
) -> Image.Image:
    """
    日陰タイルを生成

    Args:
        z, x, y: タイル座標
        buildings: 建物リスト
        dt: 日時（UTC）
        reference_latitude: 基準緯度
        sampling_rate: サンプリングレート（高いほど高品質だが遅い）

    Returns:
        PIL Image（RGBA、日陰部分は半透明の黒）
    """
    # 太陽位置を計算
    bbox = tile_to_bbox(z, x, y)
    center_lat = (bbox['north'] + bbox['south']) / 2
    center_lon = (bbox['east'] + bbox['west']) / 2

    sun_position = get_sun_position(dt, center_lat, center_lon)

    # 影のポリゴンを計算
    shadow_polygon = calculate_all_shadows(buildings, sun_position, reference_latitude)

    # 画像を作成（RGBA）
    img_array = np.zeros((TILE_SIZE, TILE_SIZE, 4), dtype=np.uint8)

    # 各ピクセルについて日陰判定
    # sampling_rate で間引いてパフォーマンス向上
    step = max(1, TILE_SIZE // (TILE_SIZE // sampling_rate))

    for pixel_y in range(0, TILE_SIZE, step):
        for pixel_x in range(0, TILE_SIZE, step):
            lon, lat = pixel_to_lonlat(z, x, y, pixel_x, pixel_y)

            if is_point_in_shade((lon, lat), shadow_polygon):
                # 日陰: 半透明の黒 (R, G, B, A)
                # PoCでは視認性重視で濃いめに
                for dy in range(step):
                    for dx in range(step):
                        py = min(pixel_y + dy, TILE_SIZE - 1)
                        px = min(pixel_x + dx, TILE_SIZE - 1)
                        img_array[py, px] = [0, 0, 0, 150]  # 黒、透明度150/255

    # NumPy配列からPIL Imageを作成
    img = Image.fromarray(img_array, mode='RGBA')

    return img


def save_tile(
    img: Image.Image,
    output_path: str
) -> None:
    """
    タイル画像を保存

    Args:
        img: PIL Image
        output_path: 出力パス (.png)
    """
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG', optimize=True)


def generate_tiles_for_bbox(
    bbox: Dict[str, float],
    zoom_levels: List[int],
    buildings: List[Building],
    dt: datetime,
    output_dir: str,
    time_bucket: str
) -> List[str]:
    """
    指定bboxの全タイルを生成

    Args:
        bbox: {'north', 'south', 'east', 'west'}
        zoom_levels: ズームレベルのリスト
        buildings: 建物リスト
        dt: 日時（UTC）
        output_dir: 出力ディレクトリ（例: /path/to/tiles/shade）
        time_bucket: タイムバケット（例: 20260110_1530）

    Returns:
        生成されたタイルパスのリスト
    """
    generated_tiles = []
    reference_latitude = (bbox['north'] + bbox['south']) / 2

    for z in zoom_levels:
        # bboxに含まれるタイルを列挙
        tiles = list(mercantile.tiles(
            bbox['west'], bbox['south'],
            bbox['east'], bbox['north'],
            zooms=z
        ))

        print(f"Generating {len(tiles)} tiles for zoom level {z}...")

        for tile in tiles:
            x, y = tile.x, tile.y

            # タイル生成
            img = generate_shade_tile(
                z, x, y,
                buildings,
                dt,
                reference_latitude,
                sampling_rate=4  # PoCは品質重視で4
            )

            # 保存
            tile_path = f"{output_dir}/{time_bucket}/{z}/{x}/{y}.png"
            save_tile(img, tile_path)
            generated_tiles.append(tile_path)

        print(f"  Completed zoom level {z}: {len(tiles)} tiles")

    return generated_tiles


if __name__ == "__main__":
    # テスト
    print("Testing tile generator...")

    from datetime import timezone

    # 東京駅周辺の小さなbbox
    test_bbox = {
        'north': 35.682,
        'south': 35.680,
        'east': 139.768,
        'west': 139.766,
    }

    # テスト用建物
    test_buildings = [
        Building(
            footprint=[
                (139.7665, 35.6805),
                (139.7675, 35.6805),
                (139.7675, 35.6815),
                (139.7665, 35.6815),
            ],
            height=100.0,
            building_id="test-building-1"
        ),
    ]

    dt = datetime(2026, 1, 10, 3, 0, 0, tzinfo=timezone.utc)  # JST 12:00

    # 1タイルだけ生成してテスト
    z, x, y = 17, 116534, 51352  # 東京駅周辺
    img = generate_shade_tile(z, x, y, test_buildings, dt, 35.681)

    print(f"Generated test tile {z}/{x}/{y}")
    print(f"Image size: {img.size}")
    print(f"Image mode: {img.mode}")
