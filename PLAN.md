# 내 장부 — 개발 플랜

> 목표: MVP 완성 → 쓰레드 커뮤니티 피드백 수집
> 원칙: 결제/유료화 없음. 쉬운 UX 최우선. 사이드이펙트 항시 점검.

---

## 현재 상태

### ✅ 완성된 것

| 기능 | 파일 | 상태 |
|------|------|------|
| 거래 입력 폼 | `TransactionForm.tsx` | 완료 (템플릿, 반복, 카테고리 자동추천) |
| 거래 내역 목록 | `TransactionList.tsx` | 완료 (수정/삭제/복제/CSV) |
| 요약 차트 | `Summary.tsx` | 완료 |
| 세무 체크리스트 | `Checklist.tsx` | 완료 (D-day 배지, Supabase 저장) |
| 온보딩 3단계 | `Onboarding.tsx` | 완료 |
| **Supabase 클라우드 저장** | `lib/db.ts` | 완료 (모든 CRUD 비동기) |
| **이메일 매직링크 인증** | `components/Login.tsx` | 완료 |
| **localStorage → Supabase 마이그레이션** | `lib/db.ts` | 완료 (첫 로그인 1회 자동) |
| 모바일 하단 탭바 | `App.tsx` | 완료 |
| 데스크톱 사이드바 | `App.tsx` | 완료 |
| 반복 거래 자동 생성 | `App.tsx` | 완료 (applyDueRecurring) |

---

## 남은 작업 (우선순위 순)

### 🔴 배포

- [ ] **Vercel 배포 설정**
  - `vercel.json` 생성 (SPA rewrites — 새로고침 시 404 방지)
  - GitHub 연결 → push 시 자동 배포
  - ```json
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
    ```
  - Supabase Dashboard → Authentication → URL Configuration에 프로덕션 URL 추가

### 🟠 피드백 버튼 추가

- [ ] **피드백 버튼 UI 추가** (`src/App.tsx`)
  - 데스크톱 사이드바 하단에 "피드백 보내기" 링크 버튼
  - 모바일에서는 Summary 하단에 배치
  - 구글 폼 URL 상수로 관리
  - ```tsx
    const FEEDBACK_URL = 'https://forms.gle/YOUR_FORM_ID';
    ```

### 🟡 애널리틱스 (선택)

- [ ] **Vercel Web Analytics 부착**
  - `npm install @vercel/analytics`
  - `src/main.tsx`에 `<Analytics />` 추가

---

## 아이디어 메모 (론칭 후 피드백 반영 후보)

> 지금 구현하지 않음. 유저 반응 보고 결정.

### UX 개선 후보
- [ ] 거래 입력 후 연속 입력 모드 (탭 이동 없이 계속 입력)
- [ ] 월별 지출 경고 (지난달 대비 N% 증가 시 알림)

### 콘텐츠 후보 (쓰레드 반응에 따라)
- 공략 타겟: 배달대행, 스마트스토어, 1인 카페 사장
- 카피 후보:
  - "회계 1도 모르는 1인 창업자를 위해 무지성으로 적어도 되는 장부 앱을 만들었습니다."
  - "세무사한테 넘기기 전까지 방치 안 하게 도와주는 앱"
  - "엑셀 장부 대신 30초면 입력 끝"

### 기능 확장 후보 (v2)
- 영수증 사진 → OCR 금액 추출
- 세무사 연결 마켓플레이스 (수익화 모델)

---

## 기술 스택

```
React 19 + TypeScript + Vite 8
스타일: 순수 CSS
데이터: Supabase (PostgreSQL + RLS)
인증: 이메일 매직링크
배포: Vercel
애널리틱스: Vercel Web Analytics (예정)
```
