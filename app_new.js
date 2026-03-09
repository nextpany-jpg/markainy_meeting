// 전역 변수
let isAuthenticated = false;
let geminiApiKey = localStorage.getItem('gemini_api_key') || 'AIzaSyCNAaAdf4dLAaGlAJSUzETpmeujoOv7XLs';
let meetingData = {};

// 페이지 로드 시
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    
    if (authStatus === 'success') {
        showToast('Gmail 인증이 완료되었습니다!', 'success');
        window.history.replaceState({}, document.title, '/');
    } else if (authStatus === 'error') {
        showToast('Gmail 인증에 실패했습니다.', 'error');
        window.history.replaceState({}, document.title, '/');
    }
    
    // 오늘 날짜 기본값
    document.getElementById('meetingDate').valueAsDate = new Date();
    
    await checkAuthStatus();
});

// 인증 상태 확인
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.authenticated) {
            isAuthenticated = true;
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('mainInputSection').style.display = 'block';
        }
    } catch (error) {
        console.error('인증 상태 확인 오류:', error);
    }
}

// Gmail 인증
async function authenticateGmail() {
    try {
        const response = await fetch('/auth/url');
        const data = await response.json();
        window.location.href = data.url;
    } catch (error) {
        console.error('인증 URL 가져오기 오류:', error);
        showToast('인증 URL을 가져오는데 실패했습니다.', 'error');
    }
}

// 미팅 준비 시작 (정보만 저장하고 결과 섹션 표시)
async function prepareMeeting() {
    const meetingDate = document.getElementById('meetingDate').value;
    const meetingTime = document.getElementById('meetingTime').value;
    const meetingLocation = document.getElementById('meetingLocation').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    const meetingPurpose = document.getElementById('meetingPurpose').value.trim();
    
    if (!meetingDate || !meetingTime || !meetingLocation || !customerName) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
    }
    
    // 미팅 데이터 저장
    meetingData = {
        date: meetingDate,
        time: meetingTime,
        location: meetingLocation,
        customer: customerName,
        purpose: meetingPurpose
    };
    
    // 결과 섹션 표시 (자동 실행 없이)
    document.getElementById('resultsContainer').style.display = 'block';
    document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth' });
    
    showToast('미팅 정보가 저장되었습니다. 각 항목의 버튼을 눌러 정보를 조회하세요.', 'success');
}

// 1. 최신 뉴스 로드 (구글 뉴스 RSS 사용)
async function loadNews() {
    const content = document.getElementById('newsContent');
    
    if (!meetingData.customer) {
        showToast('먼저 미팅 정보를 입력하고 "미팅 준비 시작"을 클릭하세요.', 'error');
        return;
    }
    
    content.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: #666; margin-top: 12px;">최신 뉴스를 검색하고 있습니다...</p>';
    
    try {
        // 서버에 뉴스 검색 요청
        const response = await fetch('/api/search-news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: meetingData.customer
            })
        });
        
        const data = await response.json();
        
        console.log('뉴스 검색 결과:', data);
        
        if (data.news && data.news.length > 0) {
            content.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    <h4 style="margin: 0 0 8px 0; color: white; font-size: 18px;">📰 ${meetingData.customer} 최신 뉴스</h4>
                    <p style="margin: 0; font-size: 13px; opacity: 0.9;">구글 뉴스에서 ${data.count}건의 뉴스를 찾았습니다</p>
                </div>
                
                ${data.news.map((item, index) => {
                    const pubDate = new Date(item.pubDate);
                    const timeAgo = getTimeAgo(pubDate);
                    
                    return `
                    <div class="news-item" style="padding: 16px; background: #f8f9fa; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #667eea; transition: all 0.2s;" onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='#f8f9fa'">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #333; font-size: 15px; flex: 1;">${index + 1}. ${escapeHtml(item.title)}</h4>
                            <span style="font-size: 12px; color: #999; white-space: nowrap; margin-left: 12px;">${timeAgo}</span>
                        </div>
                        ${item.source ? `<p style="margin: 4px 0; color: #1976d2; font-size: 13px; font-weight: 600;">📰 ${escapeHtml(item.source)}</p>` : ''}
                        ${item.description ? `<p style="margin: 8px 0 0 0; color: #666; font-size: 13px; line-height: 1.5;">${escapeHtml(stripHtml(item.description))}</p>` : ''}
                        <a href="${item.link}" target="_blank" style="display: inline-block; margin-top: 8px; color: #667eea; font-size: 13px; text-decoration: none; font-weight: 600;">기사 읽기 →</a>
                    </div>
                `}).join('')}
            `;
            
            showToast('뉴스 조회 완료!', 'success');
        } else {
            content.innerHTML = `
                <p style="color: #999;">📭 "${meetingData.customer}" 관련 최신 뉴스를 찾을 수 없습니다.</p>
                <p style="font-size: 13px; color: #666; margin-top: 8px;">
                    💡 다른 검색어를 시도해보세요.
                </p>
            `;
        }
        
    } catch (error) {
        console.error('뉴스 로드 오류:', error);
        content.innerHTML = '<p style="color: #e74c3c;">⚠️ 뉴스 정보를 가져오는데 실패했습니다. 네트워크 연결을 확인해주세요.</p>';
    }
}

// 시간 경과 표시 (예: 2시간 전, 1일 전)
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins}분 전`;
    } else if (diffHours < 24) {
        return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
        return `${diffDays}일 전`;
    } else {
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
}

