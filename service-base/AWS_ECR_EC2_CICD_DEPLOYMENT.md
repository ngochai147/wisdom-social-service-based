# Deploy service-base len AWS bang ECR + EC2 + GitHub Actions

Tai lieu nay mo ta luong deploy toi uu cho `service-base` voi muc tieu:

- Chay on dinh trong khoang 1 tuan voi ngan sach 120 USD.
- Dung AWS ECR de quan ly Docker image chuyen nghiep.
- Dung GitHub Actions de build/push/deploy CI/CD.
- Dung 1 EC2 duy nhat chay Docker Compose de tiet kiem chi phi.
- Chi public API Gateway, cac service noi bo va Redis khong public Internet.

Kien truc de xuat:

```text
GitHub
  |
  | push/merge main
  v
GitHub Actions
  |
  | build Docker image tung service
  v
Amazon ECR
  |
  | docker compose pull
  v
EC2 Ubuntu
  |
  | gateway-service public :8080 hoac :443
  | media-service internal :8081
  | user-chat-service internal :8082
  | content-service internal :8083
  | notification-service internal :8084
  | ai-service internal :8085
  | redis internal :6379
  v
TiDB Cloud / MongoDB Atlas / S3 / Cognito / OpenRouter
```

## 1. Chon AWS service de giu chi phi duoi 120 USD

Khuyen nghi cho giai doan demo/van hanh 1 tuan:

| Thanh phan | Nen dung | Ly do |
|---|---|---|
| Compute | 1 EC2 Ubuntu `t3.large`, `t3a.large`, hoac Lightsail 8GB RAM | Du RAM cho 6 JVM + Redis, chi phi 1 tuan nam trong ngan sach neu khong dung them dich vu dat tien |
| Container registry | ECR private repositories | Quan ly image, rollback bang tag, san sang chuyen ECS sau nay |
| Database SQL | Giu TiDB Cloud hien co | Khong can tra tien RDS |
| MongoDB | Giu MongoDB Atlas hien co | Khong can tu van hanh Mongo tren EC2 |
| Redis | Chay container Redis trong Docker Compose | Re nhat cho demo; khong can ElastiCache |
| Object storage | S3 bucket hien co | Phu hop voi `media-service` |
| Load balancer | Chua can ALB | 1 EC2 + gateway la du; ALB tang chi phi |
| NAT Gateway | Khong dung | NAT Gateway co the lam tang chi phi nhanh |
| Domain/HTTPS | Tuy chon: Cloudflare hoac Nginx + Let's Encrypt | Neu demo noi bo, IP:8080 la du |

Nguyen tac chi phi:

- Khong tao RDS, ElastiCache, ALB, NAT Gateway neu chua can.
- Tao AWS Budget alert moc 60, 90, 110 USD.
- Sau 1 tuan, stop hoac terminate EC2 va xoa image/log khong can.
- Theo doi S3 egress va OpenRouter/API AI usage vi co the khong nam trong AWS credit.

## 2. Tao file docker-compose.prod.yml

`service-base/docker-compose.yml` hien dang build image truc tiep tu source:

```yaml
build:
  context: .
  dockerfile: Dockerfile
  args:
    SERVICE_DIR: content-service
```

Khi dung ECR, production khong nen build tren EC2 nua. EC2 chi nen:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Do do nen tao them file:

```text
service-base/docker-compose.prod.yml
```

Trong repo nay da tao san file [docker-compose.prod.yml](docker-compose.prod.yml). Khi copy len EC2, ban dat file nay tai:

```text
/opt/wisdom-social/service-base/docker-compose.prod.yml
```

