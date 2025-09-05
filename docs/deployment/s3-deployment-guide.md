# S3 배포 가이드

**프로젝트**: 복권 긁기 게임  
**담당자**: 김도현 (프론트엔드)  
**문서 버전**: v1.0  
**작성일**: 2025-09-05

---

## 📋 목차

1. [배포 개요](#배포-개요)
2. [S3 버킷 설정](#s3-버킷-설정)
3. [번들링 프로세스](#번들링-프로세스)
4. [배포 스크립트](#배포-스크립트)
5. [환경별 배포](#환경별-배포)
6. [CloudFront CDN](#cloudfront-cdn)
7. [모니터링 및 분석](#모니터링-및-분석)
8. [트러블슈팅](#트러블슈팅)
9. [성능 최적화](#성능-최적화)

---

## 배포 개요

### 🎯 배포 전략
- **정적 파일 호스팅**: AWS S3를 통한 정적 웹사이트 호스팅
- **단일 HTML 번들**: 모든 리소스(CSS, JS, 이미지)를 하나의 HTML 파일로 통합
- **이벤트별 파일**: 각 이벤트마다 별도의 HTML 파일 생성
- **CDN 활용**: CloudFront를 통한 전 세계 캐싱 및 가속화

### 🏗️ 배포 구조

```
S3 Bucket Structure:
marketing-events-prod/
├── events/
│   ├── scratch/
│   │   ├── event_20250905_newyear.html        # 신년 이벤트
│   │   ├── event_20250915_chuseok.html        # 추석 이벤트
│   │   └── event_20251001_anniversary.html    # 기념일 이벤트
│   └── archive/                               # 종료된 이벤트
├── assets/ (옵션)
│   ├── shared-images/                         # 공통 이미지
│   └── fallback/                              # 폴백 리소스
└── monitoring/
    ├── health-check.html                      # 헬스체크 페이지
    └── analytics.js                           # 추가 분석 스크립트
```

### 📱 앱 연동 패턴

```javascript
// 앱에서 이벤트 페이지 호출
const eventUrl = `https://events.sikdae.com/events/scratch/event_${eventId}.html`;
webView.loadUrl(eventUrl);
```

---

## S3 버킷 설정

### 🗃️ 버킷 생성 및 기본 설정

#### 1. S3 버킷 생성

```bash
# AWS CLI를 통한 버킷 생성
aws s3 mb s3://marketing-events-prod --region ap-northeast-2

# 또는 콘솔에서 생성:
# 버킷명: marketing-events-prod
# 리전: ap-northeast-2 (서울)
```

#### 2. 정적 웹사이트 호스팅 활성화

```bash
# 정적 웹사이트 호스팅 설정
aws s3 website s3://marketing-events-prod \
  --index-document index.html \
  --error-document error.html
```

**웹 콘솔 설정:**
1. S3 → 버킷 → 속성 → 정적 웹 사이트 호스팅
2. **활성화** 선택
3. 인덱스 문서: `index.html`
4. 오류 문서: `error.html`

#### 3. 버킷 정책 설정

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::marketing-events-prod/*",
      "Condition": {
        "StringEquals": {
          "aws:Referer": [
            "https://sikdae.com/*",
            "https://app.sikdae.com/*"
          ]
        }
      }
    }
  ]
}
```

#### 4. CORS 설정

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://sikdae.com",
      "https://app.sikdae.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## 번들링 프로세스

### 📦 빌드 스크립트

#### build.js - 메인 빌드 스크립트

```javascript
// scripts/build.js
const fs = require('fs');
const path = require('path');
const minify = require('html-minifier');

class EventBundler {
  constructor() {
    this.srcDir = path.join(__dirname, '..', 'src');
    this.distDir = path.join(__dirname, '..', 'dist');
    this.assetsDir = path.join(this.srcDir, 'assets');
  }

  async build(eventId) {
    console.log(`Building event: ${eventId}`);
    
    // 디렉터리 생성
    await this.ensureDirectories();
    
    // HTML 템플릿 로드
    const template = await this.loadTemplate();
    
    // 리소스 인라인화
    const bundledHtml = await this.inlineResources(template, eventId);
    
    // HTML 압축
    const minifiedHtml = this.minifyHtml(bundledHtml);
    
    // 파일 저장
    const outputPath = path.join(this.distDir, `event_${eventId}.html`);
    fs.writeFileSync(outputPath, minifiedHtml);
    
    console.log(`✅ Bundle created: ${outputPath}`);
    console.log(`📏 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    
    return outputPath;
  }

  async loadTemplate() {
    const templatePath = path.join(this.srcDir, 'index.html');
    return fs.readFileSync(templatePath, 'utf8');
  }

  async inlineResources(html, eventId) {
    let result = html;
    
    // CSS 인라인화
    result = await this.inlineCSS(result);
    
    // JavaScript 인라인화
    result = await this.inlineJS(result, eventId);
    
    // 이미지 Base64 인코딩
    result = await this.inlineImages(result);
    
    return result;
  }

  async inlineCSS(html) {
    // CSS 파일들을 찾아서 인라인으로 교체
    const cssRegex = /<link\s+[^>]*href\s*=\s*["']([^"']+\.css)["'][^>]*>/gi;
    
    let result = html;
    let match;
    
    while ((match = cssRegex.exec(html)) !== null) {
      const cssPath = path.join(this.srcDir, match[1]);
      
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        const minifiedCSS = this.minifyCSS(cssContent);
        
        result = result.replace(match[0], `<style>${minifiedCSS}</style>`);
        console.log(`📄 Inlined CSS: ${match[1]}`);
      }
    }
    
    return result;
  }

  async inlineJS(html, eventId) {
    // JavaScript 파일들을 찾아서 인라인으로 교체
    const jsRegex = /<script\s+[^>]*src\s*=\s*["']([^"']+\.js)["'][^>]*><\/script>/gi;
    
    let result = html;
    let match;
    
    while ((match = jsRegex.exec(html)) !== null) {
      const jsPath = path.join(this.srcDir, match[1]);
      
      if (fs.existsSync(jsPath)) {
        let jsContent = fs.readFileSync(jsPath, 'utf8');
        
        // eventId 치환
        jsContent = jsContent.replace(/{{EVENT_ID}}/g, eventId);
        
        const minifiedJS = this.minifyJS(jsContent);
        
        result = result.replace(match[0], `<script>${minifiedJS}</script>`);
        console.log(`📜 Inlined JS: ${match[1]}`);
      }
    }
    
    return result;
  }

  async inlineImages(html) {
    // 이미지 src를 Base64로 변환
    const imgRegex = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    
    let result = html;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      const imagePath = path.join(this.srcDir, match[1]);
      
      if (fs.existsSync(imagePath) && this.isImageFile(imagePath)) {
        const imageData = fs.readFileSync(imagePath);
        const ext = path.extname(imagePath).slice(1);
        const mimeType = this.getMimeType(ext);
        const base64 = imageData.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        result = result.replace(match[1], dataUrl);
        console.log(`🖼️  Inlined image: ${match[1]}`);
      }
    }
    
    return result;
  }

  minifyHtml(html) {
    return minify.minify(html, {
      removeComments: true,
      removeEmptyAttributes: true,
      removeEmptyElements: false,
      removeOptionalTags: false,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeTagWhitespace: true,
      collapseWhitespace: true,
      conservativeCollapse: true,
      preserveLineBreaks: false,
      minifyCSS: true,
      minifyJS: true
    });
  }

  minifyCSS(css) {
    // 간단한 CSS 압축
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // 주석 제거
      .replace(/\s+/g, ' ')             // 연속 공백 제거
      .replace(/;\s*}/g, '}')           // 마지막 세미콜론 제거
      .replace(/{\s+/g, '{')            // { 후 공백 제거
      .replace(/\s+{/g, '{')            // { 앞 공백 제거
      .replace(/}\s+/g, '}')            // } 후 공백 제거
      .trim();
  }

  minifyJS(js) {
    // 간단한 JS 압축 (실제로는 UglifyJS 등 사용 권장)
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '')  // 블록 주석 제거
      .replace(/\/\/.*$/gm, '')          // 라인 주석 제거
      .replace(/\s+/g, ' ')              // 연속 공백 제거
      .replace(/;\s*}/g, '}')            // } 앞 세미콜론 정리
      .trim();
  }

  isImageFile(filePath) {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExts.includes(ext);
  }

  getMimeType(ext) {
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp'
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  async ensureDirectories() {
    if (!fs.existsSync(this.distDir)) {
      fs.mkdirSync(this.distDir, { recursive: true });
    }
  }
}

// CLI 실행
if (require.main === module) {
  const eventId = process.argv[2];
  if (!eventId) {
    console.error('Usage: node build.js <eventId>');
    process.exit(1);
  }
  
  const bundler = new EventBundler();
  bundler.build(eventId).catch(console.error);
}

module.exports = EventBundler;
```

#### package.json 스크립트

```json
{
  "name": "scratch-game",
  "version": "1.0.0",
  "scripts": {
    "build": "node scripts/build.js",
    "build:dev": "node scripts/build.js dev_test",
    "deploy": "node scripts/deploy.js",
    "deploy:staging": "npm run build && node scripts/deploy.js staging",
    "deploy:prod": "npm run build && node scripts/deploy.js production"
  },
  "devDependencies": {
    "html-minifier": "^4.0.0",
    "aws-sdk": "^2.1000.0"
  }
}
```

---

## 배포 스크립트

### 🚀 자동 배포 스크립트

#### deploy.js - S3 배포 자동화

```javascript
// scripts/deploy.js
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

class S3Deployer {
  constructor(environment = 'production') {
    this.environment = environment;
    this.config = this.loadConfig(environment);
    
    // AWS 설정
    AWS.config.update({
      region: this.config.region,
      credentials: new AWS.SharedIniFileCredentials({ profile: this.config.profile })
    });
    
    this.s3 = new AWS.S3();
  }

  loadConfig(env) {
    const configs = {
      development: {
        bucket: 'marketing-events-dev',
        region: 'ap-northeast-2',
        profile: 'dev',
        cloudfront: null
      },
      staging: {
        bucket: 'marketing-events-staging',
        region: 'ap-northeast-2',
        profile: 'staging',
        cloudfront: 'E1234567890ABC'
      },
      production: {
        bucket: 'marketing-events-prod',
        region: 'ap-northeast-2',
        profile: 'prod',
        cloudfront: 'E0987654321DEF'
      }
    };
    
    return configs[env] || configs.production;
  }

  async deploy(eventId) {
    console.log(`🚀 Deploying to ${this.environment}...`);
    
    const filePath = path.join(__dirname, '..', 'dist', `event_${eventId}.html`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bundle file not found: ${filePath}`);
    }
    
    // S3에 업로드
    await this.uploadToS3(filePath, eventId);
    
    // CloudFront 캐시 무효화 (프로덕션만)
    if (this.config.cloudfront) {
      await this.invalidateCloudFront(eventId);
    }
    
    // 배포 완료 URL 출력
    const url = this.getEventUrl(eventId);
    console.log(`✅ Deployment complete!`);
    console.log(`🌐 URL: ${url}`);
    
    return url;
  }

  async uploadToS3(filePath, eventId) {
    const fileContent = fs.readFileSync(filePath);
    const key = `events/scratch/event_${eventId}.html`;
    
    const uploadParams = {
      Bucket: this.config.bucket,
      Key: key,
      Body: fileContent,
      ContentType: 'text/html',
      CacheControl: 'public, max-age=300', // 5분 캐시
      Metadata: {
        'event-id': eventId,
        'deploy-time': new Date().toISOString(),
        'environment': this.environment
      }
    };

    console.log(`📤 Uploading ${key}...`);
    
    try {
      const result = await this.s3.upload(uploadParams).promise();
      console.log(`✅ Upload successful: ${result.Location}`);
      
      // 파일 크기 정보
      const stats = fs.statSync(filePath);
      console.log(`📏 File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  async invalidateCloudFront(eventId) {
    const cloudfront = new AWS.CloudFront();
    const paths = [`/events/scratch/event_${eventId}.html`];
    
    const invalidationParams = {
      DistributionId: this.config.cloudfront,
      InvalidationBatch: {
        CallerReference: `invalidate-${eventId}-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths
        }
      }
    };

    console.log('🔄 Invalidating CloudFront cache...');
    
    try {
      const result = await cloudfront.createInvalidation(invalidationParams).promise();
      console.log(`✅ Invalidation created: ${result.Invalidation.Id}`);
    } catch (error) {
      console.warn('⚠️  CloudFront invalidation failed:', error);
      // 캐시 무효화 실패는 치명적이지 않음
    }
  }

  getEventUrl(eventId) {
    const bucketUrl = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
    return `${bucketUrl}/events/scratch/event_${eventId}.html`;
  }

  // 배포된 파일 목록 조회
  async listDeployedEvents() {
    const listParams = {
      Bucket: this.config.bucket,
      Prefix: 'events/scratch/',
      MaxKeys: 100
    };

    try {
      const result = await this.s3.listObjectsV2(listParams).promise();
      
      console.log('📋 Deployed Events:');
      result.Contents.forEach(object => {
        const eventId = object.Key.match(/event_(.+)\.html$/)?.[1];
        const size = (object.Size / 1024).toFixed(2);
        const modified = object.LastModified.toISOString().slice(0, 19);
        
        console.log(`  • ${eventId} (${size} KB, ${modified})`);
      });
      
      return result.Contents;
    } catch (error) {
      console.error('❌ Failed to list events:', error);
      throw error;
    }
  }

  // 이벤트 삭제 (아카이브)
  async archiveEvent(eventId) {
    const sourceKey = `events/scratch/event_${eventId}.html`;
    const archiveKey = `events/archive/event_${eventId}_${Date.now()}.html`;
    
    try {
      // 아카이브로 복사
      await this.s3.copyObject({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${sourceKey}`,
        Key: archiveKey
      }).promise();
      
      // 원본 삭제
      await this.s3.deleteObject({
        Bucket: this.config.bucket,
        Key: sourceKey
      }).promise();
      
      console.log(`✅ Event archived: ${eventId}`);
      
    } catch (error) {
      console.error('❌ Archive failed:', error);
      throw error;
    }
  }
}

// CLI 실행
if (require.main === module) {
  const command = process.argv[2];
  const eventId = process.argv[3];
  const environment = process.argv[4] || 'production';

  const deployer = new S3Deployer(environment);

  switch (command) {
    case 'deploy':
      if (!eventId) {
        console.error('Usage: node deploy.js deploy <eventId> [environment]');
        process.exit(1);
      }
      deployer.deploy(eventId).catch(console.error);
      break;
      
    case 'list':
      deployer.listDeployedEvents().catch(console.error);
      break;
      
    case 'archive':
      if (!eventId) {
        console.error('Usage: node deploy.js archive <eventId> [environment]');
        process.exit(1);
      }
      deployer.archiveEvent(eventId).catch(console.error);
      break;
      
    default:
      console.log('Commands: deploy, list, archive');
      break;
  }
}

module.exports = S3Deployer;
```

---

## 환경별 배포

### 🔧 환경 설정

#### AWS Credentials 설정

```bash
# AWS CLI 설정
aws configure set profile.dev.aws_access_key_id AKIA...
aws configure set profile.dev.aws_secret_access_key xxx...
aws configure set profile.dev.region ap-northeast-2

aws configure set profile.staging.aws_access_key_id AKIA...
aws configure set profile.staging.aws_secret_access_key xxx...
aws configure set profile.staging.region ap-northeast-2

aws configure set profile.prod.aws_access_key_id AKIA...
aws configure set profile.prod.aws_secret_access_key xxx...
aws configure set profile.prod.region ap-northeast-2
```

#### 환경별 배포 명령

```bash
# 개발 환경
npm run build:dev
node scripts/deploy.js deploy dev_test development

# 스테이징 환경  
npm run build newyear_2025
node scripts/deploy.js deploy newyear_2025 staging

# 프로덕션 환경
npm run build newyear_2025
node scripts/deploy.js deploy newyear_2025 production
```

### 🔄 배포 파이프라인

#### GitHub Actions 워크플로우

```yaml
# .github/workflows/deploy.yml
name: Deploy Scratch Game

on:
  push:
    branches: [ main ]
    paths: [ 'src/**' ]
  
  workflow_dispatch:
    inputs:
      event_id:
        description: 'Event ID to deploy'
        required: true
      environment:
        description: 'Deploy environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build event
      run: npm run build ${{ github.event.inputs.event_id }}
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ap-northeast-2
    
    - name: Deploy to S3
      run: node scripts/deploy.js deploy ${{ github.event.inputs.event_id }} ${{ github.event.inputs.environment }}
    
    - name: Post deployment info
      run: |
        echo "🚀 Deployment completed!"
        echo "Event ID: ${{ github.event.inputs.event_id }}"
        echo "Environment: ${{ github.event.inputs.environment }}"
```

---

## CloudFront CDN

### 🌐 CloudFront 설정

#### 배포 생성

```bash
# AWS CLI로 CloudFront 배포 생성
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

#### cloudfront-config.json

```json
{
  "CallerReference": "scratch-game-2025",
  "Comment": "Marketing Event Scratch Game CDN",
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-marketing-events-prod",
        "DomainName": "marketing-events-prod.s3.ap-northeast-2.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-marketing-events-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 300,
    "DefaultTTL": 3600,
    "MaxTTL": 86400,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "Compress": true
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [
      {
        "PathPattern": "events/*",
        "TargetOriginId": "S3-marketing-events-prod",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 300,
        "DefaultTTL": 1800,
        "MaxTTL": 3600,
        "ForwardedValues": {
          "QueryString": true,
          "Cookies": {
            "Forward": "none"
          }
        }
      }
    ]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
```

### 📊 캐시 최적화

#### 캐시 헤더 설정

```javascript
// S3 업로드 시 캐시 헤더 설정
const uploadParams = {
  Bucket: bucket,
  Key: key,
  Body: fileContent,
  ContentType: 'text/html',
  CacheControl: this.getCacheControl(key),
  Expires: this.getExpirationDate(key)
};

getCacheControl(key) {
  if (key.includes('events/')) {
    // 이벤트 파일: 짧은 캐시 (업데이트 가능성)
    return 'public, max-age=300, s-maxage=1800'; // 5분/30분
  } else if (key.includes('assets/')) {
    // 정적 에셋: 긴 캐시
    return 'public, max-age=31536000, immutable'; // 1년
  } else {
    // 기본값
    return 'public, max-age=3600'; // 1시간
  }
}
```

---

## 모니터링 및 분석

### 📊 CloudWatch 메트릭스

#### 주요 모니터링 지표

```javascript
// 커스텀 메트릭스 전송
const cloudwatch = new AWS.CloudWatch();

class DeploymentMetrics {
  static async recordDeployment(eventId, environment, fileSize) {
    const params = {
      Namespace: 'MarketingEvents/Deployment',
      MetricData: [
        {
          MetricName: 'DeploymentCount',
          Dimensions: [
            { Name: 'Environment', Value: environment },
            { Name: 'EventId', Value: eventId }
          ],
          Value: 1,
          Unit: 'Count',
          Timestamp: new Date()
        },
        {
          MetricName: 'BundleSize',
          Dimensions: [
            { Name: 'Environment', Value: environment }
          ],
          Value: fileSize,
          Unit: 'Bytes',
          Timestamp: new Date()
        }
      ]
    };

    try {
      await cloudwatch.putMetricData(params).promise();
      console.log('📊 Metrics recorded');
    } catch (error) {
      console.warn('⚠️  Failed to record metrics:', error);
    }
  }

  static async recordAccessMetrics(eventId, userAgent) {
    // 접근 로그 기록
    const params = {
      Namespace: 'MarketingEvents/Access',
      MetricData: [
        {
          MetricName: 'PageViews',
          Dimensions: [
            { Name: 'EventId', Value: eventId },
            { Name: 'Platform', Value: this.detectPlatform(userAgent) }
          ],
          Value: 1,
          Unit: 'Count'
        }
      ]
    };

    await cloudwatch.putMetricData(params).promise();
  }

  static detectPlatform(userAgent) {
    if (/iPhone|iPad/.test(userAgent)) return 'iOS';
    if (/Android/.test(userAgent)) return 'Android';
    return 'Web';
  }
}
```

### 🔍 접근 로그 분석

#### S3 액세스 로그 활성화

```bash
# S3 버킷에 액세스 로그 설정
aws s3api put-bucket-logging \
  --bucket marketing-events-prod \
  --bucket-logging-status file://logging-config.json
```

#### logging-config.json

```json
{
  "LoggingEnabled": {
    "TargetBucket": "marketing-events-logs",
    "TargetPrefix": "access-logs/"
  }
}
```

#### 로그 분석 스크립트

```javascript
// scripts/analyze-logs.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

class LogAnalyzer {
  async analyzeEventAccess(eventId, dateRange) {
    const logs = await this.getAccessLogs(dateRange);
    const eventLogs = this.filterEventLogs(logs, eventId);
    
    return {
      totalRequests: eventLogs.length,
      uniqueIPs: new Set(eventLogs.map(log => log.ip)).size,
      statusCodes: this.aggregateStatusCodes(eventLogs),
      hourlyDistribution: this.getHourlyDistribution(eventLogs),
      userAgents: this.aggregateUserAgents(eventLogs)
    };
  }

  filterEventLogs(logs, eventId) {
    return logs.filter(log => 
      log.uri.includes(`event_${eventId}.html`)
    );
  }

  aggregateStatusCodes(logs) {
    return logs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {});
  }

  getHourlyDistribution(logs) {
    return logs.reduce((acc, log) => {
      const hour = new Date(log.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
  }
}
```

---

## 트러블슈팅

### 🚨 일반적인 문제들

#### 1. 403 Forbidden 에러

**원인:**
- S3 버킷 정책 설정 오류
- CORS 설정 누락
- Referer 검증 실패

**해결방법:**
```bash
# 버킷 정책 확인
aws s3api get-bucket-policy --bucket marketing-events-prod

# CORS 설정 확인
aws s3api get-bucket-cors --bucket marketing-events-prod

# 퍼블릭 접근 차단 설정 확인
aws s3api get-public-access-block --bucket marketing-events-prod
```

#### 2. 파일이 업데이트되지 않음

**원인:**
- CloudFront 캐시
- 브라우저 캐시
- S3 버전 관리

**해결방법:**
```javascript
// 강제 캐시 무효화
async function forceCacheInvalidation(eventId) {
  // CloudFront 무효화
  await invalidateCloudFront(eventId);
  
  // S3 메타데이터 업데이트 (ETag 변경)
  await s3.copyObject({
    Bucket: bucket,
    CopySource: `${bucket}/events/scratch/event_${eventId}.html`,
    Key: `events/scratch/event_${eventId}.html`,
    MetadataDirective: 'REPLACE',
    Metadata: {
      'last-modified': new Date().toISOString()
    }
  }).promise();
}
```

#### 3. 번들 파일이 너무 큼

**목표 크기:** < 200KB

**최적화 방법:**
```javascript
// 이미지 압축
const sharp = require('sharp');

async function optimizeImage(imagePath) {
  const optimized = await sharp(imagePath)
    .resize(800, 600, { fit: 'inside' })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
  
  return optimized;
}

// JS/CSS 압축 강화
const terser = require('terser');
const cleancss = require('clean-css');

function minifyJS(code) {
  const result = terser.minify(code, {
    compress: {
      dead_code: true,
      drop_console: true,
      drop_debugger: true
    },
    mangle: {
      toplevel: true
    }
  });
  
  return result.code;
}

function minifyCSS(css) {
  const result = new cleancss({
    level: 2,
    returnPromise: true
  }).minify(css);
  
  return result.styles;
}
```

### 🔧 디버깅 도구

#### 배포 상태 체크 스크립트

```javascript
// scripts/check-deployment.js
class DeploymentChecker {
  async checkEvent(eventId, environment = 'production') {
    console.log(`🔍 Checking event: ${eventId}`);
    
    const config = this.getConfig(environment);
    const url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/events/scratch/event_${eventId}.html`;
    
    try {
      // HTTP 상태 확인
      const response = await fetch(url, { method: 'HEAD' });
      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        // 파일 정보
        const contentLength = response.headers.get('content-length');
        const lastModified = response.headers.get('last-modified');
        const etag = response.headers.get('etag');
        
        console.log(`📏 Size: ${(contentLength / 1024).toFixed(2)} KB`);
        console.log(`🕒 Modified: ${lastModified}`);
        console.log(`🏷️  ETag: ${etag}`);
        
        // 실제 콘텐츠 검증
        const content = await fetch(url).then(res => res.text());
        if (content.includes(`"eventId":"${eventId}"`)) {
          console.log('✅ Event ID correctly embedded');
        } else {
          console.log('❌ Event ID not found in content');
        }
        
      } else {
        console.log(`❌ File not accessible: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Check failed:', error);
    }
  }

  async checkAllEvents(environment = 'production') {
    const deployer = new S3Deployer(environment);
    const events = await deployer.listDeployedEvents();
    
    for (const event of events) {
      const eventId = event.Key.match(/event_(.+)\.html$/)?.[1];
      if (eventId) {
        await this.checkEvent(eventId, environment);
        console.log('---');
      }
    }
  }
}

// 사용법: node scripts/check-deployment.js newyear_2025 production
```

---

## 성능 최적화

### ⚡ 최적화 체크리스트

#### 1. 파일 크기 최적화
- [ ] HTML/CSS/JS 압축 적용
- [ ] 불필요한 주석 및 공백 제거
- [ ] 이미지 최적화 (WebP 변환, 압축)
- [ ] 폰트 서브셋 적용

#### 2. 로딩 성능
- [ ] Critical CSS 인라인
- [ ] JavaScript 지연 로딩
- [ ] 이미지 lazy loading
- [ ] 프리로드 리소스 최적화

#### 3. 캐싱 전략
- [ ] 적절한 Cache-Control 헤더
- [ ] ETag 활용
- [ ] CloudFront 캐시 설정
- [ ] 브라우저 캐시 활용

#### 4. CDN 최적화
- [ ] Gzip 압축 활성화
- [ ] Brotli 압축 활성화 (지원되는 경우)
- [ ] Edge 위치 최적화
- [ ] HTTP/2 활성화

### 📊 성능 측정

```javascript
// 성능 측정 스크립트
class PerformanceTester {
  async testEventPage(eventId, environment = 'production') {
    const config = this.getConfig(environment);
    const url = `https://${config.domain}/events/scratch/event_${eventId}.html`;
    
    console.log(`🚀 Testing performance for: ${url}`);
    
    const metrics = await this.measurePageLoad(url);
    
    console.log('📊 Performance Metrics:');
    console.log(`  Time to First Byte: ${metrics.ttfb}ms`);
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  Full Load: ${metrics.loadComplete}ms`);
    console.log(`  First Paint: ${metrics.firstPaint}ms`);
    console.log(`  Transfer Size: ${(metrics.transferSize / 1024).toFixed(2)} KB`);
    
    // 성능 목표 검증
    this.validatePerformance(metrics);
    
    return metrics;
  }

  validatePerformance(metrics) {
    const targets = {
      ttfb: 500,           // 500ms 이내
      domContentLoaded: 2000, // 2초 이내
      loadComplete: 3000,     // 3초 이내
      transferSize: 204800    // 200KB 이내
    };

    Object.entries(targets).forEach(([key, target]) => {
      const actual = metrics[key];
      const status = actual <= target ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${actual} (target: ${target})`);
    });
  }
}
```

### 🎯 최적화 권장사항

1. **번들 크기**: 200KB 이하 유지
2. **로딩 시간**: 3초 이내 완료
3. **TTFB**: 500ms 이내
4. **이미지 최적화**: WebP 포맷 우선 사용
5. **압축**: Gzip/Brotli 압축 활용
6. **캐싱**: 적절한 캐시 정책 설정

---

## 📚 관련 문서

- [메인 아키텍처](../architecture/scratch-game-architecture.md)
- [프론트엔드 구현 가이드](../frontend/implementation-guide.md)
- [앱-웹 브릿지 API](../api/bridge-interface.md)

---

**문서 히스토리**

| 버전 | 날짜 | 변경사항 | 작성자 |
|------|------|----------|--------|
| v1.0 | 2025-09-05 | 초기 배포 가이드 작성 | 김도현 |