// HTML 태그 제거
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// 2. 이메일 로드 (CSV 첨부파일 분석)
async function loadEmails() {
    const content = document.getElementById('emailContent');
    
    if (!meetingData.customer) {
        showToast('먼저 미팅 정보를 입력하고 "미팅 준비 시작"을 클릭하세요.', 'error');
        return;
    }
    
    content.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: #666; margin-top: 12px;">GIST 활동결과 이메일을 검색하고 있습니다...</p>';
    
    try {
        // 최근 30일 내 "결과 보기(GIST 이번달 활동결과 확인용)" 이메일 검색
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        // 날짜를 로컬 시간 기준으로 변환 (YYYY-MM-DD)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const startDateStr = formatDate(startDate);
        const endDateStr = formatDate(endDate);
        
        console.log('검색 기간:', startDateStr, '~', endDateStr);
        
        const response = await fetch('/api/search-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName: meetingData.customer,
                startDate: startDateStr,
                endDate: endDateStr
            })
        });
        
        const data = await response.json();
        
        console.log('검색 결과:', data);
        
        if (data.emails && data.emails.length > 0) {
            // CSV 첨부파일이 있는 이메일 찾기
            const emailsWithCSV = data.emails.filter(email => email.attachmentData);
            
            console.log('CSV 첨부파일 있는 이메일:', emailsWithCSV.length);
            
            if (emailsWithCSV.length > 0) {
                // 가장 최근 이메일의 CSV 데이터 사용
                const latestEmail = emailsWithCSV[0];
                const csvData = latestEmail.attachmentData;
                
                console.log('CSV 데이터:', csvData);
                
                // 고객사명으로 필터링
                const customerData = csvData.data.filter(row => {
                    return Object.values(row).some(value => 
                        value && value.toString().includes(meetingData.customer)
                    );
                });
                
                console.log('고객사 필터링 결과:', customerData.length);
                
                if (customerData.length > 0) {
                    // AI로 데이터 요약
                    const dataText = customerData.map(row => 
                        Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
                    ).join('\n');
                    
                    const summaryPrompt = `다음은 "${meetingData.customer}" 관련 GIST 활동 데이터입니다. 주요 활동 내용을 3-4줄로 요약해주세요:\n\n${dataText}`;
                    const summary = await callGeminiAPI(summaryPrompt);
                    
                    // 필요한 컬럼만 선택: 작성 일자, 기회, 기회 단계, 비고
                    const requiredColumns = ['작성 일자', '일자', '기회', '기회 단계', '기회단계', '비고'];
                    const headers = Object.keys(customerData[0]);
                    const displayColumns = headers.filter(h => 
                        requiredColumns.some(req => h.includes(req))
                    );
                    
                    content.innerHTML = `
                        <!-- AI 요약 카드 -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <h4 style="margin: 0 0 12px 0; color: white; font-size: 18px;">🎯 ${meetingData.customer} 활동 요약</h4>
                            <p style="margin: 0; line-height: 1.6; font-size: 14px;">${summary}</p>
                            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); display: flex; justify-content: space-between; font-size: 12px;">
                                <span>📅 ${new Date(latestEmail.date).toLocaleDateString('ko-KR')}</span>
                                <span>📊 총 ${customerData.length}건</span>
                            </div>
                        </div>
                        
                        <!-- 통계 카드 -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 10px; color: white; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">${customerData.length}</div>
                                <div style="font-size: 12px; opacity: 0.9;">활동 건수</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 16px; border-radius: 10px; color: white; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">${displayColumns.length}</div>
                                <div style="font-size: 12px; opacity: 0.9;">표시 항목</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 16px; border-radius: 10px; color: white; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">30</div>
                                <div style="font-size: 12px; opacity: 0.9;">검색 기간(일)</div>
                            </div>
                        </div>
                        
                        <h4 style="margin: 20px 0 12px 0; color: #2c3e50; font-size: 16px;">📋 상세 활동 내역 (작성일자, 기회, 기회단계, 비고)</h4>
                        
                        <!-- 개선된 테이블 디자인 -->
                        <div style="background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; margin-bottom: 20px;">
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                    <thead>
                                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                            <th style="padding: 10px 8px; text-align: center; color: white; font-weight: 600; font-size: 13px; white-space: nowrap; position: sticky; left: 0; z-index: 10; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">NO</th>
                                            ${displayColumns.map(header => 
                                                `<th style="padding: 10px 8px; text-align: left; color: white; font-weight: 600; font-size: 13px; white-space: nowrap; min-width: ${header === '비고' ? '300px' : header === '회사/고객사' || header === '기회' ? '150px' : '100px'};">${escapeHtml(header)}</th>`
                                            ).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${customerData.slice(0, 30).map((row, index) => {
                                            const bgColor = index % 2 === 0 ? '#fafbfc' : 'white';
                                            
                                            return `
                                            <tr style="border-bottom: 1px solid #e8eaed; background: ${bgColor}; transition: all 0.2s;" onmouseover="this.style.background='#e3f2fd'; this.style.transform='scale(1.01)'" onmouseout="this.style.background='${bgColor}'; this.style.transform='scale(1)'">
                                                <td style="padding: 8px; text-align: center; color: #5f6368; font-weight: 700; font-size: 13px; position: sticky; left: 0; background: ${bgColor}; z-index: 5;">${index + 1}</td>
                                                ${displayColumns.map(header => {
                                                    const value = row[header] || '-';
                                                    const displayValue = escapeHtml(value);
                                                    
                                                    // 작성 일자 컬럼 스타일
                                                    if (header.includes('일자')) {
                                                        return `<td style="padding: 8px; color: #5f6368; font-weight: 600; white-space: nowrap; font-size: 13px;">📅 ${displayValue}</td>`;
                                                    }
                                                    
                                                    // 기회 컬럼 강조
                                                    if (header === '기회') {
                                                        return `<td style="padding: 8px; color: #e37400; font-weight: 600; white-space: nowrap; font-size: 13px;">💼 ${displayValue}</td>`;
                                                    }
                                                    
                                                    // 기회 단계 컬럼
                                                    if (header.includes('기회') && header.includes('단계')) {
                                                        return `<td style="padding: 8px; color: #5f6368; white-space: nowrap; font-size: 13px;">📊 ${displayValue}</td>`;
                                                    }
                                                    
                                                    // 비고 컬럼 - 전체 내용 표시 (여러 줄)
                                                    if (header === '비고') {
                                                        return `<td style="padding: 8px; max-width: 400px; color: #5f6368; white-space: pre-wrap; word-break: break-word; line-height: 1.5; font-size: 13px;">💬 ${displayValue}</td>`;
                                                    }
                                                    
                                                    // 일반 컬럼
                                                    return `<td style="padding: 8px; color: #5f6368; white-space: nowrap; font-size: 13px;">${displayValue}</td>`;
                                                }).join('')}
                                            </tr>
                                        `}).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        ${customerData.length > 30 ? `
                            <div style="text-align: center; padding: 14px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 10px; margin-top: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <p style="margin: 0; color: #2c3e50; font-size: 13px; font-weight: 600;">
                                    📊 총 <span style="color: #667eea; font-size: 16px; font-weight: 700;">${customerData.length}</span>건 중 <span style="color: #667eea; font-size: 16px; font-weight: 700;">30</span>건 표시 
                                    <span style="color: #7f8c8d; font-size: 12px; margin-left: 8px;">(${customerData.length - 30}건 더 있음)</span>
                                </p>
                            </div>
                        ` : ''}
                    `;
                    
                    showToast('활동 데이터 분석 완료!', 'success');
                } else {
                    content.innerHTML = `
                        <p style="color: #999;">📭 CSV 파일에서 "${meetingData.customer}" 관련 데이터를 찾을 수 없습니다.</p>
                        <p style="font-size: 13px; color: #666; margin-top: 8px;">
                            💡 팁: 고객사명을 정확히 입력했는지 확인해주세요.<br>
                            검색된 전체 데이터: ${csvData.data.length}건
                        </p>
                    `;
                }
            } else {
                content.innerHTML = `
                    <p style="color: #999;">📭 CSV 첨부파일이 있는 이메일을 찾을 수 없습니다.</p>
                    <p style="font-size: 13px; color: #666; margin-top: 8px;">
                        검색된 이메일: ${data.emails.length}건<br>
                        💡 "결과 보기(GIST 이번달 활동결과 확인용)" 제목의 이메일에 CSV 첨부파일이 있어야 합니다.
                    </p>
                `;
            }
        } else {
            content.innerHTML = `
                <p style="color: #999;">📭 최근 30일 내 "결과 보기(GIST 이번달 활동결과 확인용)" 이메일이 없습니다.</p>
                <p style="font-size: 13px; color: #666; margin-top: 8px;">
                    검색 기간: ${startDateStr} ~ ${endDateStr}<br>
                    💡 Gmail에서 해당 제목의 이메일을 확인해주세요.
                </p>
            `;
        }
        
    } catch (error) {
        console.error('이메일 로드 오류:', error);
        content.innerHTML = '<p style="color: #e74c3c;">⚠️ 이메일 정보를 가져오는데 실패했습니다. Gmail 인증을 확인해주세요.</p>';
    }
}

