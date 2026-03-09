# Cloudtype 배포 가이드

이 문서는 GitHub를 통해 Cloudtype으로 마크AI니 도슨트 시스템을 배포하는 방법을 설명합니다.

## 사전 준비

### 1. GitHub 계정 및 저장소
- GitHub 계정이 필요합니다 (https://github.com)
- 새 저장소를 생성하거나 기존 저장소를 사용합니다

### 2. Cloudtype 계정
- Cloudtype 계정이 필요합니다 (https://cloudtype.io)
- GitHub 계정으로 로그인 가능합니다

## 배포 단계

### Step 1: GitHub에 코드 업로드

#### 1-1. Git 초기화 (처음 한 번만)
```bash
cd C:\MCG_GIST_공공영업\해커톤\customer-research-system
git init
git add .
git commit -m "Initial commit: 마크AI니 도슨트 시스템"
```

#### 1-2. GitHub 저장소 연결
```bash
# GitHub에서 새 저장소 생성 후 URL 복사
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Cloudtype 배포 설정

#### 2-1. Cloudtype 로그인
1. https://cloudtype.io 접속
2. GitHub 계정으로 로그인

#### 2-2. 새 프로젝트 생성
1. "새 프로젝트" 클릭
2. GitHub 저장소 선택
3. 저장소에서 `customer-research-system` 폴더 선택

#### 2-3. 빌드 설정
- **빌드 명령어**: (비워두기 - 필요 없음)
- **시작 명령어**: `node server.js`
- **포트**: `3000`
- **Node.js 버전**: `18.x` 이상

#### 2-4. 환경 변수 설정
Cloudtype 대시보드에서 다음 환경 변수를 추가하세요:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app.cloudtype.app/auth/callback
PORT=3000
```

**중요**: `GOOGLE_REDIRECT_URI`는 Cloudtype에서 제공하는 실제 도메인으로 변경해야 합니다!

### Step 3: Google OAuth 설정 업데이트

#### 3-1. Google Cloud Console 설정
1. https://console.cloud.google.com 접속
2. 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보"
4. OAuth 2.0 클라이언트 ID 선택
5. "승인된 리디렉션 URI"에 추가:
   ```
   https://your-app.cloudtype.app/auth/callback
   ```

### Step 4: 배포 실행

1. Cloudtype 대시보드에서 "배포" 버튼 클릭
2. 빌드 및 배포 진행 상황 확인
3. 배포 완료 후 제공된 URL로 접속

## 배포 후 확인 사항

### 1. 서비스 동작 확인
- [ ] 웹사이트 접속 가능
- [ ] Gmail 로그인 동작
- [ ] 이메일 검색 기능
- [ ] 연락처 조회 기능
- [ ] 뉴스 검색 기능
- [ ] 맛집 검색 기능
- [ ] 회의록 녹음 기능

### 2. 로그 확인
Cloudtype 대시보드에서 애플리케이션 로그를 확인하여 오류가 없는지 체크하세요.

## 업데이트 방법

코드를 수정한 후 GitHub에 푸시하면 자동으로 재배포됩니다:

```bash
git add .
git commit -m "업데이트 내용 설명"
git push origin main
```

Cloudtype이 자동으로 변경사항을 감지하고 재배포합니다.

## 주의 사항

### 보안
- `.env` 파일은 절대 GitHub에 업로드하지 마세요 (`.gitignore`에 포함됨)
- 모든 민감한 정보는 Cloudtype 환경 변수로 설정하세요
- `credentials.json`, `token.json`도 GitHub에 업로드하지 마세요

### 비용
- Cloudtype 무료 플랜 제한 확인
- 트래픽이 많을 경우 유료 플랜 고려

### 도메인
- Cloudtype 기본 도메인: `your-app.cloudtype.app`
- 커스텀 도메인 연결 가능 (유료 플랜)

## 문제 해결

### 배포 실패 시
1. Cloudtype 로그 확인
2. `package.json`의 dependencies 확인
3. Node.js 버전 확인
4. 환경 변수 설정 확인

### Gmail 인증 실패 시
1. Google Cloud Console에서 리디렉션 URI 확인
2. Cloudtype 환경 변수의 `GOOGLE_REDIRECT_URI` 확인
3. 클라이언트 ID와 시크릿 확인

### 포트 오류 시
- Cloudtype은 자동으로 포트를 할당합니다
- `server.js`에서 `process.env.PORT`를 사용하는지 확인

## 참고 링크

- Cloudtype 문서: https://docs.cloudtype.io
- GitHub 가이드: https://docs.github.com
- Google OAuth 설정: https://console.cloud.google.com

## 지원

문제가 발생하면 다음을 확인하세요:
1. Cloudtype 대시보드의 로그
2. GitHub Actions (있는 경우)
3. Google Cloud Console의 API 사용량

---

배포 성공을 기원합니다! 🚀
