# GitHub 웹에서 직접 업로드하기

Git 명령어 없이 GitHub 웹사이트에서 직접 파일을 업로드하는 방법입니다.

## Step 1: GitHub 저장소 생성

1. https://github.com 접속 및 로그인
2. 오른쪽 상단 "+" 버튼 클릭 → "New repository" 선택
3. 저장소 정보 입력:
   - **Repository name**: `meeting-preparation-system` (또는 원하는 이름)
   - **Description**: `마크AI니 도슨트 - 미팅 준비 시스템`
   - **Public** 또는 **Private** 선택
   - ✅ "Add a README file" 체크 (나중에 수정 가능)
4. "Create repository" 클릭

## Step 2: 파일 업로드

### 방법 1: 드래그 앤 드롭 (추천)

1. 생성된 저장소 페이지에서 "uploading an existing file" 링크 클릭
2. 탐색기에서 `customer-research-system` 폴더 열기
3. **업로드할 파일/폴더 선택**:
   
   #### 필수 파일:
   - `server.js`
   - `package.json`
   - `package-lock.json`
   - `.gitignore`
   - `README.md`
   - `public/` 폴더 전체
   
   #### 제외할 파일 (중요!):
   - ❌ `node_modules/` 폴더 (용량 크고 불필요)
   - ❌ `.env` 파일 (보안 정보 포함)
   - ❌ `credentials.json` (Google OAuth 인증 정보)
   - ❌ `token.json` (Google OAuth 토큰)

4. 선택한 파일들을 GitHub 페이지로 **드래그 앤 드롭**
5. 하단에 커밋 메시지 입력: `Initial commit: 마크AI니 도슨트 시스템`
6. "Commit changes" 클릭

### 방법 2: 폴더별 업로드

파일이 많아서 한 번에 업로드가 안 되면 폴더별로 나눠서 업로드:

#### 1차: 루트 파일들
- `server.js`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `README.md`

#### 2차: public 폴더
1. 저장소 메인 페이지에서 "Add file" → "Upload files"
2. `public` 폴더 안의 파일들 선택:
   - `app_new.js`
   - `index_new.html`
   - `styles.css`
3. 업로드 후 커밋

## Step 3: .gitignore 확인

저장소에 `.gitignore` 파일이 제대로 업로드되었는지 확인:

```
node_modules/
.env
*.log
.DS_Store
credentials.json
token.json
```

만약 없다면:
1. 저장소에서 "Add file" → "Create new file"
2. 파일명: `.gitignore`
3. 위 내용 붙여넣기
4. "Commit new file" 클릭

## Step 4: Cloudtype 배포

### 4-1. Cloudtype 접속
1. https://cloudtype.io 접속
2. "GitHub로 시작하기" 클릭
3. GitHub 계정 연동

### 4-2. 프로젝트 생성
1. "새 프로젝트" 클릭
2. "GitHub 저장소에서 가져오기" 선택
3. 방금 만든 저장소 선택
4. 브랜치: `main` 선택

### 4-3. 배포 설정
- **프로젝트 이름**: `meeting-preparation` (원하는 이름)
- **빌드 명령어**: (비워두기)
- **시작 명령어**: `node server.js`
- **포트**: `3000`

### 4-4. 환경 변수 설정
"환경 변수" 탭에서 추가:

```
GOOGLE_CLIENT_ID=여기에_구글_클라이언트_ID
GOOGLE_CLIENT_SECRET=여기에_구글_시크릿
GOOGLE_REDIRECT_URI=https://포트-프로젝트명.cloudtype.app/auth/callback
PORT=3000
```

**중요**: 배포 후 실제 URL을 받으면 `GOOGLE_REDIRECT_URI`를 업데이트해야 합니다!

### 4-5. 배포 시작
1. "배포" 버튼 클릭
2. 빌드 로그 확인
3. 배포 완료 대기 (2-3분 소요)
4. 제공된 URL 복사

## Step 5: Google OAuth 설정 업데이트

1. https://console.cloud.google.com 접속
2. 프로젝트 선택
3. "API 및 서비스" → "사용자 인증 정보"
4. OAuth 2.0 클라이언트 ID 클릭
5. "승인된 리디렉션 URI"에 추가:
   ```
   https://포트-프로젝트명.cloudtype.app/auth/callback
   ```
6. "저장" 클릭

## Step 6: 환경 변수 업데이트

Cloudtype 대시보드로 돌아가서:
1. "환경 변수" 탭
2. `GOOGLE_REDIRECT_URI` 값을 실제 URL로 수정
3. "저장" 후 "재배포" 클릭

## Step 7: 테스트

배포된 URL로 접속하여 테스트:
- [ ] 페이지 로딩 확인
- [ ] Gmail 로그인 테스트
- [ ] 각 기능 동작 확인

## 업로드할 파일 목록 (체크리스트)

### 루트 디렉토리
- [ ] `server.js`
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `.gitignore`
- [ ] `README.md`
- [ ] `.env.example` (선택사항)

### public 폴더
- [ ] `public/app_new.js`
- [ ] `public/index_new.html`
- [ ] `public/styles.css`

### 문서 (선택사항)
- [ ] `CLOUDTYPE_DEPLOY.md`
- [ ] `DEPLOY_CHECKLIST.md`
- [ ] `GMAIL_API_SETUP.md`

## 주의사항

### ⚠️ 절대 업로드하면 안 되는 파일:
- ❌ `node_modules/` - 용량이 크고 자동 설치됨
- ❌ `.env` - 보안 정보 포함
- ❌ `credentials.json` - Google OAuth 인증 정보
- ❌ `token.json` - Google OAuth 토큰
- ❌ `*.log` - 로그 파일

### 💡 팁:
- 파일 업로드 시 한 번에 100개 이하로 제한될 수 있음
- 큰 폴더는 여러 번에 나눠서 업로드
- 업로드 후 저장소에서 파일 구조 확인

## 문제 해결

### 파일이 너무 많아서 업로드 안 됨
→ `node_modules` 폴더를 제외했는지 확인

### .env 파일이 보임
→ `.gitignore`가 제대로 업로드되었는지 확인

### 배포 후 500 에러
→ Cloudtype 로그 확인, 환경 변수 확인

### Gmail 로그인 안 됨
→ Google Cloud Console의 리디렉션 URI 확인

---

이 방법이 Git 명령어보다 훨씬 쉽습니다! 🎉
