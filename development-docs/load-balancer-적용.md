# Load balancer 적용

ECS Fargate는 배포 할 때마다 Url이 변경된다. Slack 앱 "창건씨"는 ECS에 이벤트를 전송하고 응답을 받아야 하기 때문에 배포할 때마다 바뀐 엔드포인트를 수정해야한다.
이를 해결하기위해 Application Load Balancer(ALB)를 적용했다.

## Load Balancer 적용 시 요청 플로우

사용자가 URL을 통해 웹사이트에 접근했을 때, Load Balancer가 적용된 경우 다음과 같은 플로우로 응답을 받게 된다.

Internet → Route 53 → Application Load Balancer → ECS Fargate Tasks

#### Route 53 (DNS)

- 일종의 전화번호부 같은 것으로, 도메인 주소를 IP로 변환한다.
- 예시: api.company.com => 52.123.12.34
- 사용자가 기억하기 쉬운 도메인 이름을 실제 서버 IP로 바꿔주는 것이다.

#### Application Load Balancer (ALB)

- ALB는 요청을 받아서 여러 개의 task 중에 하나로 요청을 할당하는 역할을 한다.
- 고정된 IP 주소를 가진다.
- 자동으로 트래픽을 분산하여 부하를 조절한다.

## Loade Balancer => Task로 요청이 포워딩 되는 원리

#### Target Group

ECS 에서 Load Balancer를 사용하기로 설정하면, Target Group을 설정하게 된다. ECS Task가 lauch되면 이 Task의 ip가 자동으로 target group에 할당된다. Load Balancer는 Target Group에 등록된 Task들 중 하나로 요청을 전송하는 것이다.
