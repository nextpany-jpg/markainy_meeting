# 배포 체크리스트

Cloudtype 배포 전 확인 사항입니다.

## 배포 전 체크리스트

### 1. 코드 준비
- [ ] 모든 기능이 로컬에서 정상 동작하는지 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `credentials.json`, `token.json`이 `.gitignore`에 포함되어 있는지 확인
- [ ] `package.json`에 모든 dependencies가 포함되어 있는지 확인
- [ ] `server.js`에서 `process.env.PORT`를 사용하는지 확인

### 2. GitHub 준비
- [ ] GitHub 계정 생성 완료
- [ ] 새 저장소 생성 완료
- [ ] Git 설치 완료 (git --version으로 확인)

### 3. Google OAuth 설정
- [ ] Google Cloud Console 프로젝트 생성
- [ ] Gmail API 활성화
- [ ] Google Calendar API 활성화
- [ ] OAuth 2.0 클라이언트 ID 생성
- [ ] 클라이언트 ID와 시크릿 복사 완료

### 4. Cloudtype 준비
- [ ] Cloudtype 계정 생성 (https://cloudtype.io)
- [ ] GitHub 계정 연동 완료

## 배포 단계별 체크리스트

### Step 1: GitHub 업로드
```bash
# 1. Git 초기화
cd C:\MCG_GIST_공공영업\해커톤\customer-research-system
git init

# 2. 파일 추가
git add .

# 3. 커밋
git commit -m "Initial commit: 마크AI니 도슨트 시스템"

# 4. GitHub 저장소 연결 (YOUR_USERNAME과 YOUR_REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 5. 푸시
git branch -M main
git push -u origin main
```

- [ ] Git 초기화 완료
- [ ] GitHub 저장소 연결 완료
- [ ] 코드 푸시 완료
- [ ] GitHub에서 코드 확인 완료

### Step 2: Cloudtype 배포
1. [ ] Cloudtype 로그인
2. [ ] 새 프로젝트 생성
3. [ ] GitHub 저장소 선택
4. [ ] 빌드 설정:
   - 시작 명령어: `node server.js`
   - 포트: `3000`
5. [ ] 환경 변수 설정:
   ```
   GOOGLE_CLIENT_ID=복사한_클라이언트_ID
   GOOGLE_CLIENT_SECRET=복사한_시크릿
   GOOGLE_REDIRECT_URI=https://your-app.cloudtype.app/auth/callback
   PORT=3000
   ```
6. [ ] 배포 시작
7. [ ] 배포 완료 확인
8. [ ] 제공된 URL 복사

### Step 3: Google OAuth 업데이트
1. [ ] Google Cloud Console 접속
2. [ ] OAuth 2.0 클라이언트 ID 선택
3. [ ] "승인된 리디렉션 URI"에 Cloudtype URL 추가:
   ```
   https://your-app.cloudtype.app/auth/callback
   ```
4. [ ] 저장

### Step 4: 테스트
- [ ] 배포된 URL 접속 확인
- [ ] Gmail 로그인 테스트
- [ ] 미팅 정보 입력 테스트
- [ ] 뉴스 조회 테스트
- [ ] 이메일 검색 테스트
- [ ] 연락처 조회 테스트
- [ ] 맛집 검색 테스트
- [ ] 회의록 녹음 테스트

## 문제 발생 시

### Git 오류
```bash
# Git이 설치되지 않은 경우
# https://git-scm.com/download/win 에서 다운로드

# Git 사용자 정보 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 배포 실패
1. Cloudtype 로그 확인
2. 환경 변수 다시 확인
3. `package.json` 확인
4. Node.js 버전 확인

### Gmail 인증 실패
1. Google Cloud Console에서 리디렉션 URI 확인
2. Cloudtype 환경 변수 확인
3. 브라우저 캐시 삭제 후 재시도

## 배포 완료 후

- [ ] 배포된 URL을 팀원들과 공유
- [ ] 사용 가이드 문서 작성
- [ ] 정기적인 모니터링 계획 수립

## 유용한 명령어

```bash
# Git 상태 확인
git status

# 변경사항 확인
git diff

# 커밋 히스토리 확인
git log

# 원격 저장소 확인
git remote -v

# 최신 코드 가져오기
git pull origin main

# 변경사항 푸시
git add .
git commit -m "업데이트 내용"
git push origin main
```

---

모든 체크리스트를 완료하면 배포 성공! 🎉
