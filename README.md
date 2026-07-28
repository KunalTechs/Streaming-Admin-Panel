# 📹 Video Streaming Admin Panel - Microservices Architecture

An event-driven, high-performance, enterprise-grade **Video Streaming Admin Panel & Backend Platform** built with **Node.js, Express, Apache Kafka (KRaft), Elasticsearch, Redis, MySQL, MongoDB, AWS S3**, and **FFmpeg HLS Transcoding**.

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🔄 API Flow & Event-Driven Workflows](#-api-flow--event-driven-workflows)
- [🧩 Microservices Breakdown](#-microservices-breakdown)
- [💻 Tech Stack & Dependencies](#-tech-stack--dependencies)
- [⚙️ System Requirements](#️-system-requirements)
- [🔐 Environment Configuration (.env)](#-environment-configuration-env)
- [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
- [📡 API Gateway & Route Matrix](#-api-gateway--route-matrix)
- [📬 Kafka Event Topics & Payload Schemas](#-kafka-event-topics--payload-schemas)
- [🧪 Verification & Testing](#-verification--testing)

---

## ✨ Key Features

- **🌐 Centralized API Gateway**: Reverse proxy with request routing, security headers (`Helmet`), CORS management, and centralized logging (`Morgan`).
- **🛡️ Multi-Tenant Admin Authentication**: Role-Based Access Control (RBAC with `superadmin` and `admin`), JWT authentication, and secure `HttpOnly` refresh token rotation.
- **🎬 Video Management & Presigned S3 Uploads**: Direct-to-S3 secure uploads via AWS S3 Presigned URLs or multipart HTTP upload handling.
- **⚡ Adaptive HLS Video Transcoding**: Asynchronous background video processing worker using `FFmpeg` to transform raw videos into HLS (`.m3u8` playlists and `.ts` media segments) optimized for streaming.
- **🔍 Real-Time Search Engine**: Instant search powered by **Elasticsearch** with real-time indexing driven by Kafka event streams and high-speed Redis caching.
- **🗂️ Category Management System**: Hierarchical content classification with Redis caching (Master, Replica, Sentinel HA setup) and automated slug generation.
- **📨 Event-Driven Communication**: Decoupled, asynchronous inter-service communication using **Apache Kafka** (KRaft mode).
- **🧹 Automated Asset Lifecycle Sync**: Deleting a video automatically triggers background S3 file deletion, terminates active FFmpeg transcoding jobs, and purges Elasticsearch indices.

---

## 🏗️ System Architecture

The project adopts a decoupled **Event-Driven Microservices Architecture**. All external HTTP requests pass through the **API Gateway**, which routes requests to individual domain microservices. Asynchronous operations and cross-service synchronization are handled seamlessly over **Apache Kafka**.

```mermaid
graph TD
    Client[📱 Client / Admin Panel Frontend] -->|HTTP / REST| Gateway[🌐 API Gateway :5000]

    subgraph "Domain Microservices"
        Gateway -->|/api/auth| AuthSvc[🔐 Admin Auth Service :5001]
        Gateway -->|/api/videos| VideoSvc[📹 Video Service :5002]
        Gateway -->|/api/categories| CatSvc[🗂️ Category Service :5003]
        FileSvc[📁 File Service :5004]
        SearchSvc[🔍 Search Service :5005]
        Transcoder[🎬 Transcoder Worker]
    end

    subgraph "Databases & Storage"
        AuthSvc --> Mongo[(🍃 MongoDB)]
        VideoSvc --> MySQL_Video[(🐬 MySQL Video DB)]
        CatSvc --> MySQL_Cat[(🐬 MySQL Category DB)]
        CatSvc --> Redis[(⚡ Redis Cache HA)]
        SearchSvc --> ES[(🔎 Elasticsearch 8.x)]
        FileSvc --> S3[☁️ AWS S3 Bucket]
        Transcoder --> S3
    end

    subgraph "Event Bus (Message Broker)"
        Kafka[[📡 Apache Kafka KRaft]]
    end

    %% Event Streams
    VideoSvc -- "Produces: video-events" --> Kafka
    CatSvc -- "Produces: category-events" --> Kafka
    Transcoder -- "Produces/Consumes: video-events" --> Kafka
    Kafka -- "Consumes: video-events" --> FileSvc
    Kafka -- "Consumes: video & category events" --> SearchSvc
```

---

## 🔄 API Flow & Event-Driven Workflows

### 1. Video Upload & HLS Transcoding Flow
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Gateway as API Gateway
    participant VideoSvc as Video Service
    participant Kafka as Kafka (video-events)
    participant Worker as Transcoder Worker
    participant S3 as AWS S3 / CloudFront
    participant Search as Search Service

    Admin->>Gateway: POST /api/videos/upload (video file + metadata)
    Gateway->>VideoSvc: Proxy Upload Request
    VideoSvc->>S3: Upload raw video file
    VideoSvc->>VideoSvc: Save record in MySQL (Status: PENDING)
    VideoSvc->>Kafka: Publish event: VIDEO_UPLOADED { videoId, fileKey }
    VideoSvc-->>Admin: Return HTTP 201 (Video queued for processing)

    par Asynchronous Processing
        Kafka->>Worker: Consume VIDEO_UPLOADED
        Worker->>S3: Download raw video
        Worker->>Worker: Execute FFmpeg (Transcode to HLS .m3u8 & .ts)
        Worker->>S3: Upload HLS playlists & segments
        Worker->>VideoSvc: Update DB Status to READY & set hlsUrl
        Worker->>Kafka: Publish event: TRANSCODING_COMPLETE
    and Search Index Sync
        Kafka->>Search: Consume VIDEO_UPLOADED
        Search->>Search: Index document in Elasticsearch & invalidate Redis search cache
    end
```

### 2. Video Deletion & Cascade Clean-up Flow
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant VideoSvc as Video Service
    participant Kafka as Kafka (video-events)
    participant Worker as Transcoder Worker
    participant FileSvc as File Service
    participant S3 as AWS S3
    participant Search as Search Service

    Admin->>VideoSvc: DELETE /api/videos/:id
    VideoSvc->>VideoSvc: Delete video from MySQL DB
    VideoSvc->>Kafka: Publish event: VIDEO_DELETED { videoId, fileKey, thumbnailKey }

    par Active Job Termination
        Kafka->>Worker: Consume VIDEO_DELETED
        Worker->>Worker: Kill running FFmpeg process (SIGKILL) if active
    and S3 Storage Cleanup
        Kafka->>FileSvc: Consume VIDEO_DELETED
        FileSvc->>S3: Delete raw file, HLS folder & thumbnails
    and Search Index Removal
        Kafka->>Search: Consume VIDEO_DELETED
        Search->>Search: Delete document from Elasticsearch index & clear search cache
    end
```

---

## 🧩 Microservices Breakdown

| Service Name | Primary Responsibilities | Database / Cache | Communication Protocols |
| :--- | :--- | :--- | :--- |
| **`api-gateway`** | Single entry point, routing, HTTP security (`helmet`), CORS configuration, logging. | N/A | HTTP / REST |
| **`admin-auth-service`** | Admin registration, login, JWT token issue/refresh, RBAC roles (`superadmin`, `admin`). | MongoDB (Mongoose) | HTTP / REST, Kafka Producer |
| **`video-service`** | Video metadata CRUD, status tracking (`PENDING`, `PROCESSING`, `READY`, `FAILED`). | MySQL (Prisma ORM) | HTTP / REST, Kafka Producer |
| **`category-service`** | Managing video categories, auto slug creation, Redis caching. | MySQL (Prisma ORM) + Redis | HTTP / REST, Kafka Producer |
| **`file-service`** | AWS S3 Presigned URL generation for secure uploads & automated S3 deletion worker. | AWS S3 | HTTP / REST, Kafka Consumer |
| **`transcoder-worker`** | Offline background HLS segment transcode worker using `FFmpeg`. | AWS S3 / Temp Disk | Kafka Consumer & Producer |
| **`search-service`** | Full-text video and category search engine with query rate limiting. | Elasticsearch 8.x + Redis | HTTP / REST, Kafka Consumer |

---

## 💻 Tech Stack & Dependencies

- **Runtime Environment**: Node.js (v18+ ESM modules)
- **Framework**: Express.js (v5)
- **Message Broker**: Apache Kafka (KRaft mode via `kafkajs`)
- **Databases**:
  - **MongoDB**: Document database for Admin Auth credentials & sessions.
  - **MySQL**: Relational storage for Videos and Categories (managed via **Prisma ORM**).
  - **Elasticsearch 8.x**: Full-text, high-speed search index engine.
  - **Redis Stack & Sentinel**: High-Availability (HA) cache layer (Master-Replica-Sentinel setup).
- **Object Storage & CDN**: AWS S3 & CloudFront CDN
- **Media Processing**: `fluent-ffmpeg` & `FFmpeg` binary
- **Security & Validation**: JWT (`jsonwebtoken`), `bcrypt`, `helmet`, `cors`, `zod`, `express-rate-limit`

---

## ⚙️ System Requirements

Before running the application, make sure your machine meets the following prerequisites:

1. **Node.js**: `v18.0.0` or higher
2. **Package Manager**: `npm` (v9+) or `yarn`
3. **Docker & Docker Compose**: Docker Engine `v24+` and Docker Compose `v2+`
4. **FFmpeg**: Required on the system PATH if running `transcoder-worker` outside Docker (`ffmpeg -version`).
5. **AWS S3 Credentials**: An AWS S3 bucket configured for public/presigned access and CORS enabled.

---

## 🔐 Environment Configuration (.env)

### 1. Root Directory Environment (`.env`)
Create a `.env` file in the root project directory for `docker-compose.yml`:

```env
# Kafka Configuration
KAFKA_IMAGE=apache/kafka:latest
KAFKA_PORT=9092
KAFKA_CONTROLLER_PORT=9093
KAFKA_NODE_ID=1
KAFKA_NUM_PARTITIONS=3

# MySQL Configuration
MYSQL_IMAGE=mysql:8.0
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE_VIDEO=video_service_db
MYSQL_USER=kunal
MYSQL_PASSWORD=kunal123
MYSQL_VIDEO_EXTERNAL_PORT=3307

MYSQL_DATABASE_CATEGORY=category_db
MYSQL_CATEGORY_EXTERNAL_PORT=3308

# Redis Configuration
REDIS_IMAGE=redis/redis-stack:latest
REDIS_SENTINEL_IMAGE=bitnami/redis-sentinel:latest
REDIS_PORT=6379
REDIS_SENTINEL_PORT=26379

# ElasticSearch Configuration
ELASTICSEARCH_IMAGE=docker.elastic.co/elasticsearch/elasticsearch:8.10.0
ELASTICSEARCH_PORT=9200
```

### 2. Microservice Environment Variables
Each microservice inside `backend/<service-name>` requires its own `.env` file:

#### `backend/api-gateway/.env`
```env
PORT=5000
ADMIN_AUTH_SERVICE=http://localhost:5001
VIDEO_SERVICE=http://localhost:5002
CATEGORY_SERVICE=http://localhost:5003
```

#### `backend/admin-auth-service/.env`
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/admin_auth_db
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
KAFKA_BROKERS=localhost:9092
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=SuperAdminPassword123!
```

#### `backend/video-service/.env`
```env
PORT=5002
DATABASE_URL="mysql://kunal:kunal123@localhost:3307/video_service_db"
JWT_SECRET=your_super_secret_access_key
KAFKA_BROKERS=localhost:9092
```

#### `backend/category-service/.env`
```env
PORT=5003
DATABASE_URL="mysql://kunal:kunal123@localhost:3308/category_db"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_access_key
KAFKA_BROKERS=localhost:9092
```

#### `backend/file-service/.env`
```env
PORT=5004
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your-streaming-bucket-name
JWT_SECRET=your_super_secret_access_key
KAFKA_BROKERS=localhost:9092
```

#### `backend/transcoder-worker/.env`
```env
KAFKA_BROKERS=localhost:9092
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your-streaming-bucket-name
CLOUDFRONT_URL=https://d1111111111111.cloudfront.net
```

#### `backend/search-service/.env`
```env
PORT=5005
ELASTICSEARCH_NODE=http://localhost:9200
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_access_key
KAFKA_BROKERS=localhost:9092
```

---

## 🚀 Quickstart & Setup Guide

### Step 1: Clone Repository & Spin Up Infrastructure Services
Start Apache Kafka, MySQL databases, Redis HA, and Elasticsearch using Docker Compose:

```bash
# Start all containers in detached mode
docker-compose up -d
```

Verify containers are running cleanly:
```bash
docker-compose ps
```

### Step 2: Initialize Database Schemas & Migrations

#### Video Service (MySQL):
```bash
cd backend/video-service
npm install
npx prisma migrate dev --name init
npx prisma generate
```

#### Category Service (MySQL):
```bash
cd backend/category-service
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### Step 3: Seed Initial Superadmin Account
Run the seed script in `admin-auth-service` to generate your first `superadmin` user:

```bash
cd backend/admin-auth-service
npm install
node src/seed.js
```

### Step 4: Start Microservices
Launch each service in separate terminal windows (or using process managers like `pm2` / `concurrently`):

```bash
# Terminal 1: API Gateway
cd backend/api-gateway && npm start

# Terminal 2: Admin Auth Service
cd backend/admin-auth-service && npm start

# Terminal 3: Video Service
cd backend/video-service && npm start

# Terminal 4: Category Service
cd backend/category-service && npm start

# Terminal 5: File Service
cd backend/file-service && npm start

# Terminal 6: Transcoder Worker
cd backend/transcoder-worker && npm start

# Terminal 7: Search Service
cd backend/search-service && npm start
```

---

## 📡 API Gateway & Route Matrix

All HTTP traffic to domain services can be routed through the API Gateway at `http://localhost:5000`.

### 1. Authentication & Admin Routes (`/api/auth`)
| Method | Gateway Endpoint | Target Endpoint | Auth / Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `/login` | Public | Authenticate admin & return JWT access token + refresh cookie |
| `POST` | `/api/auth/refresh-token` | `/refresh-token` | Public (Cookie) | Acquire new Access Token via Refresh Token |
| `POST` | `/api/auth/logout` | `/logout` | Authenticated | Revoke refresh token & clear cookies |
| `GET` | `/api/auth/profile` | `/profile` | Authenticated | Get current logged-in admin profile |
| `POST` | `/api/auth/register` | `/register` | Superadmin | Register a new admin account |
| `GET` | `/api/auth/all-admins` | `/all-admins` | Superadmin | List all registered system administrators |
| `DELETE`| `/api/auth/delete-admin/:id`| `/delete-admin/:id`| Superadmin | Delete an admin account |
| `PATCH` | `/api/auth/update-role/:id` | `/update-role/:id` | Superadmin | Update role (`admin` <-> `superadmin`) |
| `PATCH` | `/api/auth/update-my-password`| `/update-my-password`| Authenticated | Self password reset |

### 2. Video Management Routes (`/api/videos`)
| Method | Gateway Endpoint | Target Endpoint | Auth / Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/videos` | `/` | Authenticated | Fetch videos owned by authenticated admin |
| `POST` | `/api/videos/upload` | `/upload` | Authenticated | Upload new video file & trigger HLS transcoding pipeline |
| `PUT` | `/api/videos/:id` | `/:id` | Authenticated | Update video title, description, or category |
| `DELETE`| `/api/videos/:id` | `/:id` | Superadmin | Delete video & trigger cascade storage/index cleanup |

### 3. Category Routes (`/api/categories`)
| Method | Gateway Endpoint | Target Endpoint | Auth / Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | `/` | Public | Fetch all categories (cached via Redis) |
| `POST` | `/api/categories/create` | `/create` | Admin / Superadmin | Create new category (Emits `CATEGORY_CREATED`) |
| `POST` | `/api/categories/update/:id` | `/update/:id` | Admin / Superadmin | Update category details |
| `POST` | `/api/categories/delete/:id` | `/delete/:id` | Admin / Superadmin | Delete category |

### 4. Direct File Upload & Search Services
| Service | Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- | :--- |
| **File Service** | `http://localhost:5004/generate-presigned-url` | `POST` | Admin | Get AWS S3 presigned PUT URL for client-side direct upload |
| **File Service** | `http://localhost:5004/delete-files` | `DELETE`| Admin | Delete files directly from AWS S3 bucket |
| **Search Service**| `http://localhost:5005/?q=keyword` | `GET` | Authenticated | Search videos & categories via Elasticsearch index |

---

## 📬 Kafka Event Topics & Payload Schemas

The microservices communicate asynchronously across two primary Kafka topics: `video-events` and `category-events`.

### Topic 1: `video-events`

#### Event: `VIDEO_UPLOADED`
Emitted by `video-service` when a video record is created. Consumed by `transcoder-worker` and `search-service`.
```json
{
  "event": "VIDEO_UPLOADED",
  "data": {
    "videoId": "c7b3a1d9-5f2b-4e8a-9a1c-3b5e7f9a2b4c",
    "title": "Introduction to Microservices Architecture",
    "fileKey": "raw-videos/1715000000000-intro.mp4",
    "authorId": "admin-123",
    "categoryId": "cat-456"
  }
}
```

#### Event: `VIDEO_DELETED`
Emitted by `video-service` when a video is removed. Consumed by `transcoder-worker` (kills FFmpeg job), `file-service` (removes S3 files), and `search-service` (removes ES index document).
```json
{
  "event": "VIDEO_DELETED",
  "data": {
    "videoId": "c7b3a1d9-5f2b-4e8a-9a1c-3b5e7f9a2b4c",
    "fileKey": "raw-videos/1715000000000-intro.mp4",
    "thumbnailKey": "thumbnails/1715000000000-intro.jpg"
  }
}
```

#### Event: `TRANSCODING_COMPLETE`
Emitted by `transcoder-worker` when HLS encoding succeeds.
```json
{
  "event": "TRANSCODING_COMPLETE",
  "data": {
    "videoId": "c7b3a1d9-5f2b-4e8a-9a1c-3b5e7f9a2b4c",
    "hlsUrl": "https://d1111111111111.cloudfront.net/hls/c7b3a1d9/master.m3u8",
    "status": "READY"
  }
}
```

---

### Topic 2: `category-events`

#### Event: `CATEGORY_CREATED`
Emitted by `category-service` when a category is added. Consumed by `search-service`.
```json
{
  "event": "CATEGORY_CREATED",
  "data": {
    "id": "cat-456",
    "name": "Technology & Coding",
    "slug": "technology-and-coding",
    "description": "Tutorials and Tech Talks"
  }
}
```

---

## 🧪 Verification & Testing

### 1. Verify Infrastructure Containers
Check that Docker services (Kafka, MySQL, Redis, Elasticsearch) are healthy:
```bash
docker-compose ps
```

### 2. Verify Health of API Gateway & Microservices
```bash
curl http://localhost:5000/
# Expected Response: "API Gateway is live"
```

### 3. Test Full Upload & Transcoding Pipeline
1. **Login as Superadmin**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com", "password":"SuperAdminPassword123!"}'
   ```
2. **Upload a Sample Video**:
   Use Postman or `curl` to upload a video file to `http://localhost:5000/api/videos/upload`.
3. **Monitor Transcoder Logs**:
   Observe `transcoder-worker` logs as FFmpeg converts the file into HLS format and uploads `.m3u8` playlists to AWS S3.
4. **Search Indexed Video**:
   Perform a query against the search service:
   ```bash
   curl -X GET "http://localhost:5005/?q=Introduction" \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
   ```

---
