# 日陰優先ルーティングに関する学術研究調査結果

## 1. CoolWalks研究 (Nature Scientific Reports, 2025)

**論文**: "CoolWalks for active mobility in urban street networks"
**著者**: Henrik Wolf, Ane Rahbek Vierø & Michael Szell
**出典**: Scientific Reports 15, Article number: 14911 (2025)

### 主要な概念

#### 1.1 日陰回避パラメータ α（アルファ）
- 歩行者の日光回避度を表すパラメータ
- α = 1: 日光を気にしない（最短経路を選択）
- α > 1: 日光を避けたい（日陰を優先）
- αが大きいほど、物理的に長くても日陰の多いルートを選択

#### 1.2 経験的距離（Experienced Length）の計算式
```
λ_ij = l_ij^sun × α + l_ij^shade
```
- l_ij^sun: 日なたを歩く物理的距離
- l_ij^shade: 日陰を歩く物理的距離
- α: 日陰回避パラメータ

#### 1.3 CoolWalkabilityメトリクス
- 都市の日陰歩行可能性を定量化する指標
- 建物の高さと街路ネットワークの幾何学的構造に依存
- 規則的なグリッド構造では日陰ルーティングの恩恵が少ない
- 不規則な街路構造では日陰優先ルートの選択肢が増える

### 重要な発見
1. 規則的なグリッド（マンハッタン型）では、CoolWalkabilityはαに依存しない
2. 建物の高さのバリエーションがあると日陰ルーティングの恩恵が増加
3. 不規則な街路ネットワーク（バルセロナ、バレンシア）では日陰優先ルートの効果が高い
4. 日陰の可用性は都市内で空間的にクラスター化している

---

## 2. Shadow as Route Quality Parameter研究 (2016)

**論文**: "Shadow as Route Quality Parameter in a Pedestrian-Tailored Mobile Application"
**著者**: Olaverri-Monreal et al.
**引用数**: 29回

### 主要なアプローチ
- 日なたのエッジに高い重み（コスト）を付与
- ルーティングアルゴリズムが日なたを避けるように誘導
- ウィーンでの実証実験を実施

### アルゴリズムの基本原理
```
edge_cost = base_distance × sun_exposure_factor
```
- sun_exposure_factor > 1 で日なたのエッジを不利に

---

## 3. 歩行者熱ストレス軽減研究 (2025)

**論文**: "Mitigating heat stress by reducing solar exposure in pedestrian routing"
**出典**: Transactions in GIS

### 主要な概念
- 太陽露出を最小化するルーティング
- 熱ストレス軽減と歩行距離のバランス
- 市民と都市計画の両方に有益

---

## 4. UV指数計算の科学的根拠

### WHO UV指数ガイドライン
- 0-2: 低（Low）- 特別な対策不要
- 3-5: 中程度（Moderate）- 日焼け止め推奨
- 6-7: 高（High）- 日陰を活用
- 8-10: 非常に高（Very High）- 屋外活動を控える
- 11+: 極端（Extreme）- 屋外活動を避ける

### 安全露出時間の計算（MED基準）
```
safe_time = MED / (UV_index × 0.0025)
```
- MED (Minimal Erythema Dose): 最小紅斑量
- 肌タイプ別のMED値（mJ/cm²）:
  - Type I: 200
  - Type II: 250
  - Type III: 300
  - Type IV: 450
  - Type V: 600
  - Type VI: 900

---

## 5. 実装への適用

### 推奨アルゴリズム改善

#### 5.1 経験的距離ベースのルーティング
```typescript
function calculateExperiencedLength(
  sunDistance: number,
  shadeDistance: number,
  alpha: number
): number {
  return sunDistance * alpha + shadeDistance;
}
```

#### 5.2 日陰優先度スコアの計算
```typescript
function calculateShadeScore(route: Route): number {
  const totalDistance = route.sunDistance + route.shadeDistance;
  const shadeRatio = route.shadeDistance / totalDistance;
  return shadeRatio * 100; // パーセンテージ
}
```

#### 5.3 ルート比較アルゴリズム
```typescript
function compareRoutes(routes: Route[], alpha: number): Route {
  return routes.reduce((best, current) => {
    const bestExp = calculateExperiencedLength(
      best.sunDistance, best.shadeDistance, alpha
    );
    const currentExp = calculateExperiencedLength(
      current.sunDistance, current.shadeDistance, alpha
    );
    return currentExp < bestExp ? current : best;
  });
}
```

---

## 6. 参考文献

1. Wolf, H., Vierø, A.R. & Szell, M. CoolWalks for active mobility in urban street networks. Sci Rep 15, 14911 (2025)
2. Olaverri-Monreal, C. et al. Shadow as Route Quality Parameter in a Pedestrian-Tailored Mobile Application (2016)
3. WHO Global Solar UV Index: A Practical Guide (2002)
4. Fitzpatrick, T.B. The validity and practicality of sun-reactive skin types I through VI. Arch Dermatol 124, 869-871 (1988)


---

