# KIND-CHANGGUN

## 개요

- 아래 블로그 글로 갈음함

https://velog.io/@pcg0527/%EC%95%84%EC%A7%81-%EA%B0%88%EA%B8%B8%EC%9D%B4-%EB%A8%BC-%EC%82%AC%EB%82%B4-%EC%B1%97%EB%B4%87-%EA%B0%9C%EB%B0%9C%EA%B8%B0

## 아키텍쳐

```
Google Drive → Python 스크립트 → PostgreSQL → Express API → Slack
     ↓              ↓              ↓           ↓         ↓
   문서 수집       청킹 + 임베딩    벡터 저장       질의응답    사용자
```

1.Express Server

- 메인 서버 역할
- 슬랙 이벤트에 대한 API 응답
- ECS Fargate 인스턴스 위에 떠 있음
- 로드 밸런싱 적용됨

2. AWS RDS PostgreSQL

- 벡터 DB
- 문서 청크가 로드되어 있음

3. 파이썬 스크립트 몇개

- 구글 드라이브에서 문서를 DB로 로드하는 역할
- 현재 수동으로 스크립트 실행함. 추후 스케줄링 하는 방식으로 변경 예정
