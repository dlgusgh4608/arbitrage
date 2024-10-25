# Arbitrage Trading System

## 소개
이 프로젝트는 암호화폐의 가격 차이를 이용한 자동 거래 시스템입니다. 국내 거래소(Upbit)와 해외 거래소(Binance) 간의 가격 차이를 활용하여 수익을 창출하는 것을 목표로 합니다. 이 시스템은 실시간으로 가격을 모니터링하고, 조건에 따라 자동으로 매수 및 매도 주문을 실행합니다.

## 기능
- **실시간 가격 모니터링**: Upbit와 Binance의 가격을 실시간으로 수집합니다.
- **자동 거래**: 가격 차이에 따라 자동으로 매수 및 매도 주문을 실행합니다.
- **사용자 관리**: 사용자 정보를 데이터베이스에 저장하고 관리합니다.
- **알림 시스템**: 거래가 발생할 때 사용자에게 알림을 전송합니다.
- **환율 변환**: Google Finance를 Crawling을 하여 USD와 KRW 간의 환율을 실시간으로 업데이트합니다.

## 기술 스택
- **프로그래밍 언어**: TypeScript
- **데이터베이스**: PostgreSQL
- **웹소켓**: WebSocket을 사용하여 실시간 데이터 전송
- **API 통신**: Axios를 사용하여 외부 API와 통신

## 설치 및 실행
1. **레포지토리 클론**
   ```bash
   git clone https://github.com/yourusername/arbitrage.git
   cd arbitrage
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   `.env.development` 또는 `.env.production` 파일을 생성하고 필요한 환경 변수를 설정합니다.

4. **데이터베이스 초기화**
   PostgreSQL 데이터베이스를 설정하고, `pgInit.sql` 파일을 실행하여 초기 테이블을 생성합니다.

5. **서버 실행**
   ```bash
   npm run dev
   ```

## 사용법
- 시스템이 실행되면, Upbit와 Binance의 가격을 실시간으로 모니터링합니다.
- 가격 차이가 발생하면 자동으로 매수 및 매도 주문을 실행합니다.
- 거래가 발생할 때마다 사용자에게 알림을 전송합니다.