## 7. UV指数と日焼けの関係（Probit方法論）

**論文**: "Relationship between ultraviolet index (UVI) and first-, second- and third-degree sunburn using the Probit methodology"
**著者**: J. F. Sánchez-Pérez et al.
**出典**: Scientific Reports 9, Article number: 733 (2019)
**引用数**: 46回

### 7.1 UV放射線量の計算式

```
D = I^(4/3) × t_e
```
- D: UV放射線量 ((W/m²)^(4/3) × s)
- I: UV放射強度 (W/m²)
- t_e: 露出時間 (秒)

### 7.2 UV指数とUV放射強度の関係

```
I_UV = 15.1 × UVI + 35.5 (W/m²)
```

### 7.3 肌タイプ別の1度日焼け発生線量

| 肌タイプ | 線量 ((kW/m²)^(4/3) × s) | 説明 |
|---------|------------------------|------|
| Type I  | ~90 | 非常に敏感、常に日焼け |
| Type II | 115 | 敏感、容易に日焼け |
| Type III| ~150 | 中程度、時々日焼け |
| Type IV | ~200 | やや耐性あり |
| Type V  | ~300 | 耐性あり |
| Type VI | ~400 | 非常に耐性あり |

### 7.4 UV指数と露出時間の関係（1度日焼けまで）

DIN-5050規格に基づく肌タイプ別の安全露出時間（分）:

| UVI | Type I | Type II | Type III | Type IV | Type V | Type VI |
|-----|--------|---------|----------|---------|--------|---------|
| 1   | 67     | 100     | 200      | 300     | >300   | >300    |
| 2   | 33     | 50      | 100      | 150     | 300    | >300    |
| 3   | 22     | 33      | 67       | 100     | 200    | >300    |
| 4   | 17     | 25      | 50       | 75      | 150    | 300     |
| 5   | 13     | 20      | 40       | 60      | 120    | 240     |
| 6   | 11     | 17      | 33       | 50      | 100    | 200     |
| 7   | 10     | 14      | 29       | 43      | 86     | 171     |
| 8   | 8      | 13      | 25       | 38      | 75     | 150     |
| 9   | 7      | 11      | 22       | 33      | 67     | 133     |
| 10  | 7      | 10      | 20       | 30      | 60     | 120     |
| 11+ | 6      | 9       | 18       | 27      | 55     | 109     |

### 7.5 重要な発見

1. **非黒色腫皮膚がんの90%以上**が肌タイプI・IIの人に発生
2. 子供はUV放射線に対してより敏感
3. 暗い肌の人でも目の損傷（日光網膜症、光結膜炎など）のリスクあり
4. UV指数は0〜16の範囲で変動し、5段階の危険度に分類

---

## 8. 実装への適用（改善版）

### 8.1 科学的根拠に基づく安全露出時間計算

```typescript
// DIN-5050規格に基づく安全露出時間（分）
function calculateSafeExposureTime(
  uvIndex: number,
  skinType: 1 | 2 | 3 | 4 | 5 | 6
): number {
  // 肌タイプ別の基準時間（UVI=1での分数）
  const baseTime: Record<number, number> = {
    1: 67,
    2: 100,
    3: 200,
    4: 300,
    5: 400,
    6: 500
  };
  
  // UV指数に反比例して減少
  const safeTime = baseTime[skinType] / uvIndex;
  
  return Math.round(safeTime);
}
```

### 8.2 経験的距離ベースの日陰ルーティング（CoolWalks準拠）

```typescript
// CoolWalks論文に基づく経験的距離計算
function calculateExperiencedLength(
  sunDistance: number,      // 日なたを歩く距離（m）
  shadeDistance: number,    // 日陰を歩く距離（m）
  alpha: number             // 日光回避パラメータ（1.0〜3.0推奨）
): number {
  // λ_ij = l_ij^sun × α + l_ij^shade
  return sunDistance * alpha + shadeDistance;
}

// 最適ルート選択
function findOptimalShadeRoute(
  routes: Array<{sunDistance: number; shadeDistance: number}>,
  alpha: number
): number {
  let minExperienced = Infinity;
  let optimalIndex = 0;
  
  routes.forEach((route, index) => {
    const experienced = calculateExperiencedLength(
      route.sunDistance,
      route.shadeDistance,
      alpha
    );
    if (experienced < minExperienced) {
      minExperienced = experienced;
      optimalIndex = index;
    }
  });
  
  return optimalIndex;
}
```

### 8.3 UV放射線量の計算

```typescript
// Sánchez-Pérez論文に基づくUV放射強度計算
function calculateUVIntensity(uvIndex: number): number {
  // I_UV = 15.1 × UVI + 35.5 (W/m²)
  return 15.1 * uvIndex + 35.5;
}

// UV放射線量の計算
function calculateUVDose(
  uvIndex: number,
  exposureTimeSeconds: number
): number {
  const intensity = calculateUVIntensity(uvIndex);
  // D = I^(4/3) × t_e
  return Math.pow(intensity, 4/3) * exposureTimeSeconds;
}
```