// 2-1. 연락처 정보 로드 (연락처 고객사 정보 취합 CSV)
async function loadContactInfo() {
    const content = document.getElementById('contactContent');
    const customerNameInput = document.getElementById('contactCustomerName');
    const personNameInput = document.getElementById('contactPersonName');
    const customerName = customerNameInput.value.trim();
    const personName = personNameInput.value.trim();
    
    if (!customerName) {
        showToast('고객사명을 입력해주세요.', 'error');
        customerNameInput.focus();
        return;
    }
    
    content.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: #666; margin-top: 12px;">연락처 정보를 검색하고 있습니다...</p>';
    
    try {
        // 새로운 API 사용: "[연락처 고객사 정보 취합]" 이메일만 검색
        const response = await fetch('/api/search-contact-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName: customerName
            })
        });
        
        const data = await response.json();
        
        console.log('연락처 검색 결과:', data);
        
        if (data.found && data.email) {
            const contactEmail = data.email;
            const csvData = contactEmail.attachmentData;
            let contactData = csvData.data;
            
            // 고객명(성)으로 추가 필터링
            if (personName) {
                // 실제 컬럼명 확인
                const headers = Object.keys(csvData.data[0]);
                console.log('CSV 컬럼명:', headers);
                
                // "성" 또는 이름 관련 컬럼 찾기
                const nameColumn = headers.find(h => 
                    h.includes('성') || h.includes('이름') || h.includes('Name') || h.includes('name')
                );
                
                console.log('이름 컬럼:', nameColumn);
                
                if (nameColumn) {
                    contactData = contactData.filter(row => {
                        const name = row[nameColumn] || '';
                        // 대소문자 구분 없이 포함 여부 확인
                        return name.toLowerCase().includes(personName.toLowerCase());
                    });
                    console.log(`고객명 "${personName}" 필터링 결과:`, contactData.length);
                } else {
                    console.log('이름 컬럼을 찾을 수 없습니다. 전체 데이터 표시');
                    showToast('이름 컬럼을 찾을 수 없어 전체 데이터를 표시합니다.', 'warning');
                }
            }
            
            console.log('연락처 데이터:', contactData.length);
            
            if (contactData.length > 0) {
                // 필요한 컬럼만 추출: 성, 직급, 담당자 정보, 전화, 휴대폰, 이메일
                // 제외: 고객사 소유자, 마지막 활동, 고객사명
                const headers = Object.keys(contactData[0]);
                const requiredColumns = headers.filter(col => 
                    ['성', '직급', '담당자 정보', '담당자정보', '전화', '휴대폰', '이메일'].some(req => col.includes(req)) &&
                    !col.includes('소유자') && 
                    !col.includes('활동') && 
                    !col.includes('고객사명') &&
                    !col.includes('회사')
                );
                
                // 필수 컬럼이 없으면 전체 컬럼 사용
                const displayColumns = requiredColumns.length > 0 ? requiredColumns : headers;
                
                // 간단한 요약만 표시
                content.innerHTML = `
                    <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                        <p style="margin: 0; font-size: 14px;">📊 총 ${contactData.length}명의 연락처를 찾았습니다.</p>
                    </div>
                    <button class="btn btn-success btn-large" onclick="openContactModal()">
                        <span>📋</span> 전체 화면으로 보기
                    </button>
                `;
                
                // 모달에 전체 데이터 저장
                window.contactModalData = {
                    customerName,
                    contactData,
                    displayColumns,
                    contactEmail
                };
                
                showToast('연락처 정보 조회 완료! 전체 화면으로 보기 버튼을 클릭하세요.', 'success');
            } else {
                // 필터링 결과가 없는 경우
                const filterMsg = personName ? `고객명 "${personName}"으로 필터링한 결과` : `"${customerName}" 관련`;
                content.innerHTML = `
                    <p style="color: #999;">📭 ${filterMsg} 연락처를 찾을 수 없습니다.</p>
                    <p style="font-size: 13px; color: #666; margin-top: 8px;">
                        💡 팁: ${personName ? '고객명을 정확히 입력했는지 확인하거나 고객명 입력창을 비워보세요.' : '고객사명을 정확히 입력했는지 확인해주세요.'}
                    </p>
                `;
            }
        } else {
            content.innerHTML = `
                <p style="color: #999;">📭 "[연락처 고객사 정보 취합]" 이메일을 찾을 수 없습니다.</p>
                <p style="font-size: 13px; color: #666; margin-top: 8px;">
                    💡 Gmail에서 해당 제목의 이메일과 CSV 첨부파일을 확인해주세요.
                </p>
            `;
        }
        
    } catch (error) {
        console.error('연락처 로드 오류:', error);
        content.innerHTML = '<p style="color: #e74c3c;">⚠️ 연락처 정보를 가져오는데 실패했습니다. Gmail 인증을 확인해주세요.</p>';
    }
}

