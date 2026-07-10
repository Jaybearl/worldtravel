# 세계여행자

세계지도에서 국가를 클릭하면 그 나라(도시)에서 찍은 여행 사진이 나오는 사이트입니다.

- 지도/사진 열람: 누구나 가능 (로그인 불필요)
- 사진 업로드/관리: 관리자 계정으로 로그인해야 가능 (`/admin/login`)

## 1. 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인할 수 있어요. Firebase 설정을 하기 전까지는 지도는 보이지만 사진 목록/업로드는 동작하지 않아요.

## 2. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속 → **프로젝트 추가** → 이름 입력 (예: `world-travel-map`) 후 생성
2. 왼쪽 메뉴에서 **빌드 > Authentication** → **시작하기** → 로그인 방법에서 **이메일/비밀번호** 활성화
3. **Authentication > Users** 탭 → **사용자 추가** → 본인 이메일/비밀번호로 관리자 계정 1개 생성 (이 계정으로 `/admin/login`에 로그인)
4. **빌드 > Firestore Database** → **데이터베이스 만들기** → 프로덕션 모드로 시작 (리전은 가까운 곳, 예: `asia-northeast3`)
5. **빌드 > Storage** → **시작하기** → 프로덕션 모드로 시작
6. 좌측 상단 톱니바퀴 **프로젝트 설정** → 아래로 스크롤 → **내 앱** → 웹 앱 추가(`</>`아이콘) → 앱 닉네임 입력 → Firebase SDK 설정값(`firebaseConfig`) 복사

## 3. 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고, 위에서 복사한 값을 채워주세요.

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

저장 후 `npm run dev`를 다시 실행하세요.

## 4. 보안 규칙 적용

사진 열람은 누구나, 업로드/삭제는 로그인한 사람만 가능하도록 규칙이 `firestore.rules`, `storage.rules`에 준비되어 있어요. Firebase 콘솔에서 각각 붙여넣어 적용하세요.

- **Firestore Database > 규칙** 탭 → `firestore.rules` 내용 붙여넣기 → 게시
- **Storage > 규칙** 탭 → `storage.rules` 내용 붙여넣기 → 게시

(Firebase CLI를 쓴다면 `firebase deploy --only firestore:rules,storage:rules`로도 적용할 수 있어요.)

## 5. 사용법

1. `/admin/login`에서 2번 단계에서 만든 계정으로 로그인
2. `/admin/upload`에서 국가/도시/날짜를 입력하고 사진을 올리면 자동으로 리사이즈되어 업로드됨
3. `/admin/manage`에서 업로드한 사진 목록 확인/삭제
4. 메인 페이지(`/`)에서 사진이 있는 나라는 지도에 파란색으로 표시되고, 클릭하면 도시별로 필터링해서 볼 수 있음

## 6. 배포 (Vercel)

1. https://vercel.com 에서 이 프로젝트를 Import
2. 환경변수 6개(`NEXT_PUBLIC_FIREBASE_*`)를 Vercel 프로젝트 설정 > Environment Variables에 등록
3. Deploy

배포 후 실제 도메인을 Firebase **Authentication > Settings > 승인된 도메인**에도 추가해야 로그인이 정상 동작해요.
