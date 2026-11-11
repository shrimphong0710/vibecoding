# CamScanner 필기 제거 연결

## 비율 자동 조정

사진 보정창의 **비율 자동 조정**은 [공식 image_hd HTTP 연동](https://github.com/CS-CamScanner/CamScanner-skills/blob/main/skills/camscanner-image-hd/SKILL.md)을 사용합니다. 원본 업로드 → `image_hd/execute`에 `file_id` 전달 → 결과 다운로드 순서이며, 별도 `hd_mode`를 보내지 않습니다. 자동 문서 자르기와 문서 보정, 선명도 처리가 함께 수행됩니다. 새로운 자르기 결과는 입력과 가로세로 비율이 달라도 허용하며, 화면에 결과를 표시하기 전에 유효한 이미지인지 검사합니다.

로컬 Node·Render와 Sites Worker에서 `/api/photo-correction/straighten`을 제공합니다. 사진은 CamScanner 서버로 전송됩니다. 조정 전·후 비교, 보정 결과 저장, 수동 자르기·기울기 조절, 실행 취소·원본 복원과 처리 중단을 지원합니다. 실패·취소 시 현재 사진을 유지하고, 보정창을 닫거나 다른 사진을 열면 이전 결과를 반영하지 않습니다. 같은 사진을 중복 요청하지 않으며 필기 제거와 서버 처리 제한을 공유합니다.

`verify-auto-straighten.mjs`는 대체 서비스로 요청과 편집 동작을 검사합니다. `verify-auto-straighten-live.mjs`는 생성한 검증용 문제지만 실제 외부 서비스로 전송합니다. 실제 처리 결과는 `qa/auto-straighten/report.json`의 `success`와 전후 이미지를 함께 확인합니다.

문지의 기본 **필기 제거** 버튼은 CamScanner 서버에 사진을 보내 처리하고, 반환된 사진을 편집 화면에 바로 적용합니다. 후보별 체크, 미리보기, 별도 결과 확정 단계가 없습니다. 처리 뒤 ‘제거 전 / 제거 후’로 비교할 수 있으며, 제거 전을 보고 있어도 저장하거나 다른 편집을 시작하면 제거 후 결과를 사용합니다. 실행 취소로 되돌릴 수 있습니다. API 토큰 입력 화면은 없으며, 실패하면 입력 사진을 유지하고 로컬 필터로 대체하지 않습니다.

## 공식 공개 연동

- [CamScanner 공식 기능 안내](https://www.camscanner.com/agent-docs/capabilities/)
- [공식 저장소 — 현재 무료 제공 안내](https://github.com/CS-CamScanner/CamScanner-skills)
- [필기 제거 HTTP 요청 명세](https://github.com/CS-CamScanner/CamScanner-skills/blob/main/skills/camscanner-image-erase-handwriting/SKILL.md)

공식 저장소의 HTTP 예제를 기준으로 https://ai-tools.camscanner.com 에 세 번의 POST를 보냅니다.

1. upload_file/execute: application/octet-stream 원본 이미지 업로드
2. enhance_image/execute: 응답 file_id, 숫자 enhance_mode=9, output_mode=file_id
3. download_file/execute?response_mode=raw: 결과 file_id를 보내 실제 이미지 바이트 수신

서비스가 반환한 파일 ID를 그대로 사용하고 각 단계의 code=200, tool_result.success=true를 확인합니다. 처리할 사진만 전송하며 사용자 클라우드 문서 목록이나 계정 자료는 읽지 않습니다. 추가 보호 영역은 입력 픽셀로 복원하고, 선택 영역은 해당 부분만 업로드합니다.

현재 무료 제공 여부는 서비스 운영 정책에 따라 달라질 수 있습니다. 최신 공식 CLI/MCP 문서에는 브라우저 OAuth가 안내돼 있습니다. 이 구현은 공식 저장소의 공개 HTTP 예제 경로를 사용하며, 서버가 인증을 요구하면 그 오류를 표시합니다. 인증을 우회하거나 비공개 토큰을 사용하지 않습니다.

## 실행과 검증

파일 탐색기에서 **Start-Munji.cmd를 직접 실행**합니다. 이 시작 파일은 같은 프로젝트의 기존 서버만 확인해 종료하고, 현재 사용자의 실행 환경에서 새 서버를 시작합니다. 구형 서버는 같은 문지 폴더를 제공하는지 임시 파일로 검증한 뒤 교체합니다. 다른 프로젝트나 알 수 없는 프로세스는 종료하지 않습니다. Start-Munji.ps1도 같은 시작 관리자를 사용하며, npm start는 서버를 직접 시작합니다.

현재 작업 도구로 시작한 서버는 도구의 외부 접속 제한을 상속하여 connect EACCES가 발생합니다. 이 제한을 코드로 해제하거나 권한을 높이지 않습니다. 사용자가 시작 파일을 직접 실행한 후 새 서버의 접속 검사 결과를 확인해야 합니다. 시작 시 접속 검사는 사진 업로드 없는 HEAD 요청이며 실제 필기 제거 성공을 뜻하지 않습니다. 편집 화면에서 제거 요청이 실패하면 해당 오류를 표시하고 사진을 유지합니다.

주소는 http://127.0.0.1:4173 입니다. 브라우저 작업은 유지되며 서버 재시작은 브라우저의 저장된 문제지를 삭제하지 않습니다. 단독 HTML 직접 실행에서는 서버 기능을 사용할 수 없으므로 Start-Munji.cmd 실행 안내를 표시합니다. 기존 Sites 매니페스트는 정적 배포이므로 해당 정적 호스팅만으로 Node 프록시가 동작하지 않습니다.

- verify-camscanner-api.mjs: 공식 업로드/필기 제거/다운로드 형식, mode 9, 오류·인증 요구·이용 제한·취소·중복 요청 처리를 대체 서버로 검증합니다.
- verify.mjs: 필기 제거 버튼이 CamScanner 경로를 사용하고 반환 이미지 표시, 전후 비교, 저장, 선택 영역, 취소/실행 취소가 동작하는지 검사합니다. 로컬 필터로 자동 대체하지 않는 것도 검사합니다.
- verify-cleanup-browser.mjs: 사용자 저장소와 분리한 Edge 헤드리스 브라우저에서 실제 화면의 확인 UI 제거, 자동 반영, 전후 비교, 제거 전을 보는 중 결과 저장을 대체 서비스 응답으로 검사합니다.
- verify-munji-startup.mjs: 같은 프로젝트 서버 교체, 다른 프로젝트 보호, 실행 인스턴스 검증, 네트워크 사전 검사와 차단 상태 표시를 검사합니다.
- verify-munji-launch.mjs: 별도의 로컬 포트에 실제 Node 프로세스를 띄워 새 PID로 교체하고 종료하는지 검사합니다. 외부 인터넷은 사용하지 않습니다.
- verify-camscanner-live.mjs: 직접 생성한 합성 문제지만 실제 서비스에 보내는 별도 검사입니다. qa/camscanner-live/report.json의 success가 true일 때만 실서비스 이미지 수신이 확인된 것입니다. 대체 서버 검사 통과는 실제 제거 품질 검증을 뜻하지 않습니다.

이 작업 환경에서는 외부 HTTPS 접속이 제한되어 실서비스의 이미지 처리와 실제 촬영 사진 품질은 확인하지 못했습니다. 현재 상태는 위 live 보고서에 기록합니다.