// 연락처 모달 열기
function openContactModal() {
    if (!window.contactModalData) {
        showToast('연락처 데이터가 없습니다.', 'error');
        return;
    }
    
    const { customerName, contactData, displayColumns, contactEmail } = window.contactModalData;
    
    // 모달 제목 설정
    document.getElementById('contactModalTitle').textContent = `👥 ${customerName} 연락처 정보 (${contactData.length}명)`;
    
    // 모달 본문에 테이블 생성
    const modalBody = document.getElementById('contactModalBody');
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; padding: 16px; background: #f0f7ff; border-radius: 8px;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
                📅 최종 업데이트: ${new Date(contactEmail.date).toLocaleDateString('ko-KR')} | 
                📊 총 ${contactData.length}명
            </p>
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                        <th style="padding: 10px 8px; text-align: center; color: white; font-weight: 600; font-size: 13px; white-space: nowrap; position: sticky; top: 0; z-index: 10; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">NO</th>
                        ${displayColumns.map(col => 
                            `<th style="padding: 10px 8px; text-align: left; color: white; font-weight: 600; font-size: 13px; white-space: nowrap; position: sticky; top: 0; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">${escapeHtml(col)}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${contactData.map((row, index) => {
                        const bgColor = index % 2 === 0 ? '#f8fffe' : 'white';
                        
                        return `
                        <tr style="border-bottom: 1px solid #e8eaed; background: ${bgColor}; transition: all 0.2s;" onmouseover="this.style.background='#e8f5e9'" onmouseout="this.style.background='${bgColor}'">
                            <td style="padding: 8px; text-align: center; color: #5f6368; font-weight: 700; font-size: 13px;">${index + 1}</td>
                            ${displayColumns.map(col => {
                                const value = row[col] || '-';
                                const displayValue = escapeHtml(value);
                                
                                // 성 컬럼
                                if (col.includes('성') && col.length <= 2) {
                                    return `<td style="padding: 8px; color: #1a73e8; font-weight: 700; white-space: nowrap; font-size: 13px;">👤 ${displayValue}</td>`;
                                }
                                
                                // 직급 컬럼
                                if (col.includes('직급')) {
                                    return `<td style="padding: 8px; color: #e37400; font-weight: 600; white-space: nowrap; font-size: 13px;">🎖️ ${displayValue}</td>`;
                                }
                                
                                // 담당자 정보 컬럼
                                if (col.includes('담당자')) {
                                    return `<td style="padding: 8px; color: #5f6368; white-space: normal; word-break: break-word; max-width: 300px; font-size: 13px;">📋 ${displayValue}</td>`;
                                }
                                
                                // 전화 컬럼
                                if (col.includes('전화') && !col.includes('휴대')) {
                                    return `<td style="padding: 8px; color: #5f6368; white-space: nowrap; font-size: 13px;">☎️ ${displayValue}</td>`;
                                }
                                
                                // 휴대폰 컬럼
                                if (col.includes('휴대')) {
                                    return `<td style="padding: 8px; color: #5f6368; white-space: nowrap; font-size: 13px;">📱 ${displayValue}</td>`;
                                }
                                
                                // 이메일 컬럼
                                if (col.includes('이메일') || col.includes('email')) {
                                    return `<td style="padding: 8px; color: #1a73e8; white-space: nowrap; font-size: 13px;">📧 ${displayValue}</td>`;
                                }
                                
                                // 일반 컬럼
                                return `<td style="padding: 8px; color: #5f6368; white-space: nowrap; font-size: 13px;">${displayValue}</td>`;
                            }).join('')}
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // 모달 표시
    document.getElementById('contactModal').style.display = 'block';
}

// 연락처 모달 닫기
function closeContactModal() {
    document.getElementById('contactModal').style.display = 'none';
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('contactModal');
    if (event.target === modal) {
        closeContactModal();
    }
}

// ESC 키로 모달 닫기
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('contactModal');
        if (modal && modal.style.display === 'block') {
            closeContactModal();
        }
    }
});

// 3. 캘린더 로드
async function loadCalendar() {
    const content = document.getElementById('calendarContent');
    
    if (!meetingData.date || !meetingData.time) {
        showToast('먼저 미팅 정보를 입력하고 "미팅 준비 시작"을 클릭하세요.', 'error');
        return;
    }
    
    const startDateTime = `${meetingData.date}T${meetingData.time}:00`;
    
    // 종료 시간 계산 (시간 문자열로 직접 계산)
    const [hours, minutes] = meetingData.time.split(':').map(Number);
    const endHours = (hours + 1).toString().padStart(2, '0');
    const endMinutes = minutes.toString().padStart(2, '0');
    const endDateTime = `${meetingData.date}T${endHours}:${endMinutes}:00`;
    
    console.log('시작 시간:', startDateTime);
    console.log('종료 시간:', endDateTime);
    
    content.innerHTML = `
        <div class="calendar-event">
            <h4>📅 일정 정보</h4>
            <p><strong>날짜:</strong> ${meetingData.date}</p>
            <p><strong>시간:</strong> ${meetingData.time} ~ ${endHours}:${endMinutes} (1시간)</p>
            <p><strong>장소:</strong> ${meetingData.location}</p>
            <p><strong>고객사:</strong> ${meetingData.customer}</p>
            ${meetingData.purpose ? `<p><strong>목적:</strong> ${meetingData.purpose}</p>` : ''}
            
            <div class="event-actions">
                <button class="btn btn-primary" onclick="registerCalendarEvent('${startDateTime}', '${endDateTime}')">
                    <span>✅</span> 캘린더에 등록
                </button>
                <button class="btn btn-secondary" onclick="showCalendarForm()">
                    <span>✏️</span> 수정
                </button>
            </div>
        </div>
        
        <div id="calendarForm" style="display: none;" class="calendar-event-form">
            <input type="text" id="editTitle" placeholder="일정 제목" value="${meetingData.customer} 미팅">
            <input type="text" id="editLocation" placeholder="장소" value="${meetingData.location}">
            <textarea id="editDescription" placeholder="설명" rows="3">${meetingData.purpose || ''}</textarea>
            <div class="event-actions">
                <button class="btn btn-primary" onclick="updateCalendarEvent('${startDateTime}', '${endDateTime}')">저장</button>
                <button class="btn btn-secondary" onclick="hideCalendarForm()">취소</button>
            </div>
        </div>
    `;
    
    showToast('일정 정보 생성 완료!', 'success');
}