Noi dung day du de copy:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: sb-redis
    command: ["redis-server", "--requirepass", "${SPRING_DATA_REDIS_PASSWORD}"]
    networks: [sb-net]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${SPRING_DATA_REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  media-service:
    image: ${ECR_REGISTRY}/wisdom-social-media-service:${IMAGE_TAG:-latest}
    container_name: sb-media
    env_file: [.env]
    environment:
      SERVER_PORT: 8081
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy

  user-chat-service:
    image: ${ECR_REGISTRY}/wisdom-social-user-chat-service:${IMAGE_TAG:-latest}
    container_name: sb-user-chat
    env_file: [.env]
    environment:
      SERVER_PORT: 8082
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      MEDIA_SERVICE_BASE_URL: http://media-service:8081
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
      media-service:
        condition: service_started

  content-service:
    image: ${ECR_REGISTRY}/wisdom-social-content-service:${IMAGE_TAG:-latest}
    container_name: sb-content
    env_file: [.env]
    environment:
      SERVER_PORT: 8083
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      MEDIA_SERVICE_BASE_URL: http://media-service:8081
      USER_SERVICE_BASE_URL: http://user-chat-service:8082
      NOTIFICATION_SERVICE_BASE_URL: http://notification-service:8084
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
      media-service:
        condition: service_started
      user-chat-service:
        condition: service_started
      notification-service:
        condition: service_started

  notification-service:
    image: ${ECR_REGISTRY}/wisdom-social-notification-service:${IMAGE_TAG:-latest}
    container_name: sb-notification
    env_file: [.env]
    environment:
      SERVER_PORT: 8084
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy

  ai-service:
    image: ${ECR_REGISTRY}/wisdom-social-ai-service:${IMAGE_TAG:-latest}
    container_name: sb-ai
    env_file: [.env]
    environment:
      SERVER_PORT: 8085
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy

  gateway-service:
    image: ${ECR_REGISTRY}/wisdom-social-gateway-service:${IMAGE_TAG:-latest}
    container_name: sb-gateway
    env_file: [.env]
    environment:
      SERVER_PORT: 8080
      USER_CHAT_URI: http://user-chat-service:8082
      CONTENT_URI: http://content-service:8083
      NOTIFICATION_URI: http://notification-service:8084
      AI_URI: http://ai-service:8085
      MEDIA_URI: http://media-service:8081
    ports:
      - "8080:8080"
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      - media-service
      - user-chat-service
      - content-service
      - notification-service
      - ai-service

networks:
  sb-net:
    driver: bridge
```

File production nay khac file compose local o cac diem:

- Dung `image:` tu ECR thay vi `build:`.
- Chi expose `gateway-service` port `8080`.
- Khong expose `redis`, `media-service`, `user-chat-service`, `content-service`, `notification-service`, `ai-service` ra Internet.
- Khong chay `frontend-web` bang `npm run dev` trong production.
- Them `restart: unless-stopped` de container tu khoi dong lai khi EC2 reboot.

Sau khi copy file len EC2, lenh chay se la:

```bash
cd /opt/wisdom-social/service-base
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Ngoai ra, `.env` hien dang chua secret that. Truoc khi deploy nghiem tuc:

- Khong commit `.env`.
- Rotate cac key da tung nam trong local/repo neu repo co nguy co bi public.
- De runtime secret tren EC2 trong `service-base/.env`, hoac dung SSM Parameter Store/Secrets Manager neu muon chuyen nghiep hon.

## 3. Tao ECR repositories tren AWS

Nen tao 1 ECR repository rieng cho moi service. Cach nay ro rang hon 1 repo nhieu tag.

Danh sach repositories:

```text
wisdom-social-gateway-service
wisdom-social-media-service
wisdom-social-user-chat-service
wisdom-social-content-service
wisdom-social-notification-service
wisdom-social-ai-service
```

### 3.1. Lay AWS Account ID va chon region

Chon region thong nhat cho backend, khuyen nghi:

```text
ap-southeast-1
```

Ly do: `.env` hien dang dung `AWS_REGION=ap-southeast-1`, S3/Cognito cung dang o region nay.

Lay Account ID:

1. Dang nhap AWS Console.
2. Bam vao ten account o goc tren ben phai.
3. Copy `Account ID`, vi du:

```text
123456789012
```

Gia tri ECR registry se co dang:

```text
123456789012.dkr.ecr.ap-southeast-1.amazonaws.com
```

Sau nay dien vao `.env` tren EC2:

```env
ECR_REGISTRY=123456789012.dkr.ecr.ap-southeast-1.amazonaws.com
IMAGE_TAG=latest
```

### 3.2. Tao ECR bang AWS Console

Lam lap lai cac buoc sau cho 6 repository:

1. Vao AWS Console.
2. O thanh search, go `ECR`.
3. Chon `Elastic Container Registry`.
4. O goc tren phai, chon region `ap-southeast-1`.
5. Vao `Repositories`.
6. Bam `Create repository`.
7. Chon `Private`.
8. Repository name nhap repository dau tien:

```text
wisdom-social-gateway-service
```

9. `Tag immutability`: co the de `Mutable` cho giai doan dau vi ta push tag `latest`. Neu muon nghiem hon, sau nay doi sang immutable va deploy bang Git SHA.
10. `Image scan settings`: bat `Basic scanning` neu AWS Console hien tuy chon nay.
11. `Encryption`: de mac dinh `AES-256`.
12. Bam `Create repository`.
13. Lap lai voi 5 ten con lai:

```text
wisdom-social-media-service
wisdom-social-user-chat-service
wisdom-social-content-service
wisdom-social-notification-service
wisdom-social-ai-service
```

Sau khi tao xong, danh sach ECR repositories phai co du:

```text
wisdom-social-gateway-service
wisdom-social-media-service
wisdom-social-user-chat-service
wisdom-social-content-service
wisdom-social-notification-service
wisdom-social-ai-service
```

### 3.3. Them lifecycle policy de tranh ton dung luong ECR

Lam voi tung repository:

1. Vao ECR repository.
2. Chon tab `Lifecycle Policy`.
3. Bam `Edit lifecycle policy` hoac `Create lifecycle policy`.
4. Them rule giu lai khoang 10 image gan nhat.

Policy mau:

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep only last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

Voi demo 1 tuan, rule nay giup tranh viec moi lan push tao them image va de lau gay ton dung luong.

### 3.4. Tao ECR bang AWS CLI neu muon nhanh hon

Co the tao bang AWS CLI:

```bash
aws ecr create-repository --repository-name wisdom-social-gateway-service --region ap-southeast-1
aws ecr create-repository --repository-name wisdom-social-media-service --region ap-southeast-1
aws ecr create-repository --repository-name wisdom-social-user-chat-service --region ap-southeast-1
aws ecr create-repository --repository-name wisdom-social-content-service --region ap-southeast-1
aws ecr create-repository --repository-name wisdom-social-notification-service --region ap-southeast-1
aws ecr create-repository --repository-name wisdom-social-ai-service --region ap-southeast-1
```

## 4. Tao IAM User cho GitHub Actions push ECR

Voi muc tieu deploy nhanh, de hieu va chay 1 tuan, chi can tao **IAM User** cho GitHub Actions va gan policy mac dinh cua AWS:

```text
AmazonEC2ContainerRegistryPowerUser
```

Policy nay du de GitHub Actions login ECR, build image va push image len ECR. Khong gan `AdministratorAccess`.

### 4.1. Tao IAM User

1. Vao AWS Console.
2. Search `IAM`.
3. Vao `IAM`.
4. Menu ben trai chon `Users`.
5. Bam `Create user`.
6. User name dat:

```text
wisdom-social-github-actions-user
```

7. Khong tick `Provide user access to the AWS Management Console`.
8. Bam `Next`.
9. O man hinh `Set permissions`, chon:

```text
Attach policies directly
```

10. O thanh search policy, nhap:

```text
AmazonEC2ContainerRegistryPowerUser
```

11. Tick policy `AmazonEC2ContainerRegistryPowerUser`.
12. Bam `Next`.
13. Kiem tra lai thong tin.
14. Bam `Create user`.

### 4.2. Tao access key cho IAM User

1. Vao user:

```text
wisdom-social-github-actions-user
```

2. Chon tab `Security credentials`.
3. Keo xuong phan `Access keys`.
4. Bam `Create access key`.
5. Use case chon `Command Line Interface (CLI)`.
6. Tick xac nhan ban hieu day la access key dung ngoai AWS.
7. Bam `Next`.
8. Description tag co the dien:

```text
github-actions-ecr-push
```

9. Bam `Create access key`.
10. Copy lai 2 gia tri:

```text
Access key ID
Secret access key
```

Quan trong: `Secret access key` chi hien 1 lan. Neu mat thi phai tao key moi.

### 4.3. Them GitHub Secrets

Vao GitHub repository:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Them 4 secret:

```text
AWS_ACCESS_KEY_ID=<Access key ID vua tao>
AWS_SECRET_ACCESS_KEY=<Secret access key vua tao>
AWS_REGION=ap-southeast-1
AWS_ACCOUNT_ID=<AWS_ACCOUNT_ID>
```

Vi du:

```text
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-1
AWS_ACCOUNT_ID=123456789012
```

### 4.4. Bao mat IAM User

Nen lam:

- Chi gan `AmazonEC2ContainerRegistryPowerUser`, khong gan `AdministratorAccess`.
- Khong commit access key vao repo.
- Neu nghi key bi lo, vao IAM User -> `Security credentials` -> deactivate/delete access key va tao key moi.
- Sau khi ket thuc demo 1 tuan, nen xoa access key hoac xoa IAM User nay.

Voi luong deploy trong tai lieu nay, den day la xong phan GitHub Actions: chi can IAM User nay de push image len ECR.

## 5. Tao IAM role cho EC2 pull ECR

EC2 can IAM Role rieng de pull image tu ECR. Cach nhanh nhat la tao role cho EC2 va gan policy mac dinh:

```text
AmazonEC2ContainerRegistryReadOnly
```

Policy nay du de EC2 login ECR va pull image. Khong can tao custom policy neu ban muon lam nhanh.

### 5.1. Tao IAM Role cho EC2

1. Trong `IAM`, menu ben trai chon `Roles`.
2. Bam `Create role`.
3. Trusted entity type chon `AWS service`.
4. Use case chon `EC2`.
5. Bam `Next`.
6. O man hinh `Add permissions`, search:

```text
AmazonEC2ContainerRegistryReadOnly
```

7. Tick policy `AmazonEC2ContainerRegistryReadOnly`.
8. Bam `Next`.
9. Role name dat:

```text
WisdomSocialEC2ECRPullRole
```

10. Bam `Create role`.

### 5.2. Gan IAM Role vao EC2 khi tao instance

Khi tao EC2:

1. Vao `EC2`.
2. Bam `Launch instance`.
3. Den phan `Advanced details`.
4. O `IAM instance profile`, chon:

```text
WisdomSocialEC2ECRPullRole
```

5. Tao EC2 nhu binh thuong.

### 5.3. Gan IAM Role vao EC2 da tao san

Neu EC2 da tao roi:

1. Vao `EC2`.
2. Chon instance dang chay backend.
3. Bam `Actions`.
4. Chon `Security`.
5. Chon `Modify IAM role`.
6. IAM role chon:

```text
WisdomSocialEC2ECRPullRole
```

7. Bam `Update IAM role`.

Sau do SSH vao EC2 va test:

```bash
aws sts get-caller-identity
```

Neu ra role `WisdomSocialEC2ECRPullRole` la dung.

Login ECR:

```bash
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com
```

Neu login thanh cong, EC2 da co quyen pull image tu ECR.

## 6. Tao EC2

Khuyen nghi:

```text
AMI: Ubuntu Server 22.04 LTS hoac 24.04 LTS
Instance type: t3.large hoac t3a.large
Disk: 30-60GB gp3 la du cho 1 tuan; 80GB neu muon du build/cache/log
Region: ap-southeast-1 neu cac service AWS dang o do
```

Security Group:

| Port | Source | Muc dich |
|---|---|---|
| 22 | IP cua ban | SSH |
| 8080 | 0.0.0.0/0 hoac IP demo | Gateway HTTP |
| 80 | Tuy chon | Neu dung Nginx/Let's Encrypt |
| 443 | Tuy chon | Neu dung HTTPS |

Khong mo cac port nay ra Internet:

```text
6379 Redis
8081 media-service
8082 user-chat-service
8083 content-service
8084 notification-service
8085 ai-service
```

## 7. Cai Docker va AWS CLI tren EC2

SSH vao EC2:

```bash
ssh -i <key.pem> ubuntu@<EC2_PUBLIC_IP>
```

Cai Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg unzip
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Dang xuat SSH va dang nhap lai de group `docker` co hieu luc.

Cai AWS CLI:

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

Login ECR tren EC2:

```bash
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com
```

Lenh nay se dung IAM role cua EC2 neu da gan role dung.

## 8. Tao thu muc deploy tren EC2

Tren EC2:

```bash
sudo mkdir -p /opt/wisdom-social/service-base
sudo chown -R ubuntu:ubuntu /opt/wisdom-social
cd /opt/wisdom-social/service-base
```

EC2 khong can full source code neu da dung ECR. Chi can:

```text
docker-compose.prod.yml
.env
```

## 9. Mau docker-compose.prod.yml

Tao file tren local trong repo:

```text
service-base/docker-compose.prod.yml
```

Noi dung mau:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: sb-redis
    command: ["redis-server", "--requirepass", "${SPRING_DATA_REDIS_PASSWORD}"]
    networks: [sb-net]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${SPRING_DATA_REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  media-service:
    image: ${ECR_REGISTRY}/wisdom-social-media-service:${IMAGE_TAG:-latest}
    container_name: sb-media
    env_file: [.env]
    environment:
      SERVER_PORT: 8081
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy

  user-chat-service:
    image: ${ECR_REGISTRY}/wisdom-social-user-chat-service:${IMAGE_TAG:-latest}
    container_name: sb-user-chat
    env_file: [.env]
    environment:
      SERVER_PORT: 8082
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      MEDIA_SERVICE_BASE_URL: http://media-service:8081
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
      media-service:
        condition: service_started

  content-service:
    image: ${ECR_REGISTRY}/wisdom-social-content-service:${IMAGE_TAG:-latest}
    container_name: sb-content
    env_file: [.env]
    environment:
      SERVER_PORT: 8083
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      MEDIA_SERVICE_BASE_URL: http://media-service:8081
      USER_SERVICE_BASE_URL: http://user-chat-service:8082
      NOTIFICATION_SERVICE_BASE_URL: http://notification-service:8084
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
      media-service:
        condition: service_started
      user-chat-service:
        condition: service_started
      notification-service:
        condition: service_started

  notification-service:
    image: ${ECR_REGISTRY}/wisdom-social-notification-service:${IMAGE_TAG:-latest}
    container_name: sb-notification
    env_file: [.env]
    environment:
      SERVER_PORT: 8084
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy

  ai-service:
    image: ${ECR_REGISTRY}/wisdom-social-ai-service:${IMAGE_TAG:-latest}
    container_name: sb-ai
    env_file: [.env]
    environment:
      SERVER_PORT: 8085
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy

  gateway-service:
    image: ${ECR_REGISTRY}/wisdom-social-gateway-service:${IMAGE_TAG:-latest}
    container_name: sb-gateway
    env_file: [.env]
    environment:
      SERVER_PORT: 8080
      USER_CHAT_URI: http://user-chat-service:8082
      CONTENT_URI: http://content-service:8083
      NOTIFICATION_URI: http://notification-service:8084
      AI_URI: http://ai-service:8085
      MEDIA_URI: http://media-service:8081
    ports:
      - "8080:8080"
    networks: [sb-net]
    restart: unless-stopped
    depends_on:
      - media-service
      - user-chat-service
      - content-service
      - notification-service
      - ai-service

networks:
  sb-net:
    driver: bridge
```

Luu y:

- Chi `gateway-service` co `ports`.
- Cac service con lai chi noi chuyen qua Docker network `sb-net`.
- `frontend-web` khong nen chay `npm run dev` trong production compose. Nen deploy frontend len Vercel/S3/CloudFront rieng, hoac build static rieng.

## 10. Mau file .env tren EC2

Tren EC2 tao:

```text
/opt/wisdom-social/service-base/.env
```

Mau:

```env
ECR_REGISTRY=<AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com
IMAGE_TAG=latest

SPRING_DATASOURCE_URL=jdbc:mariadb://<tidb-host>:4000/wisdomsocial?sslMode=TRUST
SPRING_DATASOURCE_USERNAME=<tidb-username>
SPRING_DATASOURCE_PASSWORD=<tidb-password>

SPRING_DATA_MONGODB_URI=mongodb+srv://<mongo-user>:<mongo-password>@<cluster>/<db>

SPRING_DATA_REDIS_HOST=redis
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=<strong-redis-password>
REDIS_PASSWORD=<strong-redis-password>

AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_S3_BUCKET_NAME=<bucket-name>
APP_CDN_DOMAIN=https://<bucket-or-cdn-domain>/

JWT_SECRET_KEY=<jwt-secret>

AWS_COGNITO_USER_POOL_ID=<user-pool-id>
AWS_COGNITO_CLIENT_ID=<client-id>

AI_PROVIDER_BASE_URL=https://openrouter.ai/api/v1
AI_PROVIDER_API_KEY=<openrouter-api-key>

APP_WEB_URL=https://<frontend-domain>
```

Neu `media-service` van yeu cau `AWS_ACCESS_KEY` va `AWS_SECRET_KEY`, co 2 cach:

1. Nhanh cho demo: de access key trong `.env` tren EC2.
2. Tot hon: sua code dung Default Credentials Provider cua AWS SDK va gan IAM role cho EC2 co quyen S3 bucket. Khi do khong can static AWS key trong `.env`.

## 11. GitHub Actions CI/CD workflow

```text
.github/workflows/deploy-service-base.yml
```

File workflow da duoc tao san trong repo. Workflow nay tuan theo dung huong service-based:

```text
Sửa service nào -> build/push/deploy service đó
Sửa lib chung hoặc Dockerfile -> build/push/deploy toàn bộ service
```

Lan dau deploy, vao GitHub Actions chay thu cong `Deploy service-base` bang `workflow_dispatch` va chon:

```text
service = all
```

Sau lan dau, moi lan push len `main`, workflow tu detect file thay doi:

```text
service-base/content-service/**       -> deploy content-service
service-base/user-chat-service/**     -> deploy user-chat-service
service-base/media-service/**         -> deploy media-service
service-base/notification-service/**  -> deploy notification-service
service-base/ai-service/**            -> deploy ai-service
service-base/gateway-service/**       -> deploy gateway-service
```

Neu thay doi cac thu dung chung:

```text
service-base/common-lib/**
service-base/common-core/**
service-base/persistence-lib/**
service-base/Dockerfile
service-base/docker-compose.prod.yml
```

thi workflow build/push/deploy toan bo 6 service.

Can GitHub Secrets:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_ACCOUNT_ID
EC2_HOST
EC2_USER
EC2_SSH_PRIVATE_KEY
```

`EC2_SSH_PRIVATE_KEY` la toan bo noi dung file `.pem`, bao gom ca dong:

```text
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

Workflow deploy bang lenh tuong duong:

```bash
IMAGE_TAG=<git_sha> docker compose -f docker-compose.prod.yml pull <service>
IMAGE_TAG=<git_sha> docker compose -f docker-compose.prod.yml up -d --no-deps <service>
```

Voi deploy all, workflow bo `--no-deps` de Docker Compose khoi dong dung thu tu cac service phu thuoc.

## 12. Toi uu build theo service bi thay doi

Quy tac rebuild trong repo nay:

| Thay doi file | Can rebuild |
|---|---|
| `gateway-service/**` | `gateway-service` |
| `media-service/**` | `media-service` |
| `user-chat-service/**` | `user-chat-service` |
| `content-service/**` | `content-service` |
| `notification-service/**` | `notification-service` |
| `ai-service/**` | `ai-service` |
| `common-lib/**` | Tat ca service Java phu thuoc |
| `common-core/**` | User/content/notification/ai va cac service phu thuoc |
| `persistence-lib/**` | User/content/notification/ai va cac service dung repository/entity |
| `Dockerfile` | Tat ca service |

Trong giai doan dau, build ca 6 service moi lan la chap nhan duoc. Khi can nhanh hon, them job detect changed paths roi build matrix dong.

## 13. Deploy lan dau len EC2

Copy file compose prod len EC2:

```bash
scp -i <key.pem> service-base/docker-compose.prod.yml ubuntu@<EC2_PUBLIC_IP>:/opt/wisdom-social/service-base/docker-compose.prod.yml
```

Tao `.env` tren EC2:

```bash
ssh -i <key.pem> ubuntu@<EC2_PUBLIC_IP>
cd /opt/wisdom-social/service-base
nano .env
```

Login ECR va pull image:

```bash
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Kiem tra gateway:

```bash
curl http://localhost:8080/actuator/health
curl http://<EC2_PUBLIC_IP>:8080/actuator/health
```

Xem log:

```bash
docker compose -f docker-compose.prod.yml logs -f gateway-service
docker compose -f docker-compose.prod.yml logs -f content-service
```

## 14. Cau hinh frontend production

Neu frontend deploy tren Vercel, file production nen tro ve gateway:

```env
VITE_API_BASE_URL=http://<EC2_PUBLIC_IP>:8080/api
VITE_SOCKJS_URL=http://<EC2_PUBLIC_IP>:8080/ws
```

Neu co domain/HTTPS:

```env
VITE_API_BASE_URL=https://api.<domain>/api
VITE_SOCKJS_URL=https://api.<domain>/ws
```

`APP_WEB_URL` trong backend `.env` phai trung domain frontend:

```env
APP_WEB_URL=https://<frontend-domain>
```

## 15. HTTPS tuy chon bang Nginx

Neu muon dung domain va HTTPS, cai Nginx tren EC2:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Nginx reverse proxy den gateway:

```nginx
server {
    server_name api.<domain>;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Cap certificate:

```bash
sudo certbot --nginx -d api.<domain>
```

Neu dung Nginx, security group co the mo `80/443` va dong public `8080`.

## 16. Rollback

Vi moi image co tag theo Git SHA, rollback bang cach chay lai tag cu.

Vi du rollback ve commit:

```bash
cd /opt/wisdom-social/service-base
IMAGE_TAG=<old_git_sha> docker compose -f docker-compose.prod.yml pull
IMAGE_TAG=<old_git_sha> docker compose -f docker-compose.prod.yml up -d
```

Neu chi rollback 1 service:

```bash
IMAGE_TAG=<old_git_sha> docker compose -f docker-compose.prod.yml pull content-service
IMAGE_TAG=<old_git_sha> docker compose -f docker-compose.prod.yml up -d content-service
```

## 17. Lenh van hanh hang ngay

Xem container:

```bash
docker compose -f docker-compose.prod.yml ps
```

Xem log:

```bash
docker compose -f docker-compose.prod.yml logs -f gateway-service
docker compose -f docker-compose.prod.yml logs -f user-chat-service
```

Restart 1 service:

```bash
docker compose -f docker-compose.prod.yml restart content-service
```

Update 1 service:

```bash
IMAGE_TAG=<git_sha> docker compose -f docker-compose.prod.yml pull content-service
IMAGE_TAG=<git_sha> docker compose -f docker-compose.prod.yml up -d content-service
```

Don image cu:

```bash
docker image prune -f
```

Khong dung `docker system prune -a` tuy tien tren production vi co the xoa image rollback.

## 18. Monitoring va canh bao co ban

Trong 1 tuan demo, toi thieu nen co:

AWS:

- Billing Budget alert: 60, 90, 110 USD.
- CloudWatch metric EC2 CPU.
- EC2 disk usage check thu cong moi ngay.

Tren EC2:

```bash
df -h
free -h
docker stats
docker compose -f docker-compose.prod.yml ps
```

Neu RAM thieu:

- Tang EC2 len 16GB RAM tam thoi.
- Giam `JAVA_OPTS` moi service.
- Tat service khong can demo.

## 19. Checklist truoc khi public

- [ ] Da rotate AWS key, Mongo key, DB password neu tung bi lo.
- [ ] `.env` khong commit len GitHub.
- [ ] EC2 security group chi mo `22` cho IP cua ban.
- [ ] Chi expose gateway `8080`, hoac `80/443` neu dung Nginx.
- [ ] Redis khong public.
- [ ] `SPRING_DATA_REDIS_PASSWORD` co gia tri manh.
- [ ] Frontend production tro ve gateway dung domain/IP.
- [ ] `APP_WEB_URL` dung frontend domain.
- [ ] GitHub Secrets da co `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ACCOUNT_ID`.
- [ ] GitHub Actions push image vao ECR thanh cong.
- [ ] EC2 pull image bang IAM role, khong dung AWS access key static.
- [ ] `curl /actuator/health` thanh cong.
- [ ] Tao AWS Budget alert.

## 20. Luong deploy cuoi cung nen dung

Lan dau:

```text
1. Tao ECR repositories.
2. Tao IAM User cho GitHub Actions push ECR.
3. Tao EC2 + gan IAM role pull ECR.
4. Cai Docker + AWS CLI tren EC2.
5. Tao /opt/wisdom-social/service-base.
6. Dat docker-compose.prod.yml va .env tren EC2.
7. Chay GitHub Actions build/push image.
8. Tren EC2 docker compose pull + up -d.
9. Cap nhat frontend production URL.
10. Kiem tra gateway va log.
```

Moi lan deploy sau:

```text
1. Push code len main.
2. GitHub Actions build image va push ECR.
3. GitHub Actions SSH vao EC2.
4. EC2 pull image moi.
5. Docker Compose recreate service.
6. Health check.
```

Day la huong can bang nhat cho du an hien tai: du chuyen nghiep de co CI/CD, ECR va rollback, nhung van giu chi phi thap bang cach chay tat ca backend tren 1 EC2 trong thoi gian ngan.
