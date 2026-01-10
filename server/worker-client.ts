/**
 * Python Worker クライアント
 * Node.jsからPythonワーカーを呼び出す
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ShadeJobConfig {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  stepMinutes: number;
  zooms: number[];
}

export interface ShadeJobResult {
  success: boolean;
  tiles_generated?: number;
  time_buckets?: string[];
  error?: string;
}

/**
 * 日陰タイル生成ジョブを実行
 */
export async function generateShadeTiles(
  jobId: string,
  config: ShadeJobConfig,
  buildingsGeojsonPath: string
): Promise<ShadeJobResult> {
  const workerDir = join(process.cwd(), 'server', 'worker');
  const tilesDir = join(process.cwd(), 'tiles', 'shade');
  const configPath = join(workerDir, `job-${jobId}.json`);

  // 設定ファイルを作成
  const jobConfig = {
    bounds: config.bounds,
    startTime: config.startTime,
    endTime: config.endTime,
    stepMinutes: config.stepMinutes,
    zooms: config.zooms,
    buildingsGeojson: buildingsGeojsonPath,
    outputDir: tilesDir,
  };

  writeFileSync(configPath, JSON.stringify(jobConfig, null, 2));

  // Pythonワーカーを起動
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      join(workerDir, 'worker.py'),
      '--config',
      configPath,
    ], {
      cwd: workerDir,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[worker ${jobId}] ${output.trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`[worker ${jobId}] ERROR: ${output.trim()}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // 成功: stdoutから結果JSONを抽出
        try {
          // 最後のJSON出力を探す
          const lines = stdout.split('\n');
          const jsonLine = lines.reverse().find(line => line.trim().startsWith('{'));

          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            resolve(result);
          } else {
            resolve({
              success: true,
              tiles_generated: 0,
              time_buckets: [],
            });
          }
        } catch (e) {
          console.error('Failed to parse worker output:', e);
          resolve({
            success: true,
            tiles_generated: 0,
            time_buckets: [],
          });
        }
      } else {
        reject({
          success: false,
          error: `Worker process exited with code ${code}`,
        });
      }
    });

    pythonProcess.on('error', (err) => {
      reject({
        success: false,
        error: `Failed to start worker: ${err.message}`,
      });
    });
  });
}

/**
 * サンプル建物データを生成
 */
export async function generateSampleBuildings(
  bbox: { north: number; south: number; east: number; west: number },
  outputPath: string,
  gridSize: number = 10
): Promise<void> {
  const workerDir = join(process.cwd(), 'server', 'worker');

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      join(workerDir, 'plateau_preprocessor.py'),
      '--mode', 'sample',
      '--bbox', JSON.stringify(bbox),
      '--output', outputPath,
      '--grid-size', gridSize.toString(),
    ], {
      cwd: workerDir,
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[preprocessor] ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[preprocessor] ERROR: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Preprocessor exited with code ${code}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start preprocessor: ${err.message}`));
    });
  });
}