// 캘린더 일정 등록
async function registerCalendarEvent(startDateTime, endDateTime) {
    try {
        const response = await fetch('/api/create-calendar-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: `${meetingData.customer} 미팅`,
                description: meetingData.purpose || '',
                startDateTime: startDateTime,
                endDateTime: endDateTime,
                location: meetingData.location
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('캘린더에 일정이 등록되었습니다!', 'success');
            const content = document.getElementById('calendarContent');
            content.innerHTML += `
                <div class="info-box" style="background: #d4edda; margin-top: 12px;">
                    <p style="color: #155724;">✅ 구글 캘린더에 등록 완료!</p>
                    <a href="${data.htmlLink}" target="_blank" style="color: #1976d2;">캘린더에서 보기 →</a>
                </div>
            `;
        } else {
            throw new Error(data.detail || '일정 등록 실패');
        }
    } catch (error) {
        console.error('캘린더 등록 오류:', error);
        showToast('일정 등록에 실패했습니다: ' + error.message, 'error');
    }
}

// 캘린더 폼 표시/숨김
function showCalendarForm() {
    document.getElementById('calendarForm').style.display = 'grid';
}

function hideCalendarForm() {
    document.getElementById('calendarForm').style.display = 'none';
}

// 캘린더 일정 수정
async function updateCalendarEvent(startDateTime, endDateTime) {
    const title = document.getElementById('editTitle').value;
    const location = document.getElementById('editLocation').value;
    const description = document.getElementById('editDescription').value;
    
    meetingData.customer = title.replace(' 미팅', '');
    meetingData.location = location;
    meetingData.purpose = description;
    
    await registerCalendarEvent(startDateTime, endDateTime);
    hideCalendarForm();
}

// 4. 맛집 로드 (지도 및 동선 포함)
async function loadRestaurants() {
    const content = document.getElementById('restaurantContent');
    const mapDiv = document.getElementById('restaurantMap');
    
    if (!meetingData.location) {
        showToast('먼저 미팅 정보를 입력하고 "미팅 준비 시작"을 클릭하세요.', 'error');
        return;
    }
    
    content.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: #666; margin-top: 12px;">주변 맛집을 검색하고 있습니다...</p>';
    mapDiv.style.display = 'none';
    
    try {
        const coords = await getCoordinates(meetingData.location);
        const ps = new kakao.maps.services.Places();
        
        // 검색 옵션 가져오기
        const radius = parseInt(document.getElementById('searchRadius')?.value || 1000);
        const maxCount = parseInt(document.getElementById('resultCount')?.value || 10);
        const minRating = parseInt(document.getElementById('ratingFilter')?.value || 4);
        
        // 카페 검색
        const cafes = await searchPlaces(ps, '카페', coords, radius, Math.ceil(maxCount / 2));
        
        // 식당 검색
        const restaurants = await searchPlaces(ps, '맛집', coords, radius, Math.ceil(maxCount / 2));
        
        // 카테고리 분류
        const categorizedRestaurants = categorizeRestaurants(restaurants);
        
        // 가상 별점 부여 및 필터링
        const allPlaces = [...cafes, ...restaurants].map((place, index) => {
            const distance = place.distance || 0;
            const rating = calculateRating(distance, index);
            return { ...place, rating, type: cafes.includes(place) ? 'cafe' : 'restaurant' };
        }).filter(place => place.rating >= minRating);
        
        if (allPlaces.length > 0) {
            // 지도 표시
            mapDiv.style.display = 'block';
            displayMap(coords, allPlaces, categorizedRestaurants);
            
            // 검색 조건 표시
            content.innerHTML = `
                <div style="background: #f0f7ff; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #1976d2;">
                        📍 <strong>${meetingData.location}</strong> 기준 
                        | 반경 ${radius >= 1000 ? (radius/1000) + 'km' : radius + 'm'} 
                        | 최소 ${minRating}점 이상 
                        | 총 ${allPlaces.length}개
                    </p>
                </div>
            `;
            
            // 카페 목록
            const cafeList = allPlaces.filter(p => p.type === 'cafe');
            if (cafeList.length > 0) {
                content.innerHTML += '<h4 style="margin: 16px 0 12px 0; color: #1976d2;">☕ 카페 (' + cafeList.length + '개)</h4>';
                content.innerHTML += cafeList.map((place, index) => createRestaurantCard(place, index)).join('');
            }
            
            // 식당 목록 (카테고리별)
            const restaurantList = allPlaces.filter(p => p.type === 'restaurant');
            if (restaurantList.length > 0) {
                content.innerHTML += '<h4 style="margin: 16px 0 12px 0; color: #e74c3c;">🍽️ 식당 (' + restaurantList.length + '개)</h4>';
                
                // 카테고리별로 그룹화
                const grouped = {};
                restaurantList.forEach(place => {
                    const category = place.category || '기타';
                    if (!grouped[category]) grouped[category] = [];
                    grouped[category].push(place);
                });
                
                Object.entries(grouped).forEach(([category, places]) => {
                    content.innerHTML += `<h5 style="margin: 12px 0 8px 0; color: #666;">${getCategoryIcon(category)} ${category}</h5>`;
                    content.innerHTML += places.map((place, index) => createRestaurantCard(place, index)).join('');
                });
            }
            
            showToast('맛집 검색 완료!', 'success');
        } else {
            content.innerHTML = '<p style="color: #999;">🍽️ 조건에 맞는 맛집을 찾을 수 없습니다. 검색 조건을 변경해보세요.</p>';
        }
        
    } catch (error) {
        console.error('맛집 로드 오류:', error);
        content.innerHTML = '<p style="color: #e74c3c;">⚠️ 맛집 정보를 가져오는데 실패했습니다. 위치 정보를 확인해주세요.</p>';
    }
}

// 장소 검색 헬퍼 함수
function searchPlaces(ps, keyword, coords, radius, count) {
    return new Promise((resolve) => {
        ps.keywordSearch(keyword, function(data, status) {
            if (status === kakao.maps.services.Status.OK) {
                resolve(data.slice(0, count));
            } else {
                resolve([]);
            }
        }, {
            location: new kakao.maps.LatLng(coords.lat, coords.lng),
            radius: radius,
            sort: kakao.maps.services.SortBy.DISTANCE
        });
    });
}

// 식당 카테고리 분류
function categorizeRestaurants(restaurants) {
    return restaurants.map(place => {
        const categoryName = place.category_name || '';
        let category = '기타';
        
        if (categoryName.includes('한식')) category = '한식';
        else if (categoryName.includes('일식') || categoryName.includes('초밥') || categoryName.includes('라멘')) category = '일식';
        else if (categoryName.includes('중식')) category = '중식';
        else if (categoryName.includes('양식') || categoryName.includes('이탈리안') || categoryName.includes('스테이크')) category = '양식';
        else if (categoryName.includes('카페') || categoryName.includes('커피')) category = '카페';
        
        return { ...place, category };
    });
}

