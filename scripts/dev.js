//scripts/dev.js
/**
 * 打包「開發環境」使用的腳本
 *
 * 用法示例：
 *   node scripts/dev.js --format esm
 *   node scripts/dev.js -f cjs reactive
 *
 * - 位置參數（第一個）用來指定要打包的子套件名稱（對應 packages/<name>）
 * - --format / -f 指定輸出格式：esm | cjs | iife（預設 esm）
 */

import { parseArgs } from 'node:util'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'
import { createRequire } from 'node:module'

/**
 * 解析命令列參數
 * allowPositionals: 允許使用位置參數（例如 reactive）
 * options.format: 支援 --format 或 -f，型別為字串，預設 'esm'
 */
const {
    values: { format },
    positionals,
} = parseArgs({
    allowPositionals: true,
    options: {
        format: {
            type: 'string',
            short: 'f',
            default: 'esm',
        },
    },
})

/**
 * 在 ESM 模式下建立 __filename / __dirname
 * - ESM 沒有這兩個全域變數，因此透過 import.meta.url 轉換得到
 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 在 ESM 中建立一個 require()
 * - 用來載入 CJS 風格資源（例如 JSON）
 */
const require = createRequire(import.meta.url)

/**
 * 解析要打包的 target
 * - 若有提供位置參數，取第一個；否則預設打包 packages/vue
 */
const target = positionals.length ? positionals[0] : 'vue'

/**
 * 入口檔案（固定指向 packages/<target>/src/index.ts）
 */
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)

/**
 * 決定輸出檔路徑
 * - 命名慣例：<target>.<format>.js
 *   例：reactive.cjs.js / reactive.esm.js
 */
const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`)

/**
 * 讀取目標子套件的 package.json
 * - 常見做法是從中讀 buildOptions.name，作為 IIFE/UMD 的全域變數名
 * - 若 package.json 沒有 buildOptions，請自行調整
 */
const pkg = require(`../packages/${target}/package.json`)

/**
 * 建立 esbuild 編譯 context 並進入 watch 模式
 * - entryPoints: 打包入口
 * - outfile: 打包輸出檔案
 * - format: 'esm' | 'cjs' | 'iife'
 * - platform: esbuild 的目標平台（'node' | 'browser'）
 *   * 這裡示範：如果是 cjs，就傾向 node；否則視為 browser
 * - sourcemap: 方便除錯
 * - bundle: 把相依打進去（單檔輸出）
 * - globalName: IIFE/UMD 下掛在 window 的全域名稱（esm/cjs 不會用到）
 */
esbuild
    .context({
        entryPoints: [entry],                          // 入口檔
        outfile,                                       // 輸出檔
        format,                                        // 輸出格式：esm | cjs | iife
        platform: format === 'cjs' ? 'node' : 'browser',// 目標平台：node 或 browser
        sourcemap: true,                               // 產生 source map
        bundle: true,                                  // 打包成單檔
        globalName: pkg.buildOptions?.name,            // IIFE/UMD 會用到；esm/cjs 可忽略
    })
    .then(async (ctx) => {
        // 啟用 watch：監聽檔案變更並自動重建
        await ctx.watch()
        console.log(
            `[esbuild] watching "${target}" in ${format} mode → ${outfile}`
        )
    })
    .catch((err) => {
        console.error('[esbuild] build context error:', err)
        process.exit(1)
    })
