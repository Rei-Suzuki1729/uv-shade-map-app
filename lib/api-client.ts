/**
 * APIクライアント
 * バックエンドAPIとの通信を担当
 * 
 * 注意: tRPC ReactはReact Queryフックを使用します。
 * このファイルは型定義のみを提供し、
 * 実際の使用はコンポーネント内でtrpcフックを使用してください。
 */

export interface UVDataResponse {
  uvIndex: number;
  uvMax?: number;
  uvMaxTime?: string;
  safeExposureTime?: number;
  timestamp: string;
}

export interface SearchResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string;
  importance?: number;
}

// 使用例:
// import { trpc } from '@/lib/trpc';
// 
// function MyComponent() {
//   const { data, isLoading } = trpc.uv.getData.useQuery({ latitude, longitude });
//   const mutation = trpc.favorites.add.useMutation();
//   
//   const handleAdd = () => {
//     mutation.mutate({ name, latitude, longitude });
//   };
// }