// 가상 별점 계산
function calculateRating(distance, rank) {
    const distanceScore = Math.max(1, 5 - (distance / 200));
    const rankScore = Math.max(1, 5 - (rank / 5));
    return Math.min(5, Math.round((distanceScore + rankScore) / 2));
}

// 카테고리 아이콘
function getCategoryIcon(category) {
    const icons = {
        '한식': '🍚',
        '일식': '🍱',
        '중식': '🥟',
        '양식': '🍝',
        '카페': '☕',
        '기타': '🍽️'
    };
    return icons[category] || '🍽️';
}

// 맛집 카드 생성
function createRestaurantCard(place, index) {
    const distance = place.distance ? `${place.distance}m` : '-';
    const walkingTime = place.distance ? `도보 ${Math.ceil(place.distance / 67)}분` : '';
    const stars = '⭐'.repeat(place.rating);
    
    return `
        <div class="restaurant-mini-card" id="place-${index}" style="cursor: pointer;" onclick="focusMarker(${index})">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h4 style="margin: 0 0 8px 0;">${index + 1}. ${escapeHtml(place.place_name)}</h4>
                <span style="font-size: 14px;">${stars}</span>
            </div>
            <p style="margin: 4px 0; color: #3498db; font-size: 13px;">🚶 ${distance} (${walkingTime})</p>
            <p style="margin: 4px 0; font-size: 13px;">📍 ${escapeHtml(place.road_address_name || place.address_name)}</p>
            ${place.phone ? `<p style="margin: 4px 0; font-size: 13px;">📞 ${escapeHtml(place.phone)}</p>` : ''}
            ${place.place_url ? `<a href="${place.place_url}" target="_blank" style="color: #1976d2; font-size: 13px; text-decoration: none;">상세보기 →</a>` : ''}
        </div>
    `;
}

// 지도 표시
function displayMap(centerCoords, places, categorizedPlaces) {
    const mapContainer = document.getElementById('restaurantMap');
    const mapOption = {
        center: new kakao.maps.LatLng(centerCoords.lat, centerCoords.lng),
        level: 5
    };
    
    const map = new kakao.maps.Map(mapContainer, mapOption);
    
    // 중심 마커 (고객사 위치)
    const centerMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(centerCoords.lat, centerCoords.lng),
        map: map
    });
    
    const centerInfowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding: 8px; font-size: 12px; font-weight: bold;">📍 ${meetingData.location}</div>`
    });
    centerInfowindow.open(map, centerMarker);
    
    // 맛집 마커들
    const markers = [];
    const linePath = [new kakao.maps.LatLng(centerCoords.lat, centerCoords.lng)];
    
    places.forEach((place, index) => {
        const position = new kakao.maps.LatLng(place.y, place.x);
        linePath.push(position);
        
        // 마커 색상 (카페: 파랑, 한식: 빨강, 일식: 주황, 중식: 노랑, 기타: 회색)
        const markerColor = place.type === 'cafe' ? '#3498db' : 
                           place.category === '한식' ? '#e74c3c' :
                           place.category === '일식' ? '#e67e22' :
                           place.category === '중식' ? '#f39c12' : '#95a5a6';
        
        const markerContent = `
            <div style="
                background: ${markerColor};
                color: white;
                padding: 6px 10px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                cursor: pointer;
            ">${index + 1}</div>
        `;
        
        const customOverlay = new kakao.maps.CustomOverlay({
            position: position,
            content: markerContent,
            yAnchor: 1
        });
        
        customOverlay.setMap(map);
        markers.push({ overlay: customOverlay, place: place, index: index });
        
        // 마커 클릭 이벤트
        const markerElement = customOverlay.a;
        if (markerElement) {
            markerElement.onclick = function() {
                const card = document.getElementById(`place-${index}`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.background = '#fff3cd';
                    setTimeout(() => { card.style.background = ''; }, 2000);
                }
            };
            
            // 마우스 오버 시 정보 표시
            const infowindow = new kakao.maps.InfoWindow({
                content: `<div style="padding: 8px; font-size: 11px; white-space: nowrap;">
                    <strong>${place.place_name}</strong><br>
                    ${place.road_address_name || place.address_name}<br>
                    🚶 ${place.distance}m
                </div>`
            });
            
            markerElement.onmouseover = function() {
                infowindow.open(map, customOverlay);
            };
            
            markerElement.onmouseout = function() {
                infowindow.close();
            };
        }
    });
    
    // 동선 표시 (폴리라인)
    const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#3498db',
        strokeOpacity: 0.7,
        strokeStyle: 'dashed'
    });
    polyline.setMap(map);
    
    // 지도 범위 재설정
    const bounds = new kakao.maps.LatLngBounds();
    linePath.forEach(point => bounds.extend(point));
    map.setBounds(bounds);
    
    // 전역 변수로 저장 (focusMarker에서 사용)
    window.restaurantMarkers = markers;
    window.restaurantMap = map;
}

// 마커 포커스
function focusMarker(index) {
    if (!window.restaurantMarkers || !window.restaurantMap) return;
    
    const marker = window.restaurantMarkers.find(m => m.index === index);
    if (marker) {
        const position = new kakao.maps.LatLng(marker.place.y, marker.place.x);
        window.restaurantMap.setCenter(position);
        window.restaurantMap.setLevel(3);
    }
}

// 좌표 가져오기
function getCoordinates(address) {
    return new Promise((resolve, reject) => {
        const ps = new kakao.maps.services.Places();
        
        ps.keywordSearch(address, function(data, status) {
            if (status === kakao.maps.services.Status.OK && data.length > 0) {
                resolve({
                    lat: parseFloat(data[0].y),
                    lng: parseFloat(data[0].x)
                });
            } else {
                const geocoder = new kakao.maps.services.Geocoder();
                geocoder.addressSearch(address, function(result, status) {
                    if (status === kakao.maps.services.Status.OK) {
                        resolve({
                            lat: parseFloat(result[0].y),
                            lng: parseFloat(result[0].x)
                        });
                    } else {
                        reject(new Error('위치를 찾을 수 없습니다.'));
                    }
                });
            }
        });
    });
}

