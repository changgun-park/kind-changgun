# KIND-CHANGGUN

20250612(목)
pnpm project init
openai, dotenv 설치
git init
readme 추가
간단한 질문-답변 봇 생성

20250613(금)
multiple docs를 읽을 수 있도록 업데이트
텍스트 임베딩 로직 추가

20250614(토)
ecr
ecs
task def: ssm 연결 해야함.. 잘안되네? 일단 env로 등록
Update Slack URL After Deployment: deploy할때마다 업데이트 해줘야함

slack integration

20250615(일)
VectorDB 적용: PostgreSQL

20250616(월)
google api로 문서 받아오기

20250617(화)
google drive 불러오기: python langchain을 이용한 마이크로 서비스
권한 설정 때문에 애먹음...

## MEMO

- chunking
- ec2 요금은? openai 요금은?

## IMPROVEMENT

1. ~~속도가 너무 느림: slack에서 답변받는 속도가 굉장히 느림~~
2. 일반적인 질문(LLM에 하듯이)에 대답할 수 있도록 하기
3. 참고하는 문서가 너무 적음
4. ~~벡터 임베딩 관리가 부실함: DB로 이관해야 함~~
5. 질문 => 대답못하면 피드백 => 문서로 들어가는 사이클 만들기
6. chunking: document에 따라서 다른 전략을 취해야 함..
7. keyword + sementic query search (hybrid)
