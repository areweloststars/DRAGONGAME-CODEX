// word-game/index.html을 app/src에서 만들어요. 손으로 index.html을 고치지 말고 src를 고친 뒤 이 파일을 실행하세요.
//   node app/build.cjs          → word-game/index.html 다시 쓰기
//   node app/build.cjs --check  → 지금 index.html이 src와 같은지만 확인 (다르면 실패)
// src/NN-이름.js 파일들은 번호 순서대로 하나의 <script>로 이어 붙여요 (모두 같은 전역 범위에서 돌아요).
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, 'src');
const out = path.join(__dirname, '..', 'word-game', 'index.html');
const MARKS = { css: '/*@@STYLES@@*/\n', js: '/*@@SCRIPT@@*/\n' };

// 조각들: 껍데기 HTML, CSS, 이어 붙인 JS (테스트도 이 JS를 그대로 실행해요)
function parts() {
  const read = f => fs.readFileSync(f === '08-image-engine.js' ? path.join(src, '../../image-engine/core.js') : path.join(src, f), 'utf8').replace(/\r\n/g, '\n');
  const js = fs.readdirSync(src).filter(f => /^\d\d-[\w-]+\.js$/.test(f)).sort().map(read).join('');
  const shell = read('shell.html');
  for (const mark of Object.values(MARKS)) if (shell.split(mark).length !== 2) throw new Error(`shell.html needs exactly one ${mark.trim()}`);
  return { shell, css: read('styles.css'), js };
}
function build() {
  const p = parts();
  // 바꿔 넣을 글에 '$'가 있어도 그대로 들어가도록 함수로 바꿈
  return p.shell.replace(MARKS.css, () => p.css).replace(MARKS.js, () => p.js);
}
module.exports = { build, parts, out };

if (require.main === module) {
  const html = build();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (cur !== html) {
      let i = 0; while (i < cur.length && cur[i] === html[i]) i++;
      const line = cur.slice(0, i).split('\n').length;
      console.error(`word-game/index.html is out of date (first difference at line ${line}). Run: node app/build.cjs`);
      process.exit(1);
    }
    console.log('word-game/index.html is up to date');
  } else {
    fs.writeFileSync(out, html);
    console.log(`built word-game/index.html (${html.length} chars)`);
  }
}
