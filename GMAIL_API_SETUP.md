# Gmail API 설정 가이드

Gmail API를 사용하기 위한 단계별 설정 방법입니다.

## 1. Google Cloud Console 접속

https://console.cloud.google.com 접속

## 2. 프로젝트 생성

1. 상단의 프로젝트 선택 드롭다운 클릭
2. "새 프로젝트" 클릭
3. 프로젝트 이름 입력 (예: "고객사-사전파악-시스템")
4. "만들기" 클릭

## 3. Gmail API 활성화

1. 왼쪽 메뉴에서 "API 및 서비스" > "라이브러리" 클릭
2. 검색창에 "Gmail API" 입력
3. "Gmail API" 클릭
4. "사용" 버튼 클릭

## 4. OAuth 동의 화면 구성

1. 왼쪽 메뉴에서 "API 및 서비스" > "OAuth 동의 화면" 클릭
2. 사용자 유형 선택:
   - **외부**: 누구나 사용 가능 (테스트 모드에서는 최대 100명)
   - **내부**: Google Workspace 조직 내부만 사용 가능
3. "만들기" 클릭
4. 앱 정보 입력:
   - **앱 이름**: 고객사 사전파악 시스템
   - **사용자 지원 이메일**: 본인 Gmail 주소
   - **개발자 연락처 정보**: 본인 Gmail 주소
5. "저장 후 계속" 클릭
6. 범위 추가:
   - "범위 추가 또는 삭제" 클릭
   - 검색창에 "gmail" 입력
   - `https://www.googleapis.com/auth/gmail.readonly` 선택
   - "업데이트" 클릭
   - "저장 후 계속" 클릭
7. 테스트 사용자 추가 (외부 선택 시):
   - "테스트 사용자 추가" 클릭
   - 본인 Gmail 주소 입력
   - "추가" 클릭
   - "저장 후 계속" 클릭

## 5. OAuth 2.0 클라이언트 ID 생성

1. 왼쪽 메뉴에서 "API 및 서비스" > "사용자 인증 정보" 클릭
2. 상단의 "+ 사용자 인증 정보 만들기" 클릭
3. "OAuth 클라이언트 ID" 선택
4. 애플리케이션 유형: "웹 애플리케이션" 선택
5. 이름 입력 (예: "고객사 시스템 웹 클라이언트")
6. 승인된 자바스크립트 원본:
   ```
   http://localhost:3000
   ```
7. 승인된 리디렉션 URI:
   ```
   http://localhost:3000/oauth2callback
   ```
8. "만들기" 클릭
9. 생성된 클라이언트 ID와 클라이언트 보안 비밀번호 복사

## 6. 환경 변수 설정

프로젝트 폴더의 `.env` 파일에 다음 내용 입력:

```env
PORT=3000
GOOGLE_CLIENT_ID=여기에_클라이언트_ID_붙여넣기
GOOGLE_CLIENT_SECRET=여기에_클라이언트_보안_비밀번호_붙여넣기
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

## 7. 서버 실행

```bash
npm install
npm start
```

## 8. 브라우저에서 테스트

1. http://localhost:3000 접속
2. "Gmail 로그인" 버튼 클릭
3. Google 계정 선택
4. 권한 승인 (Gmail 읽기 권한)
5. 리디렉션 후 고객사 검색 가능

## 주의사항

### 테스트 모드 제한
- OAuth 동의 화면이 "테스트" 상태일 때는 추가한 테스트 사용자만 로그인 가능
- 최대 100명까지 테스트 사용자 추가 가능

### 프로덕션 배포 시
1. OAuth 동의 화면을 "프로덕션" 상태로 변경 필요
2. Google의 검토 과정 필요 (1-2주 소요)
3. 개인정보 처리방침 URL 필요
4. 서비스 약관 URL 필요

### 보안
- `.env` 파일은 절대 Git에 커밋하지 말 것
- `.gitignore`에 `.env` 포함 확인
- 클라이언트 보안 비밀번호는 안전하게 보관

## 문제 해결

### "앱이 확인되지 않음" 경고
- 테스트 모드에서는 정상적인 경고
- "고급" > "안전하지 않은 페이지로 이동" 클릭하여 진행 가능
- 본인 계정이므로 안전함

### "redirect_uri_mismatch" 오류
- Google Cloud Console의 승인된 리디렉션 URI 확인
- `.env` 파일의 GOOGLE_REDIRECT_URI 확인
- 정확히 일치해야 함 (http vs https, 포트 번호 등)

### "invalid_client" 오류
- 클라이언트 ID와 보안 비밀번호 재확인
- 공백이나 줄바꿈 없이 정확히 복사했는지 확인

## 참고 링크

- Google Cloud Console: https://console.cloud.google.com
- Gmail API 문서: https://developers.google.com/gmail/api
- OAuth 2.0 가이드: https://developers.google.com/identity/protocols/oauth2
