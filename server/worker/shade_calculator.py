"""
日陰計算モジュール
太陽位置を計算し、建物の影を生成する
"""

import numpy as np
from datetime import datetime, timezone
from typing import List, Tuple, Dict
import pvlib
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union


class Building:
    """建物データ"""
    def __init__(self, footprint: List[Tuple[float, float]], height: float, building_id: str = ""):
        """
        Args:
            footprint: 建物の平面形状 [(lon, lat), ...]
            height: 建物の高さ（メートル）
            building_id: 建物ID（PLATEAU由来など）
        """
        self.footprint = footprint
        self.height = height
        self.building_id = building_id
        self.polygon = Polygon(footprint)


def get_sun_position(dt: datetime, latitude: float, longitude: float) -> Dict[str, float]:
    """
    指定日時・位置での太陽位置を計算

    Args:
        dt: 日時（UTC）
        latitude: 緯度
        longitude: 経度

    Returns:
        {
            'altitude': 太陽高度（度）,
            'azimuth': 太陽方位角（度、北=0、東=90）,
            'zenith': 天頂角（度）
        }
    """
    # pvlibで太陽位置を計算
    solar_position = pvlib.solarposition.get_solarposition(
        dt, latitude, longitude
    )

    altitude = solar_position['apparent_elevation'].iloc[0]
    azimuth = solar_position['azimuth'].iloc[0]
    zenith = solar_position['apparent_zenith'].iloc[0]

    return {
        'altitude': altitude,
        'azimuth': azimuth,
        'zenith': zenith,
    }


def is_sun_above_horizon(sun_position: Dict[str, float]) -> bool:
    """太陽が地平線上にあるか判定"""
    return sun_position['altitude'] > 0


def calculate_shadow_polygon(
    building: Building,
    sun_position: Dict[str, float],
    reference_latitude: float
) -> Polygon | None:
    """
    建物の影ポリゴンを計算

    Args:
        building: 建物データ
        sun_position: 太陽位置
        reference_latitude: 基準緯度（距離計算用）

    Returns:
        影のPolygon（太陽が沈んでいる場合はNone）
    """
    if not is_sun_above_horizon(sun_position):
        return None

    altitude_rad = np.radians(sun_position['altitude'])
    azimuth_rad = np.radians(sun_position['azimuth'])

    # 影の長さを計算（メートル）
    shadow_length = building.height / np.tan(altitude_rad)

    if shadow_length <= 0:
        return None

    # 影の方向（太陽の反対方向）
    # 方位角: 北=0, 東=90 → 影は太陽の反対なので +180度
    shadow_azimuth_rad = azimuth_rad + np.pi

    # 影の移動量（経度・緯度の差）
    # 簡易的な計算（小範囲では十分な精度）
    meters_per_degree_lat = 111320.0
    meters_per_degree_lon = 111320.0 * np.cos(np.radians(reference_latitude))

    # 影の移動ベクトル
    dx_lon = (shadow_length * np.sin(shadow_azimuth_rad)) / meters_per_degree_lon
    dx_lat = (shadow_length * np.cos(shadow_azimuth_rad)) / meters_per_degree_lat

    # 建物のフットプリントを影の方向にオフセット
    shadow_coords = [
        (lon + dx_lon, lat + dx_lat)
        for lon, lat in building.footprint
    ]

    # 影のポリゴン: 建物+オフセット頂点で構成
    # 建物の各エッジから影を伸ばす
    all_coords = list(building.footprint) + shadow_coords

    try:
        shadow_polygon = Polygon(all_coords).convex_hull
        return shadow_polygon
    except Exception as e:
        print(f"Error creating shadow polygon for building {building.building_id}: {e}")
        return None


def calculate_all_shadows(
    buildings: List[Building],
    sun_position: Dict[str, float],
    reference_latitude: float
) -> Polygon | None:
    """
    全建物の影を計算し、統合されたポリゴンを返す

    Args:
        buildings: 建物リスト
        sun_position: 太陽位置
        reference_latitude: 基準緯度

    Returns:
        統合された影のPolygon（影がない場合はNone）
    """
    shadow_polygons = []

    for building in buildings:
        shadow = calculate_shadow_polygon(building, sun_position, reference_latitude)
        if shadow and shadow.is_valid:
            shadow_polygons.append(shadow)

    if not shadow_polygons:
        return None

    # 全ての影を統合
    try:
        unified_shadow = unary_union(shadow_polygons)
        return unified_shadow
    except Exception as e:
        print(f"Error unifying shadows: {e}")
        return None


def is_point_in_shade(
    point: Tuple[float, float],
    shadow_polygon: Polygon | None
) -> bool:
    """
    指定座標が影の中にあるか判定

    Args:
        point: (longitude, latitude)
        shadow_polygon: 影のポリゴン

    Returns:
        True: 日陰, False: 日向
    """
    if shadow_polygon is None:
        return False

    p = Point(point)
    return shadow_polygon.contains(p)


if __name__ == "__main__":
    # テスト
    print("Testing shade calculator...")

    # 東京駅周辺でテスト
    dt = datetime(2026, 1, 10, 3, 0, 0, tzinfo=timezone.utc)  # UTC 3:00 = JST 12:00
    latitude = 35.6812
    longitude = 139.7671

    sun_pos = get_sun_position(dt, latitude, longitude)
    print(f"Sun position at Tokyo Station (2026-01-10 12:00 JST):")
    print(f"  Altitude: {sun_pos['altitude']:.2f}°")
    print(f"  Azimuth: {sun_pos['azimuth']:.2f}°")
    print(f"  Above horizon: {is_sun_above_horizon(sun_pos)}")

    # テスト用建物（50m x 50m, 高さ100m）
    test_building = Building(
        footprint=[
            (139.767, 35.681),
            (139.768, 35.681),
            (139.768, 35.682),
            (139.767, 35.682),
        ],
        height=100.0,
        building_id="test-building-1"
    )

    shadow = calculate_shadow_polygon(test_building, sun_pos, latitude)
    if shadow:
        print(f"\nShadow polygon area: {shadow.area:.8f} square degrees")
        print(f"Shadow polygon bounds: {shadow.bounds}")
