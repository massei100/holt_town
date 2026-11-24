# 우리 동네 생활 체험 · 실시간 멀티플레이

홀트학교 학생들이 같은 3D 마을에서 직접 움직이고 상자를 함께 배달하는 생활 체험 게임입니다. GitHub Pages의 [기존 1인용 버전](https://massei100.github.io/holt_town/)은 `main`에 있습니다. 멀티플레이 소스와 Render 설정은 `multiplayer` 브랜치에 있습니다.

## 실행

Node.js 22.16 이상이 설치된 프로젝트 폴더에서 실행합니다.

```bash
npm ci
npm run build
npm start
```

교사와 학생 모두 `http://localhost:3000`에 접속합니다. 교사 탭과 학생 탭을 별도로 열거나, 같은 네트워크에서 여러 기기로 서버에 접속해 체험할 수 있습니다. 서버 기본 포트는 `3000`이며 `PORT`로 변경할 수 있습니다. 개발 모드에서는 터미널 하나에서 `npm run dev:server`, 다른 하나에서 `npm run dev`를 실행합니다.

## 수업 진행

1. 교사가 **교사 · 방 만들기**를 누르고 여섯 자리 코드를 알려 줍니다. 학생은 방 코드와 캐릭터를 선택합니다. 별명을 비워 두면 **플레이어 번호**가 표시됩니다.
2. 교사가 **시작**을 누르면 배송 광장에서 미션을 시작합니다. 방향 버튼은 누르는 동안 이동하고 손을 떼면 정지 입력을 보냅니다. **설정 → 바닥 터치**를 사용하면 찍은 바닥으로 이동하고 다른 곳을 누르면 경로가 바뀝니다.
3. 상자 옆에서 상자 또는 손 버튼을 눌러 듭니다. 상자와 같은 기호의 집 앞에서 내려놓습니다. 잘못된 목적지에서는 상자를 계속 들고 있으며 맞는 위치가 강조됩니다.
4. 상자를 친구에게 건네려면 가까이에서 친구를 누릅니다. 빈 공간에 내려놓으면 그 자리에 생깁니다. 같은 방의 다른 학생과 선생님이 이 상태를 동시에 봅니다.
5. 교사는 지도에서 학생 위치를 보고 실내 관람 장소를 고를 수 있습니다. **다시 시작**, **학생 안전 이동**, **종료**는 교사용 세션에서만 실행됩니다.

가로형을 권장합니다. 전자칠판에서는 설정에서 **전자칠판**을 선택해 하단 버튼을 크게 사용합니다. 한국어 음성이 설치된 기기에서 안내를 들을 수 있습니다. 상자와 학교 표시에는 색상과 기호가 함께 표시됩니다.

## 검증

```bash
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

브라우저 테스트는 같은 Express 서버에 독립적인 학생 세션 둘과 교사 세션 하나를 연결합니다. `TOWN_SCREENSHOT_DIR`를 지정하면 검증 화면을 저장합니다. 상세 결과는 [개발 및 검증 현황](MULTIPLAYER_STATUS.md)에 있습니다.

## Render 배포

- Render 대시보드 **New → Blueprint**에서 [massei100/holt_town](https://github.com/massei100/holt_town)의 **multiplayer** 브랜치를 선택합니다. 이 브랜치의 `render.yaml`은 Free Node Web Service 하나를 정의합니다.
- 수동 Web Service 생성 시에도 같은 브랜치를 선택합니다. **Build Command**는 `npm ci --include=dev && npm test && npm run build`, **Start Command**는 `npm start`, **Health Check Path**는 `/healthz`입니다. 웹 화면과 Socket.IO는 한 서비스와 한 URL에서 제공됩니다.
- 학급용 공개 서비스에서는 Render 환경 변수 `TEACHER_PIN`에 교사만 아는 값을 설정할 수 있습니다. 이 값이 설정되어 있으면 교사가 방을 만들 때 입력해야 합니다. 학생은 교사가 만든 방 코드를 사용합니다. 교사 제어 권한은 방마다 발급된 별도 세션 토큰으로 확인합니다.
- 완료 후 Render가 제공한 URL에서 `/healthz`를 열어 `{"ok":true}`를 확인하고, 학생 탭 둘을 연결해 배송을 시험합니다. [Render Web Service 안내](https://render.com/docs/web-services)

한 방의 학생 상한은 15명입니다. 일시 단절 시 60초 안에 같은 브라우저 탭에서 학생 세션을 복구할 수 있습니다. 게임방, 별명, 진행 상태를 서버 메모리에만 저장하며 채팅, 회원가입, 데이터베이스가 없습니다. Render Free는 유휴 상태에서 서비스를 중지할 수 있으며, 서비스가 재시작되면 열린 방을 다시 만들어야 합니다. [Render Free 운영 조건](https://render.com/docs/free)

## 문서

- [기존 버전 분석과 설계](MULTIPLAYER_PLAN.md)
- [구현 범위와 남은 검증](MULTIPLAYER_STATUS.md)
- [에셋 라이선스](ASSET_LICENSES.md)

