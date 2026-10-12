# CLAUDE.md — ソルフェ道場 開発メモ

このリポジトリは、ギター×ソルフェージュ(音感・発声・リズム)の個人用トレーニングPWA「ソルフェ道場」です。
どのPCのClaude Codeからでも同じ前提で作業できるよう、ここに作業ルールをまとめています。機能の一覧は README.md を参照。

## ユーザーについて(大事)

- **返答は必ず日本語**。手順案内や確認も日本語で。
- ギターを弾くが、音感・発声は**初心者**。難しすぎる設計は嫌う。
  - 声のレッスンは「キーC固定」「毎回お手本」「高い/低いの大きな案内」を標準にしている。いきなりのキー変化は苦手。
  - 新機能は「やさしい段階 → 難しい段階」の順に組む。
- 「継続したくなる・やり込みたくなる」ことを重視(XP、★、ストリーク、ゲーム、週間レポート)。
- 新しい機能の候補は、選択肢を提示して選んでもらうと進めやすい。

## 公開と更新

- 公開URL:https://stateishidohc.github.io/solfa-dojo/ (GitHub Pages、`main` ブランチ直下をそのまま配信)
- **`main` に push すると1〜2分で公開版に反映**される。ビルド工程はない。
- **リポジトリは公開(public)**。個人情報・メールアドレス・秘密情報を絶対にコミットしない。
  - コミットの作者はGitHubの匿名アドレス(`254378438+stateishidohc@users.noreply.github.com`)。新しいPCでは
    `git config user.name stateishidohc` と `git config user.email 254378438+stateishidohc@users.noreply.github.com` をリポジトリに設定する。
  - push の前に `git grep` で個人名・メール・ローカルのパスが入っていないか確認する。
- **ファイルを変更して公開するときは、`sw.js` の `VERSION` を1つ上げる**(オフライン用キャッシュの更新のため)。
- ページには `noindex` を入れて検索エンジンに載らないようにしている。外さない。
- 複数のPCで作業するときは、**作業前に必ず `git pull`**。終わったら commit → push。

## ファイル構成

```
index.html              アプリ本体(HTML/CSS/JS すべて。ビルドなし)
sw.js                   Service Worker(本体はネット優先、samples/icons はキャッシュ優先)
manifest.webmanifest    PWA マニフェスト
icons/                  アイコン
samples/{nylon,steel,piano}/<MIDI>.mp3   実楽器サンプル(MIDI 36〜88)。クレジットは README
classic.html            旧版「耳トレ」(触らない)
```

## index.html の中身(上から順に)

1. CSS(`<style>`)。ダーク/ライトは `:root[data-theme=dark]` の変数で切替
2. HTML の骨組み(`<section id="v-...">` が各画面。タブは home / course(音感) / rhythm / arcade / stats、図鑑と設定はヘッダーのボタン)
3. JS
   - 音楽理論データ、オーディオ(`note()` `noteAt()` `keyRef()` `voiceTone()` など)、マイク(`micStart()` `detectPitch()`)
   - セーブデータ `load()`(localStorage キー `solfaDojo_v1`。**新しい項目は load() の Object.assign で既定値を足す**)
   - カリキュラム:音感 `TRACKS`、リズム `RTRACKS`、曲 `SONGS`。**レッスン一覧 `LESSONS` は `ALL_TRACKS = TRACKS.concat(RTRACKS)` を作る時点で確定する**ので、
     新しいトラックやレッスンのデータはそれより前に追加すること
   - 問題ジェネレーター `GEN.<name>(params)` → `{kind:'choice'|'seq'|'fret'|'mic', ...}`(クイズ形式のレッスン)
   - リズムエンジン `rgStart(cfg)`:小節を `cfg.bar(i)` で遅延生成し Web Audio に先行予約。判定は `rgTap` → `rgJudge`。
     `cfg.mic` でマイク入力(`onsetStart()` のオンセット検出)。エコー/サバイバル/テンポ診断/コードチェンジもこの上に作っている
   - 声のレッスン `startVoice(id)`(はしご表示 `vDraw`)。`voice.items` で「課題」と「音程」を混在できる。別枠は `VEXTRA`(warmup / vrange)
   - 画面描画 `render*()`、週間レポート `openWeekly()`、設定 `renderSettings()`、起動処理

## ハマりどころ(実際に起きたこと)

- **文字列置換でコードを挿入するとき**:CSS 内にも `/* ---------- コース ---------- */` のような同名コメントがある。JS を挿入するなら `<script>` より後ろを対象にする。
- **iPhone のマイク**:`navigator.audioSession.type` が `'playback'` のまま `getUserMedia` すると拒否される。必ず `'play-and-record'` にしてから要求する(`micStart` で対応済み)。
- **マイクのオンセット検出**:64サンプル単位のRMSだと低音の波形でずっと誤検出する → 包絡線(瞬時アタック・40msリリース)で約25ms前と比較している。
  クリック音は立ち上がりを2msなめらかにし、マイク入力時は高い音(2.6〜3.1kHz)にして、500Hz×3段のローパスで除去している。
- **コード判定**:FFT の窓が約0.17秒あるので、弾いてから180ms後に判定する(早いと前のコードが混ざる)。
- **ブラウザペイン(Claude Code の確認用ブラウザ)**:マイク不可、Service Worker 登録不可、画面が隠れていると `requestAnimationFrame` が止まる。
  音源の確認は Service Worker を外して行う。

## テストのやり方

- ローカル起動:`python3 -m http.server 8124 --directory .`(→ http://localhost:8124)。Claude Code では `.claude/launch.json` の preview を使ってよい。
- 構文チェック:`<script>` の中身を取り出して `node --check`。
- マイクの機能は**模擬入力**で確認する:
  - 音程:`window.micStart` を差し替えて `MIC.cb(midi)` を一定間隔で呼ぶ
  - オンセット/コード:`navigator.mediaDevices.getUserMedia` を `MediaStreamDestination` を返す関数に差し替え、
    `AE.master` を `DelayNode`(60ms)経由でつなぐと「スピーカー→マイク」を再現できる。ギターの音は `noteAt(..., dest)` で直接流す
- リズムは「ノーツの時刻にタップする自動プレイ」を `setInterval(…, 3)` で回して判定を確認する。
- 変更後は全レッスンを開いて(`openLesson`)、全ジェネレーターを数十回ずつ回し、エラーがないか確認する。
- 確認が終わったら `localStorage.removeItem('solfaDojo_v1')` でテスト用データを消す。