// 추가 웹 검색
async function performAdditionalSearch() {
    const query = document.getElementById('additionalSearch').value.trim();
    
    if (!query) {
        showToast('검색어를 입력해주세요.', 'error');
        return;
    }
    
    const results = document.getElementById('webSearchResults');
    results.innerHTML = '<div class="spinner"></div>';
    
    try {
        const searchPrompt = `"${query}"에 대해 간단히 설명해주세요.`;
        const answer = await callGeminiAPI(searchPrompt);
        
        results.innerHTML = `
            <div class="info-box" style="margin-top: 16px;">
                <h4>🔍 "${escapeHtml(query)}" 검색 결과</h4>
                <p style="margin-top: 12px; line-height: 1.6; white-space: pre-line;">${answer}</p>
            </div>
        `;
    } catch (error) {
        console.error('웹 검색 오류:', error);
        results.innerHTML = '<p style="color: #e74c3c;">검색에 실패했습니다.</p>';
    }
}

// Gemini API 호출 (Grounding with Google Search 사용)
async function callGeminiAPIWithGrounding(prompt, retryCount = 0) {
    try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        const listData = await listResponse.json();
        const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
        const model = availableModels[0];
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{
                    googleSearchRetrieval: {
                        dynamicRetrievalConfig: {
                            mode: "MODE_DYNAMIC",
                            dynamicThreshold: 0.3
                        }
                    }
                }]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // 할당량 초과 오류 처리
            if (response.status === 429 && retryCount < 2) {
                const retryAfter = errorData.error?.message?.match(/retry in ([\d.]+)s/);
                const waitTime = retryAfter ? Math.ceil(parseFloat(retryAfter[1])) : 5;
                
                console.log(`API 할당량 초과. ${waitTime}초 후 재시도... (${retryCount + 1}/2)`);
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                return callGeminiAPIWithGrounding(prompt, retryCount + 1);
            }
            
            throw new Error(errorData.error?.message || 'API 호출 실패');
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API 오류:', error);
        
        if (error.message.includes('quota') || error.message.includes('429')) {
            return '⚠️ API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
        }
        
        return '⚠️ 정보를 가져올 수 없습니다. 네트워크 연결을 확인해주세요.';
    }
}

// Gemini API 호출 (기본)
async function callGeminiAPI(prompt, retryCount = 0) {
    try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        const listData = await listResponse.json();
        const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
        const model = availableModels[0];
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // 할당량 초과 오류 처리
            if (response.status === 429 && retryCount < 2) {
                const retryAfter = errorData.error?.message?.match(/retry in ([\d.]+)s/);
                const waitTime = retryAfter ? Math.ceil(parseFloat(retryAfter[1])) : 5;
                
                console.log(`API 할당량 초과. ${waitTime}초 후 재시도... (${retryCount + 1}/2)`);
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                return callGeminiAPI(prompt, retryCount + 1);
            }
            
            throw new Error(errorData.error?.message || 'API 호출 실패');
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API 오류:', error);
        
        if (error.message.includes('quota') || error.message.includes('429')) {
            return '⚠️ API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
        }
        
        return '⚠️ 정보를 가져올 수 없습니다. 네트워크 연결을 확인해주세요.';
    }
}

// 회의록 녹음 관련 변수
let recognition = null;
let isRecording = false;
let recordingStartTime = null;
let recordingInterval = null;
let fullTranscript = '';

// 녹음 토글
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// 녹음 시작
function startRecording() {
    // Web Speech API 지원 확인
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.', 'error');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    fullTranscript = '';
    
    recognition.onstart = () => {
        console.log('녹음 시작됨');
        isRecording = true;
        recordingStartTime = Date.now();
        
        // UI 업데이트
        document.getElementById('recordBtn').classList.add('recording');
        document.getElementById('recordIcon').textContent = '⏹️';
        document.getElementById('recordText').textContent = '녹음 중지';
        document.getElementById('recordingStatus').style.display = 'block';
        document.getElementById('transcriptContent').style.display = 'block';
        document.getElementById('transcriptText').textContent = '(말씀하세요...)';
        
        // 녹음 시간 표시
        recordingInterval = setInterval(updateRecordingTime, 1000);
        
        showToast('녹음이 시작되었습니다. 말씀해주세요.', 'success');
    };
    
    recognition.onresult = (event) => {
        console.log('음성 인식 결과:', event.results);
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            console.log(`결과 ${i}:`, transcript, '(final:', event.results[i].isFinal, ')');
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + '\n';
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            fullTranscript += finalTranscript;
            console.log('전체 텍스트 길이:', fullTranscript.length);
        }
        
        // 실시간 텍스트 표시
        const transcriptText = document.getElementById('transcriptText');
        const displayText = fullTranscript + (interimTranscript ? `[${interimTranscript}]` : '');
        transcriptText.textContent = displayText || '(말씀하세요...)';
        
        // 자동 스크롤
        const transcriptContent = document.getElementById('transcriptContent');
        transcriptContent.scrollTop = transcriptContent.scrollHeight;
    };
    
    recognition.onerror = (event) => {
        console.error('음성 인식 오류:', event.error, event);
        
        if (event.error === 'no-speech') {
            showToast('음성이 감지되지 않습니다. 마이크를 확인하고 다시 시도해주세요.', 'error');
        } else if (event.error === 'not-allowed') {
            showToast('마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.', 'error');
            stopRecording();
        } else if (event.error === 'audio-capture') {
            showToast('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.', 'error');
            stopRecording();
        } else {
            showToast('음성 인식 오류: ' + event.error, 'error');
        }
    };
    
    recognition.onend = () => {
        console.log('음성 인식 종료, isRecording:', isRecording);
        
        if (isRecording) {
            // 자동으로 재시작 (continuous 모드)
            console.log('음성 인식 재시작 시도...');
            try {
                recognition.start();
            } catch (e) {
                console.log('재시작 오류:', e);
            }
        }
    };
    
    try {
        console.log('음성 인식 시작 시도...');
        recognition.start();
    } catch (error) {
        console.error('녹음 시작 오류:', error);
        showToast('녹음을 시작할 수 없습니다: ' + error.message, 'error');
    }
}

