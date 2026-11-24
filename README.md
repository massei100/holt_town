# 우리 동네 생활 체험 · My Town

특수학교와 특수학급에서 한 손가락으로 체험하는 한국어 3D 생활 시뮬레이션입니다. 첫 버전은 **우유를 사 오세요** 미션과 집·편의점 자유 체험을 제공합니다. 로그인 없이 실행되며 설정과 기록은 현재 브라우저에 저장됩니다.

## 실행

Node.js 22.12 이상과 npm을 설치한 환경에서 이 폴더를 열고 실행합니다.

```bash
npm ci
npm run dev
```

터미널에 표시된 로컬 주소를 Chrome 또는 Edge에서 엽니다. 태블릿과 전자칠판에서는 가로 방향을 사용하고 시작 화면의 **전체 화면**을 누르세요. `dist`를 받았다면 웹 서버로 해당 폴더를 제공하면 바로 실행할 수 있습니다. 브라우저가 실내 장면과 자바스크립트를 불러오려면 HTTP(S) 주소를 사용해야 합니다.

## 체험

1. **게임 시작** 또는 **미션 체험**을 누르고 캐릭터와 옷 색상을 고릅니다.
2. 우리 집에서 카드와 가방을 받고 마을로 나갑니다.
3. 편의점 건물이나 장소 이름을 누릅니다. 횡단보도에서 차가 멈출 때까지 기다리고 양쪽을 확인한 뒤 건넙니다.
4. 편의점에서 우유를 골라 장바구니에 담고 계산합니다. 계산을 마치면 물건을 받습니다.
5. 집에 돌아가 우유를 전하고 완료 화면과 체크 표시를 확인합니다.

**자유 체험**에서는 집과 편의점을 반복 방문할 수 있습니다. 미션 도중 홈으로 돌아가도 최근 안전 지점과 행동 단계에서 이어갈 수 있습니다. 공용 기기에서는 **설정 → 활동 기록 초기화**를 사용합니다. 한국어 음성은 브라우저가 제공하는 음성을 사용하며, 화면에도 같은 안내가 표시됩니다.

## 테스트와 빌드

```bash
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Playwright는 빌드를 `/my-town/` 하위 경로에서 열어 검사합니다. `TOWN_SCREENSHOT_DIR` 환경 변수에 경로를 지정하면 주요 화면을 캡처합니다.

## GitHub Pages 배포

1. 이 폴더의 내용으로 GitHub 저장소를 만들고 기본 브랜치를 `main`으로 설정합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. 소스를 `main`에 푸시하거나 **Actions → Deploy GitHub Pages → Run workflow**를 실행합니다.
4. 배포가 성공하면 워크플로의 `github-pages` 환경에 표시된 주소를 엽니다.

워크플로는 `npm ci`, 규칙 테스트, Vite 빌드를 실행하고 `dist/`를 게시합니다. Vite의 상대 경로 설정은 프로젝트 하위 주소와 실내 청크를 지원합니다.

[GitHub Pages 공식 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 프로젝트 문서

- [전체 설계와 단계별 계획](PROJECT_PLAN.md)
- [구현 및 검증 현황](DEVELOPMENT_STATUS.md)
- [변경 이력](CHANGELOG.md)
- [에셋과 라이선스](ASSET_LICENSES.md)