// 녹음 중지
function stopRecording() {
    console.log('녹음 중지, 전체 텍스트 길이:', fullTranscript.length);
    console.log('전체 텍스트:', fullTranscript);
    
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    
    isRecording = false;
    
    // UI 업데이트
    document.getElementById('recordBtn').classList.remove('recording');
    document.getElementById('recordIcon').textContent = '🎙️';
    document.getElementById('recordText').textContent = '녹음 시작';
    document.getElementById('recordingStatus').style.display = 'none';
    
    // 녹음 시간 타이머 중지
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    
    // 회의록 생성 버튼 표시
    const trimmedTranscript = fullTranscript.trim();
    console.log('정리된 텍스트 길이:', trimmedTranscript.length);
    
    if (trimmedTranscript.length > 0) {
        document.getElementById('minutesActions').style.display = 'block';
        showToast(`녹음이 완료되었습니다. (${trimmedTranscript.length}자)`, 'success');
    } else {
        showToast('녹음된 내용이 없습니다. 마이크가 제대로 작동하는지 확인해주세요.', 'error');
        document.getElementById('transcriptText').textContent = '녹음된 내용이 없습니다.';
    }
}

// 녹음 시간 업데이트
function updateRecordingTime() {
    if (!recordingStartTime) return;
    
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('recordingTime').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 회의록 생성 및 다운로드
async function generateMinutes() {
    if (!fullTranscript.trim()) {
        showToast('녹음된 내용이 없습니다.', 'error');
        return;
    }
    
    showLoading('회의록 생성 중...');
    
    try {
        // Gemini API로 회의록 정리
        const prompt = `다음은 회의 녹음을 텍스트로 변환한 내용입니다. 이를 정리된 회의록 형식으로 작성해주세요.

회의록 형식:
1. 회의 개요
2. 주요 논의 사항
3. 결정 사항
4. 향후 조치 사항

녹음 내용:
${fullTranscript}

위 내용을 바탕으로 전문적인 회의록을 작성해주세요.`;
        
        const minutes = await callGeminiAPI(prompt);
        
        // 회의록 다운로드
        const meetingDate = meetingData.date || new Date().toISOString().split('T')[0];
        const customerName = meetingData.customer || '고객사';
        const filename = `회의록_${customerName}_${meetingDate}.txt`;
        
        const content = `
========================================
회의록
========================================

날짜: ${meetingDate}
고객사: ${customerName}
장소: ${meetingData.location || '-'}

========================================

${minutes}

========================================
원본 녹음 텍스트
========================================

${fullTranscript}

========================================
`;
        
        // 파일 다운로드
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('회의록이 다운로드되었습니다!', 'success');
        
    } catch (error) {
        console.error('회의록 생성 오류:', error);
        hideLoading();
        showToast('회의록 생성에 실패했습니다.', 'error');
    }
}

// 이메일로 전체 내용 전송 (Gmail API 사용)
async function sendEmailReport() {
    showLoading('이메일 생성 중...');
    
    try {
        // 모든 내용 수집
        const news = document.getElementById('newsContent').innerText || '조회되지 않음';
        const emailSummary = document.getElementById('emailContent').innerText || '조회되지 않음';
        const calendarInfo = document.getElementById('calendarContent').innerText || '조회되지 않음';
        const restaurants = document.getElementById('restaurantContent').innerText || '조회되지 않음';
        
        // HTML 형식의 이메일 본문 생성
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .header p { margin: 0; opacity: 0.9; font-size: 14px; }
        .section { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #667eea; }
        .section h2 { margin: 0 0 15px 0; color: #667eea; font-size: 20px; }
        .section-content { background: white; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; margin-top: 30px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
        .info-item { background: white; padding: 12px; border-radius: 8px; }
        .info-label { font-weight: 600; color: #666; font-size: 13px; margin-bottom: 4px; }
        .info-value { color: #333; font-size: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 미팅 준비 보고서</h1>
        <p>자동 생성된 미팅 준비 자료입니다</p>
    </div>
    
    <div class="section">
        <h2>📅 미팅 정보</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">날짜</div>
                <div class="info-value">${meetingData.date}</div>
            </div>
            <div class="info-item">
                <div class="info-label">시간</div>
                <div class="info-value">${meetingData.time}</div>
            </div>
            <div class="info-item">
                <div class="info-label">장소</div>
                <div class="info-value">${meetingData.location}</div>
            </div>
            <div class="info-item">
                <div class="info-label">고객사</div>
                <div class="info-value">${meetingData.customer}</div>
            </div>
        </div>
        ${meetingData.purpose ? `
            <div class="info-item">
                <div class="info-label">미팅 목적</div>
                <div class="info-value">${meetingData.purpose}</div>
            </div>
        ` : ''}
    </div>
    
    <div class="section">
        <h2>📰 최신 뉴스</h2>
        <div class="section-content">${news.replace(/\n/g, '<br>')}</div>
    </div>
    
    <div class="section">
        <h2>📧 관련 이메일 요약</h2>
        <div class="section-content">${emailSummary.replace(/\n/g, '<br>')}</div>
    </div>
    
    <div class="section">
        <h2>📅 캘린더 일정</h2>
        <div class="section-content">${calendarInfo.replace(/\n/g, '<br>')}</div>
    </div>
    
    <div class="section">
        <h2>🍽️ 주변 맛집</h2>
        <div class="section-content">${restaurants.replace(/\n/g, '<br>')}</div>
    </div>
    
    <div class="footer">
        <p>이 보고서는 미팅 준비 시스템에서 자동으로 생성되었습니다.</p>
        <p>생성 시간: ${new Date().toLocaleString('ko-KR')}</p>
    </div>
</body>
</html>
        `;
        
        const subject = `[미팅 준비] ${meetingData.customer} - ${meetingData.date}`;
        
        // 서버로 이메일 전송 요청
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: subject,
                body: emailBody
            })
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (response.ok) {
            showToast(`✅ 이메일이 ${data.recipient}로 전송되었습니다!`, 'success');
            
            // 성공 알림
            setTimeout(() => {
                alert(`📧 미팅 준비 보고서가 전송되었습니다!\n\n수신자: ${data.recipient}\n\nGmail에서 확인하세요.`);
            }, 500);
        } else {
            throw new Error(data.detail || '이메일 전송 실패');
        }
        
    } catch (error) {
        console.error('이메일 전송 오류:', error);
        hideLoading();
        showToast('이메일 전송에 실패했습니다: ' + error.message, 'error');
    }
}

// 전체 초기화
function resetAll() {
    if (confirm('모든 내용을 초기화하고 새로 시작하시겠습니까?')) {
        document.getElementById('resultsContainer').style.display = 'none';
        document.getElementById('meetingDate').valueAsDate = new Date();
        document.getElementById('meetingTime').value = '';
        document.getElementById('meetingLocation').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('meetingPurpose').value = '';
        meetingData = {};
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 로딩 표시
function showLoading(message) {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// 토스트 메시지
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
