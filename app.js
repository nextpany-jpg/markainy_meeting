// 전역 변수
let isAuthenticated = false;
let currentEmails = [];
let geminiApiKey = localStorage.getItem('gemini_api_key') || '';
let allEmailsCache = null; // 전체 이메일 캐시

// 페이지 로드 시 인증 상태 확인
window.addEventListener('DOMContentLoaded', async () => {
    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    
    if (authStatus === 'success') {
        showToast('Gmail 인증이 완료되었습니다!', 'success');
        window.history.replaceState({}, document.title, '/');
    } else if (authStatus === 'error') {
        showToast('Gmail 인증에 실패했습니다. 다시 시도해주세요.', 'error');
        window.history.replaceState({}, document.title, '/');
    }
    
    // 날짜 기본값 설정 (최근 30일)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('endDate').valueAsDate = today;
    document.getElementById('startDate').valueAsDate = thirtyDaysAgo;
    
    // 저장된 Gemini API 키 불러오기
    if (geminiApiKey) {
        document.getElementById('geminiKey').value = geminiApiKey;
    }
    
    // 인증 상태 확인
    await checkAuthStatus();
});

// 인증 상태 확인
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.authenticated) {
            isAuthenticated = true;
            showAuthenticatedUI();
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
        
        // 새 창에서 인증 페이지 열기
        window.location.href = data.url;
    } catch (error) {
        console.error('인증 URL 가져오기 오류:', error);
        showToast('인증 URL을 가져오는데 실패했습니다.', 'error');
    }
}

// 인증 완료 후 UI 업데이트
function showAuthenticatedUI() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    
    const authStatus = document.getElementById('authStatus');
    authStatus.textContent = '✅ Gmail 계정이 연동되었습니다';
    authStatus.className = 'auth-status success';
}

// 검색 처리
async function handleSearch(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('customerName').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!customerName) {
        showToast('고객사명을 입력해주세요.', 'error');
        return;
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        showToast('시작일이 종료일보다 늦을 수 없습니다.', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/search-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                customerName,
                startDate,
                endDate
            })
        });
        
        if (!response.ok) {
            throw new Error('메일 검색 실패');
        }
        
        const data = await response.json();
        currentEmails = data.emails;
        
        displayResults(data.emails, customerName);
        
        if (data.emails.length === 0) {
            showToast('검색 결과가 없습니다.', 'error');
        } else {
            showToast(`${data.emails.length}개의 관련 메일을 찾았습니다.`, 'success');
        }
        
    } catch (error) {
        console.error('검색 오류:', error);
        hideLoading();
        showToast('메일 검색 중 오류가 발생했습니다.', 'error');
    }
}

// 결과 표시
function displayResults(emails, customerName) {
    hideLoading();
    
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('statisticsSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'block';
    
    // 통계 업데이트
    document.getElementById('totalEmails').textContent = emails.length;
    document.getElementById('customerInfo').textContent = customerName;
    
    if (emails.length > 0) {
        const dates = emails.map(e => new Date(e.date)).sort((a, b) => a - b);
        const startDate = formatDate(dates[0]);
        const endDate = formatDate(dates[dates.length - 1]);
        document.getElementById('dateRange').textContent = `${startDate} ~ ${endDate}`;
    } else {
        document.getElementById('dateRange').textContent = '-';
    }
    
    // 메일 목록 표시
    const emailList = document.getElementById('emailList');
    emailList.innerHTML = '';
    
    if (emails.length === 0) {
        emailList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                검색 결과가 없습니다.
            </div>
        `;
        return;
    }
    
    emails.forEach((email, index) => {
        const emailCard = document.createElement('div');
        emailCard.className = 'email-card';
        
        const attachmentBadge = email.hasAttachment ? 
            '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">📎 첨부파일</span>' : '';
        
        const viewButton = email.hasAttachment ? 
            `<button class="btn btn-analyze" onclick="viewAttachment(${index})" style="margin-top: 12px; width: 100%;">
                <span>📊</span> 첨부파일 보기 및 AI 분석
            </button>` : '';
        
        emailCard.innerHTML = `
            <div class="email-header">
                <div style="flex: 1;">
                    <div class="email-subject">
                        ${escapeHtml(email.subject)}
                        ${attachmentBadge}
                    </div>
                    <div class="email-from">보낸 사람: ${escapeHtml(email.from)}</div>
                </div>
                <div class="email-date">${formatDateTime(email.date)}</div>
            </div>
            <div class="email-snippet">${escapeHtml(email.snippet)}</div>
            ${viewButton}
        `;
        emailList.appendChild(emailCard);
    });
    
    // 결과 섹션으로 스크롤
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 검색 초기화
function resetSearch() {
    document.getElementById('customerName').value = '';
    
    // 날짜 기본값으로 재설정
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('endDate').valueAsDate = today;
    document.getElementById('startDate').valueAsDate = thirtyDaysAgo;
    
    document.getElementById('statisticsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('attachmentSection').style.display = 'none';
    document.getElementById('analysisSection').style.display = 'none';
    currentEmails = [];
    showToast('검색이 초기화되었습니다.', 'success');
}

// 로딩 표시
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('statisticsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
}

// 로딩 숨김
function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 날짜 포맷팅
function formatDate(date) {
    return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\. /g, '-').replace('.', '');
}

// 날짜/시간 포맷팅
function formatDateTime(date) {
    return new Date(date).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 첨부파일 보기 및 AI 분석
async function viewAttachment(emailIndex) {
    const email = currentEmails[emailIndex];
    const customerName = document.getElementById('customerName').value.trim();
    
    if (!email || !email.hasAttachment) {
        showToast('첨부파일이 없습니다.', 'error');
        return;
    }

    // 첨부파일 내용 표시
    displayAttachment(email);

    // Gemini API 키 확인
    if (!geminiApiKey) {
        const apiKey = prompt('Gemini API 키를 입력하세요:\n\n(https://aistudio.google.com/app/apikey 에서 발급)');
        if (apiKey) {
            geminiApiKey = apiKey.trim();
            localStorage.setItem('gemini_api_key', geminiApiKey);
        } else {
            showToast('API 키 없이 첨부파일만 표시합니다.', 'error');
            return;
        }
    }

    // AI 분석 실행
    await analyzeWithGemini(email, customerName);
}

// 첨부파일 내용 표시
function displayAttachment(email) {
    const attachmentSection = document.getElementById('attachmentSection');
    const attachmentContent = document.getElementById('attachmentContent');
    
    attachmentContent.innerHTML = '';
    
    if (!email.attachmentData) {
        attachmentContent.innerHTML = `
            <div class="attachment-file">
                <h4>📄 ${email.attachments[0].filename}</h4>
                <p>첨부파일 정보:</p>
                <ul>
                    <li>파일명: ${email.attachments[0].filename}</li>
                    <li>타입: ${email.attachments[0].mimeType}</li>
                    <li>크기: ${formatFileSize(email.attachments[0].size)}</li>
                </ul>
                <p style="color: #999; margin-top: 12px;">첨부파일 내용을 파싱할 수 없습니다.</p>
            </div>
        `;
    } else if (email.attachmentData.type === 'csv') {
        // CSV 데이터를 테이블로 표시
        const data = email.attachmentData.data;
        const headers = email.attachmentData.headers;
        
        let tableHTML = `
            <div class="attachment-file">
                <h4>📄 ${email.attachments[0].filename}</h4>
                <div class="data-table-wrapper">
                    <table class="data-table-small">
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr>
                                    ${headers.map(h => `<td>${escapeHtml(String(row[h] || ''))}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        attachmentContent.innerHTML = tableHTML;
    } else {
        attachmentContent.innerHTML = `
            <div class="attachment-file">
                <h4>📄 ${email.attachments[0].filename}</h4>
                <pre>${JSON.stringify(email.attachmentData, null, 2)}</pre>
            </div>
        `;
    }
    
    attachmentSection.style.display = 'block';
    attachmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Gemini AI 분석
async function analyzeWithGemini(email, customerName) {
    const analysisSection = document.getElementById('analysisSection');
    const analysisResult = document.getElementById('analysisResult');
    
    analysisSection.style.display = 'block';
    analysisResult.innerHTML = '<div class="analysis-loading"><div class="spinner"></div><p>AI가 첨부파일을 분석하는 중...</p></div>';
    
    try {
        const response = await fetch('/api/analyze-with-gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attachmentData: email.attachmentData,
                customerName: customerName,
                geminiApiKey: geminiApiKey
            })
        });

        if (!response.ok) {
            throw new Error('AI 분석 실패');
        }

        const data = await response.json();
        const formattedAnalysis = formatAnalysisText(data.analysis);
        analysisResult.innerHTML = formattedAnalysis;
        
        showToast('AI 분석이 완료되었습니다!', 'success');
        analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Gemini API 오류:', error);
        analysisResult.innerHTML = `
            <p style="color: #f44336;">AI 분석 중 오류가 발생했습니다: ${error.message}</p>
            <p style="margin-top: 12px;">Gemini API 키를 확인하거나 다시 시도해주세요.</p>
        `;
        showToast('AI 분석 중 오류가 발생했습니다.', 'error');
    }
}

// 분석 텍스트 포맷팅
function formatAnalysisText(text) {
    if (!text) return '<p>분석 결과가 없습니다.</p>';
    
    // 마크다운 스타일 변환
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **굵게**
        .replace(/\*(.*?)\*/g, '<em>$1</em>'); // *기울임*
    
    // 단락 분리
    const paragraphs = formatted.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(para => {
        // 리스트 항목 처리
        if (para.includes('\n- ') || para.includes('\n* ')) {
            const lines = para.split('\n');
            const listItems = lines
                .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
                .map(line => `<li>${line.replace(/^[\-\*]\s*/, '').trim()}</li>`)
                .join('');
            
            if (listItems) {
                const beforeList = lines.filter(line => !line.trim().startsWith('-') && !line.trim().startsWith('*')).join('<br>');
                return (beforeList ? `<p>${beforeList}</p>` : '') + `<ul>${listItems}</ul>`;
            }
        }
        
        // 일반 단락
        return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 자연어 검색 처리
async function handleNaturalSearch() {
    const query = document.getElementById('naturalQuery').value.trim();
    
    if (!query) {
        showToast('질문을 입력해주세요.', 'error');
        return;
    }
    
    // Gemini API 키 확인
    let apiKey = document.getElementById('geminiKey').value.trim();
    
    if (!apiKey) {
        showToast('Gemini API 키를 입력해주세요.', 'error');
        document.getElementById('geminiKey').focus();
        return;
    }
    
    // API 키 저장
    geminiApiKey = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
    
    showLoading();
    
    try {
        // 키워드 기반으로 빠르게 판단 (API 호출 절약)
        const lowerQuery = query.toLowerCase();
        
        // 일정 등록 키워드
        if (lowerQuery.includes('일정') || lowerQuery.includes('캘린더') || lowerQuery.includes('등록')) {
            await handleCalendarRequest(query, '', apiKey);
            return;
        }
        
        // 웹 검색 키워드
        const webKeywords = ['날씨', '뉴스', '오늘', '최신', '현재', '지금', '어제', '내일', 
                            '맛집', '음식점', '식당', '카페', '추천', '여행', '관광', 
                            '가격', '시간', '영업', '위치', '주소', '전화번호'];
        const isWebSearch = webKeywords.some(keyword => lowerQuery.includes(keyword));
        
        // 이메일 검색 키워드
        const emailKeywords = ['고객사', '활동', '미팅', '방문', '보고서', 'gist', '이번달', '지난달'];
        const isEmailSearch = emailKeywords.some(keyword => lowerQuery.includes(keyword));
        
        if (isWebSearch && !isEmailSearch) {
            // 웹 검색
            await performWebSearch(query, apiKey);
        } else {
            // 이메일 검색 (기본값)
            await performEmailSearch(query, apiKey);
        }
        
    } catch (error) {
        console.error('자연어 검색 오류:', error);
        hideLoading();
        
        // 할당량 초과 오류 처리
        if (error.message && error.message.includes('quota')) {
            // 재시도 시간 추출
            const retryMatch = error.message.match(/retry in ([\d.]+)s/);
            const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 15;
            
            const analysisSection = document.getElementById('analysisSection');
            const analysisResult = document.getElementById('analysisResult');
            const analysisTitle = document.getElementById('analysisTitle');
            
            analysisSection.style.display = 'block';
            analysisTitle.textContent = '⏳ API 할당량 초과';
            analysisResult.innerHTML = `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-bottom: 12px;">⚠️ 잠시만 기다려주세요</h4>
                    <p style="color: #856404;">Gemini API 무료 할당량을 초과했습니다.</p>
                    <p style="margin-top: 12px; color: #856404;">
                        <strong>${retrySeconds}초 후</strong> 자동으로 다시 시도합니다...
                    </p>
                    <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 4px;">
                        <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
                            <strong>💡 팁:</strong> 무료 API는 분당 20회 제한이 있습니다.
                        </p>
                        <p style="font-size: 14px; color: #666;">
                            더 많이 사용하려면 
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #1976d2;">
                                새 API 키 발급
                            </a>
                        </p>
                    </div>
                </div>
            `;
            
            // 자동 재시도
            setTimeout(() => {
                analysisResult.innerHTML = '<div class="analysis-loading"><div class="spinner"></div><p>다시 시도하는 중...</p></div>';
                handleNaturalSearch();
            }, (retrySeconds + 1) * 1000);
            
        } else {
            showToast('검색 중 오류가 발생했습니다.', 'error');
        }
    }
}

// 검색 유형 판단 (제거 - 키워드 기반으로 변경)
// async function determineSearchType(query, apiKey) { ... }

// 웹 검색 수행
async function performWebSearch(query, apiKey) {
    const analysisSection = document.getElementById('analysisSection');
    const analysisResult = document.getElementById('analysisResult');
    const analysisTitle = document.getElementById('analysisTitle');
    const analysisSubtitle = document.getElementById('analysisSubtitle');
    
    hideLoading();
    
    analysisSection.style.display = 'block';
    analysisTitle.textContent = '🌐 웹 검색 결과';
    analysisSubtitle.textContent = `질문: "${query}"`;
    analysisResult.innerHTML = '<div class="analysis-loading"><div class="spinner"></div><p>웹에서 정보를 검색하는 중...</p></div>';
    
    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        // 서버에 웹 검색 요청
        const response = await fetch('/api/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, apiKey })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // 서버 오류 메시지 전달
            throw new Error(data.detail || data.error || '웹 검색 실패');
        }
        
        // 결과 표시
        const formattedAnalysis = formatAnalysisText(data.answer);
        analysisResult.innerHTML = `
            <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #4caf50;">
                <strong>💬 질문:</strong> ${escapeHtml(query)}
            </div>
            ${formattedAnalysis}
            ${data.sources && data.sources.length > 0 ? `
                <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
                    <h4 style="margin-bottom: 12px; color: #666;">📚 참고 자료</h4>
                    ${data.sources.map(source => `
                        <div style="margin-bottom: 8px;">
                            <a href="${source.url}" target="_blank" style="color: #1976d2; text-decoration: none;">
                                📄 ${escapeHtml(source.title)}
                            </a>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        showToast('웹 검색이 완료되었습니다!', 'success');
        
    } catch (error) {
        console.error('웹 검색 오류:', error);
        
        let errorMessage = error.message;
        let helpText = '다시 시도해주세요.';
        
        // 할당량 초과 오류 처리
        if (errorMessage.includes('quota') || errorMessage.includes('429')) {
            const retryMatch = errorMessage.match(/retry in ([\d.]+)s/);
            const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 15;
            
            analysisResult.innerHTML = `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-bottom: 12px;">⚠️ API 할당량 초과</h4>
                    <p style="color: #856404;">Gemini API 무료 할당량을 초과했습니다.</p>
                    <p style="margin-top: 12px; color: #856404;">
                        <strong>${retrySeconds}초 후</strong> 자동으로 다시 시도합니다...
                    </p>
                    <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 4px;">
                        <p style="font-size: 14px; color: #666;">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #1976d2;">
                                새 API 키 발급하기
                            </a>
                        </p>
                    </div>
                </div>
            `;
            
            // 자동 재시도
            setTimeout(() => {
                performWebSearch(query, apiKey);
            }, (retrySeconds + 1) * 1000);
            
            return;
        }
        
        analysisResult.innerHTML = `
            <p style="color: #f44336;">웹 검색 중 오류가 발생했습니다: ${escapeHtml(errorMessage)}</p>
            <p style="margin-top: 12px;">${helpText}</p>
        `;
        showToast('웹 검색 중 오류가 발생했습니다.', 'error');
    }
}

// 이메일 검색 수행 (기존 함수명 변경)
async function performEmailSearch(query, apiKey) {
    try {
        // 먼저 모든 이메일 가져오기 (캐시 사용)
        if (!allEmailsCache) {
            const response = await fetch('/api/search-emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    customerName: '',
                    startDate: document.getElementById('startDate').value,
                    endDate: document.getElementById('endDate').value
                })
            });
            
            if (!response.ok) {
                throw new Error('메일 검색 실패');
            }
            
            const data = await response.json();
            allEmailsCache = data.emails;
        }
        
        if (allEmailsCache.length === 0) {
            hideLoading();
            showToast('검색할 이메일이 없습니다.', 'error');
            return;
        }
        
        // Gemini AI로 자연어 검색
        await performNaturalLanguageSearch(query, allEmailsCache, apiKey);
        
    } catch (error) {
        console.error('이메일 검색 오류:', error);
        hideLoading();
        showToast('검색 중 오류가 발생했습니다.', 'error');
    }
}

// Gemini AI 자연어 검색 수행
async function performNaturalLanguageSearch(query, emails, apiKey) {
    const analysisSection = document.getElementById('analysisSection');
    const analysisResult = document.getElementById('analysisResult');
    const analysisTitle = document.getElementById('analysisTitle');
    const analysisSubtitle = document.getElementById('analysisSubtitle');
    
    hideLoading();
    
    // 섹션 표시
    document.getElementById('emptyState').style.display = 'none';
    analysisSection.style.display = 'block';
    
    analysisTitle.textContent = '🤖 AI 자연어 검색 결과';
    analysisSubtitle.textContent = `질문: "${query}"`;
    analysisResult.innerHTML = '<div class="analysis-loading"><div class="spinner"></div><p>AI가 이메일을 분석하는 중...</p></div>';
    
    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        // 먼저 사용 가능한 모델 목록 가져오기
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (!listResponse.ok) {
            throw new Error('API 키가 유효하지 않습니다. 새로 발급받아주세요.');
        }

        const listData = await listResponse.json();
        const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

        if (availableModels.length === 0) {
            throw new Error('사용 가능한 모델이 없습니다.');
        }

        console.log('사용 가능한 모델:', availableModels);

        // 첫 번째 사용 가능한 모델로 시도
        const model = availableModels[0];
        console.log('선택된 모델:', model);
        
        // 이메일 데이터를 텍스트로 변환
        const emailsText = emails.map((email, index) => {
            let text = `[메일 ${index + 1}]\n`;
            text += `제목: ${email.subject}\n`;
            text += `날짜: ${new Date(email.date).toLocaleDateString('ko-KR')}\n`;
            text += `내용: ${email.snippet}\n`;
            
            if (email.attachmentData) {
                text += `첨부파일: ${JSON.stringify(email.attachmentData, null, 2)}\n`;
            }
            
            return text;
        }).join('\n---\n\n');

        const prompt = `다음은 GIST 활동결과 이메일 데이터입니다.

사용자 질문: "${query}"

이메일 데이터:
${emailsText}

위 이메일 데이터를 분석하여 사용자의 질문에 대해 다음 형식으로 답변해주세요:

1. 질문에 대한 직접적인 답변
2. 관련된 주요 정보 (날짜, 고객사, 활동 내역 등)
3. 추가 인사이트 (있다면)

답변은 명확하고 구체적으로 작성해주세요. 관련 정보가 없다면 "관련 정보를 찾을 수 없습니다"라고 답변해주세요.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API 오류 상세:', errorData);
            throw new Error(`Gemini API 호출 실패 (${response.status}): ${errorData.error?.message || '알 수 없는 오류'}`);
        }

        const data = await response.json();
        
        // 응답 데이터 검증
        if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.error('Gemini API 응답 형식 오류:', data);
            throw new Error('AI 응답 형식이 올바르지 않습니다.');
        }
        
        const analysisText = data.candidates[0].content.parts[0].text;
        
        // 일정 등록 요청인지 확인
        if (query.includes('일정') || query.includes('캘린더') || query.includes('등록')) {
            await handleCalendarRequest(query, analysisText, apiKey);
            return;
        }
        
        // 결과 표시
        const formattedAnalysis = formatAnalysisText(analysisText);
        analysisResult.innerHTML = `
            <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #2196f3;">
                <strong>💬 질문:</strong> ${escapeHtml(query)}
            </div>
            ${formattedAnalysis}
        `;
        
        showToast('AI 분석이 완료되었습니다!', 'success');
        
        // 관련 이메일도 표시
        displayRelatedEmails(emails);
        
    } catch (error) {
        console.error('Gemini API 오류:', error);
        analysisResult.innerHTML = `
            <p style="color: #f44336;">AI 분석 중 오류가 발생했습니다: ${error.message}</p>
            <p style="margin-top: 12px;">Gemini API 키를 확인하거나 다시 시도해주세요.</p>
        `;
        showToast('AI 분석 중 오류가 발생했습니다.', 'error');
    }
}

// 관련 이메일 표시
function displayRelatedEmails(emails) {
    const resultsSection = document.getElementById('resultsSection');
    const emailList = document.getElementById('emailList');
    
    currentEmails = emails;
    
    resultsSection.style.display = 'block';
    emailList.innerHTML = '';
    
    if (emails.length === 0) {
        emailList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                관련 이메일이 없습니다.
            </div>
        `;
        return;
    }
    
    // 최대 5개만 표시
    const displayEmails = emails.slice(0, 5);
    
    displayEmails.forEach((email, index) => {
        const emailCard = document.createElement('div');
        emailCard.className = 'email-card';
        
        const attachmentBadge = email.hasAttachment ? 
            '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">📎 첨부파일</span>' : '';
        
        const viewButton = email.hasAttachment ? 
            `<button class="btn btn-analyze" onclick="viewAttachment(${index})" style="margin-top: 12px; width: 100%;">
                <span>📊</span> 첨부파일 보기
            </button>` : '';
        
        emailCard.innerHTML = `
            <div class="email-header">
                <div style="flex: 1;">
                    <div class="email-subject">
                        ${escapeHtml(email.subject)}
                        ${attachmentBadge}
                    </div>
                    <div class="email-from">보낸 사람: ${escapeHtml(email.from)}</div>
                </div>
                <div class="email-date">${formatDateTime(email.date)}</div>
            </div>
            <div class="email-snippet">${escapeHtml(email.snippet)}</div>
            ${viewButton}
        `;
        emailList.appendChild(emailCard);
    });
    
    if (emails.length > 5) {
        const moreInfo = document.createElement('div');
        moreInfo.style.textAlign = 'center';
        moreInfo.style.padding = '20px';
        moreInfo.style.color = '#666';
        moreInfo.innerHTML = `총 ${emails.length}개 중 5개를 표시하고 있습니다.`;
        emailList.appendChild(moreInfo);
    }
}

// 캘린더 일정 등록 처리
async function handleCalendarRequest(query, analysisText, apiKey) {
    const analysisSection = document.getElementById('analysisSection');
    const analysisResult = document.getElementById('analysisResult');
    const analysisTitle = document.getElementById('analysisTitle');
    const analysisSubtitle = document.getElementById('analysisSubtitle');
    
    hideLoading();
    
    analysisSection.style.display = 'block';
    analysisTitle.textContent = '📅 캘린더 일정 등록';
    analysisSubtitle.textContent = `요청: "${query}"`;
    analysisResult.innerHTML = '<div class="analysis-loading"><div class="spinner"></div><p>AI가 일정 정보를 추출하는 중...</p></div>';
    
    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        // 사용 가능한 모델 가져오기
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResponse.json();
        const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
        const model = availableModels[0];
        
        // AI에게 일정 정보 추출 요청
        const extractPrompt = `다음 요청에서 캘린더 일정 정보를 추출해주세요:

"${query}"

다음 JSON 형식으로만 답변해주세요 (다른 설명 없이):
{
  "summary": "일정 제목",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": 60,
  "location": "장소 (선택사항)",
  "description": "설명 (선택사항)"
}

예시:
- "3월 9일 오전 11시 인사혁신처" → {"summary":"인사혁신처 미팅","date":"2026-03-09","time":"11:00","duration":60}
- "내일 오후 2시 삼성전자 회의" → {"summary":"삼성전자 회의","date":"내일","time":"14:00","duration":60}`;

        const extractResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: extractPrompt }] }]
            })
        });
        
        if (!extractResponse.ok) {
            const errorData = await extractResponse.json().catch(() => ({}));
            
            // 429 오류 처리
            if (extractResponse.status === 429) {
                throw new Error('API_QUOTA_EXCEEDED');
            }
            
            throw new Error(errorData.error?.message || 'API 호출 실패');
        }
        
        const extractData = await extractResponse.json();
        
        // 응답 검증
        if (!extractData.candidates || !extractData.candidates[0] || 
            !extractData.candidates[0].content || !extractData.candidates[0].content.parts ||
            !extractData.candidates[0].content.parts[0]) {
            throw new Error('API 응답 형식 오류');
        }
        
        const extractedText = extractData.candidates[0].content.parts[0].text;
        
        // JSON 추출
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('일정 정보를 추출할 수 없습니다.');
        }
        
        const eventInfo = JSON.parse(jsonMatch[0]);
        
        // 날짜 처리
        let eventDate = eventInfo.date;
        if (eventDate === '내일') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            eventDate = tomorrow.toISOString().split('T')[0];
        } else if (eventDate === '오늘') {
            eventDate = new Date().toISOString().split('T')[0];
        }
        
        // 시작 시간 설정
        const startDateTime = `${eventDate}T${eventInfo.time}:00`;
        
        // 종료 시간 계산 (duration 분 추가)
        const [hours, minutes] = eventInfo.time.split(':').map(Number);
        const duration = eventInfo.duration || 60;
        
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        const endDateTime = `${eventDate}T${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;
        
        // 확인 UI 표시
        analysisResult.innerHTML = `
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="color: #1976d2; margin-bottom: 12px;">📅 일정 정보 확인</h4>
                <p><strong>제목:</strong> ${escapeHtml(eventInfo.summary)}</p>
                <p><strong>날짜:</strong> ${eventDate}</p>
                <p><strong>시간:</strong> ${eventInfo.time} (${eventInfo.duration || 60}분)</p>
                ${eventInfo.location ? `<p><strong>장소:</strong> ${escapeHtml(eventInfo.location)}</p>` : ''}
                ${eventInfo.description ? `<p><strong>설명:</strong> ${escapeHtml(eventInfo.description)}</p>` : ''}
            </div>
            <div class="button-group">
                <button class="btn btn-primary" id="confirmEventBtn">
                    <span>✅</span> 일정 등록
                </button>
                <button class="btn btn-secondary" onclick="document.getElementById('analysisSection').style.display='none'">
                    <span>❌</span> 취소
                </button>
            </div>
        `;
        
        // 이벤트 리스너 추가
        document.getElementById('confirmEventBtn').addEventListener('click', () => {
            confirmCalendarEvent(eventInfo, startDateTime, endDateTime);
        });
        
    } catch (error) {
        console.error('일정 추출 오류:', error);
        
        // API 할당량 오류 처리
        if (error.message === 'API_QUOTA_EXCEEDED' || error.message.includes('quota') || error.message.includes('429')) {
            analysisResult.innerHTML = `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-bottom: 12px;">⚠️ API 할당량 초과</h4>
                    <p style="color: #856404;">Gemini API 무료 할당량을 초과했습니다.</p>
                    <p style="margin-top: 12px; color: #856404;">
                        잠시 후 다시 시도하거나, 새 API 키를 발급받아주세요.
                    </p>
                    <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 4px;">
                        <p style="font-size: 14px; color: #666;">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #1976d2;">
                                새 API 키 발급하기
                            </a>
                        </p>
                    </div>
                </div>
            `;
            return;
        }
        
        analysisResult.innerHTML = `
            <p style="color: #f44336;">일정 정보를 추출할 수 없습니다: ${escapeHtml(error.message)}</p>
            <p style="margin-top: 12px;">다시 시도하거나 더 명확하게 입력해주세요.</p>
            <p style="margin-top: 8px; font-size: 14px; color: #666;">
                예: "3월 9일 오전 11시 인사혁신처 미팅 등록"
            </p>
        `;
    }
}

// 캘린더 일정 등록 확인
async function confirmCalendarEvent(eventInfo, startDateTime, endDateTime) {
    const analysisResult = document.getElementById('analysisResult');
    analysisResult.innerHTML = '<div class="analysis-loading"><div class="spinner"></div><p>구글 캘린더에 일정을 등록하는 중...</p></div>';
    
    try {
        const response = await fetch('/api/create-calendar-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: eventInfo.summary,
                description: eventInfo.description || '',
                startDateTime: startDateTime,
                endDateTime: endDateTime,
                location: eventInfo.location || ''
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // 상세 오류 메시지 표시
            throw new Error(data.detail || data.error || '일정 등록 실패');
        }
        
        analysisResult.innerHTML = `
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
                <h4 style="color: #155724; margin-bottom: 12px;">✅ 일정이 등록되었습니다!</h4>
                <p><strong>제목:</strong> ${escapeHtml(eventInfo.summary)}</p>
                <p><strong>시간:</strong> ${startDateTime.replace('T', ' ')}</p>
                <a href="${data.htmlLink}" target="_blank" class="btn btn-primary" style="margin-top: 12px; display: inline-block;">
                    <span>📅</span> 구글 캘린더에서 보기
                </a>
            </div>
        `;
        
        showToast('구글 캘린더에 일정이 등록되었습니다!', 'success');
        
    } catch (error) {
        console.error('일정 등록 오류:', error);
        
        let errorMessage = error.message;
        let helpText = 'Gmail 로그인 상태를 확인하거나 다시 시도해주세요.';
        
        // Calendar 권한 오류인 경우
        if (errorMessage.includes('Calendar 권한') || errorMessage.includes('permission')) {
            helpText = `
                <strong>해결 방법:</strong><br>
                1. 페이지 상단의 "Gmail 로그인" 버튼을 다시 클릭<br>
                2. 구글 계정 선택<br>
                3. <strong>"캘린더 관리" 권한 승인</strong> (새로 추가된 권한)<br>
                4. 다시 일정 등록 시도
            `;
        } else if (errorMessage.includes('Calendar API')) {
            helpText = `
                <strong>해결 방법:</strong><br>
                1. <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank">Google Cloud Console</a> 접속<br>
                2. Calendar API 검색 및 활성화<br>
                3. 다시 시도
            `;
        }
        
        analysisResult.innerHTML = `
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #f44336;">
                <h4 style="color: #721c24; margin-bottom: 12px;">❌ 일정 등록 실패</h4>
                <p style="color: #721c24;"><strong>오류:</strong> ${escapeHtml(errorMessage)}</p>
                <p style="margin-top: 12px; line-height: 1.6;">${helpText}</p>
                <details style="margin-top: 12px; font-size: 12px; color: #666;">
                    <summary>기술 세부정보 (개발자용)</summary>
                    <pre style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; overflow-x: auto;">${escapeHtml(JSON.stringify(error, null, 2))}</pre>
                </details>
            </div>
        `;
        showToast('일정 등록에 실패했습니다.', 'error');
    }
}


// 카카오 API를 사용한 맛집 검색
async function searchNearbyRestaurants() {
    const customerName = document.getElementById('customerName').value.trim();
    const minRating = parseInt(document.getElementById('minRating').value);
    const searchRadius = parseInt(document.getElementById('searchRadius').value);
    const maxResults = parseInt(document.getElementById('maxResults').value);
    
    if (!customerName) {
        showToast('고객사명을 먼저 입력해주세요.', 'error');
        return;
    }
    
    const restaurantSection = document.getElementById('restaurantSection');
    const restaurantList = document.getElementById('restaurantList');
    
    restaurantSection.style.display = 'block';
    restaurantList.innerHTML = '<div class="restaurant-loading">🔍 커피숍과 맛집을 검색하는 중...</div>';
    
    restaurantSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        // 고객사 위치 좌표 가져오기
        const coords = await getCustomerCoordinates(customerName);
        
        // 고객사 정보 저장
        window.currentCustomerLocation = coords;
        
        // 카카오 로컬 API로 커피숍과 맛집 검색
        const ps = new kakao.maps.services.Places();
        
        // 1. 커피숍 검색 (도보 거리 기준 가까운 순)
        let cafes = await searchPlaces(ps, '카페', coords, searchRadius);
        
        // 2. 식당 검색 (도보 거리 기준 가까운 순)
        let restaurants = await searchPlaces(ps, '맛집', coords, searchRadius);
        
        // 별점 필터링
        if (minRating > 0) {
            const ratingThreshold = minRating;
            
            cafes = cafes.filter((place, index) => {
                const virtualRating = calculateVirtualRating(place, index);
                return virtualRating >= ratingThreshold;
            });
            
            restaurants = restaurants.filter((place, index) => {
                const virtualRating = calculateVirtualRating(place, index);
                return virtualRating >= ratingThreshold;
            });
        }
        
        // 카테고리별로 분류
        const categorizedRestaurants = categorizeRestaurants(restaurants);
        
        displayRestaurantListWithRoute(cafes, categorizedRestaurants, customerName, coords, minRating, searchRadius, maxResults);
        
    } catch (error) {
        restaurantList.innerHTML = `<div class="restaurant-loading" style="color: #e74c3c;">오류: ${escapeHtml(error.message)}</div>`;
        showToast('맛집 검색 중 오류가 발생했습니다.', 'error');
    }
}

// 가상 별점 계산 (거리와 검색 순위 기반)
function calculateVirtualRating(place, index) {
    const distance = parseInt(place.distance);
    
    // 거리 점수 (가까울수록 높음)
    let distanceScore = 5;
    if (distance > 1000) distanceScore = 2;
    else if (distance > 500) distanceScore = 3;
    else if (distance > 300) distanceScore = 4;
    else if (distance > 100) distanceScore = 4.5;
    
    // 순위 점수 (상위 검색 결과일수록 높음)
    let rankScore = 5;
    if (index > 10) rankScore = 2;
    else if (index > 5) rankScore = 3;
    else if (index > 2) rankScore = 4;
    
    // 평균 점수
    return Math.round((distanceScore + rankScore) / 2);
}

// 장소 검색 Promise 래퍼
function searchPlaces(ps, keyword, coords, radius) {
    return new Promise((resolve, reject) => {
        ps.keywordSearch(keyword, function(data, status) {
            if (status === kakao.maps.services.Status.OK) {
                resolve(data);
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
    const categories = {
        korean: [],
        japanese: [],
        chinese: [],
        western: [],
        other: []
    };
    
    restaurants.forEach(place => {
        const category = place.category_name.toLowerCase();
        
        if (category.includes('한식') || category.includes('국밥') || category.includes('찌개')) {
            categories.korean.push(place);
        } else if (category.includes('일식') || category.includes('초밥') || category.includes('돈까스')) {
            categories.japanese.push(place);
        } else if (category.includes('중식') || category.includes('중국')) {
            categories.chinese.push(place);
        } else if (category.includes('양식') || category.includes('이탈리안') || category.includes('스테이크')) {
            categories.western.push(place);
        } else {
            categories.other.push(place);
        }
    });
    
    return categories;
}

// 고객사 위치 좌표 가져오기
function getCustomerCoordinates(customerName) {
    return new Promise((resolve, reject) => {
        const ps = new kakao.maps.services.Places();
        
        // 키워드 검색
        ps.keywordSearch(customerName, function(data, status) {
            if (status === kakao.maps.services.Status.OK && data.length > 0) {
                resolve({
                    lat: parseFloat(data[0].y),
                    lng: parseFloat(data[0].x),
                    address: data[0].road_address_name || data[0].address_name || customerName,
                    placeName: data[0].place_name,
                    phone: data[0].phone || null
                });
            } else {
                // 키워드 검색 실패시 주소 검색
                const geocoder = new kakao.maps.services.Geocoder();
                geocoder.addressSearch(customerName, function(result, status) {
                    if (status === kakao.maps.services.Status.OK) {
                        resolve({
                            lat: parseFloat(result[0].y),
                            lng: parseFloat(result[0].x),
                            address: result[0].address_name || result[0].road_address_name || customerName,
                            placeName: null,
                            phone: null
                        });
                    } else {
                        reject(new Error(`"${customerName}" 위치를 찾을 수 없습니다.`));
                    }
                });
            }
        });
    });
}

// 맛집 목록 표시 (카테고리별)
function displayRestaurantListWithRoute(cafes, categorizedRestaurants, customerName, customerLocation, minRating, searchRadius, maxResults) {
    const restaurantList = document.getElementById('restaurantList');
    
    // maxResults에 따라 카테고리별 개수 조정
    const perCategory = Math.ceil(maxResults / 4); // 4개 카테고리로 나눔
    
    // 전체 리스트 합치기
    const allPlaces = {
        cafes: cafes.slice(0, perCategory),
        korean: categorizedRestaurants.korean.slice(0, perCategory),
        japanese: categorizedRestaurants.japanese.slice(0, Math.ceil(perCategory / 2)),
        chinese: categorizedRestaurants.chinese.slice(0, Math.ceil(perCategory / 2))
    };
    
    // 고객사 정보 저장
    window.currentCustomerInfo = {
        name: customerName,
        location: customerLocation,
        cafes: allPlaces.cafes,
        restaurants: [
            ...allPlaces.korean,
            ...allPlaces.japanese,
            ...allPlaces.chinese
        ]
    };
    
    // 카카오맵 생성 (동선 포함)
    displayKakaoMapWithRoute(customerLocation, allPlaces);
    
    const radiusText = searchRadius >= 1000 ? `${searchRadius / 1000}km` : `${searchRadius}m`;
    const walkingTime = Math.ceil(searchRadius / 67);
    const ratingText = minRating > 0 ? ` (⭐${minRating}점 이상)` : '';
    
    let html = `
        <!-- 고객사 위치 정보 -->
        <div style="margin-bottom: 20px; padding: 20px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800;">
            <h4 style="margin: 0 0 12px 0; color: #e65100; font-size: 16px;">📍 고객사 위치</h4>
            <p style="margin: 0; color: #555; font-size: 15px;">
                <strong>${escapeHtml(customerLocation.placeName || customerName)}</strong>
            </p>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">
                ${escapeHtml(customerLocation.address)}
            </p>
            ${customerLocation.phone ? `
                <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">
                    📞 ${escapeHtml(customerLocation.phone)}
                </p>
            ` : ''}
        </div>
        
        <!-- 검색 조건 표시 -->
        <div style="margin-bottom: 20px; padding: 16px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1565c0; font-size: 14px;">
                📍 <strong>검색 반경:</strong> ${radiusText} (도보 약 ${walkingTime}분)
                ${minRating > 0 ? ` | ⭐ <strong>최소 별점:</strong> ${minRating}점 이상` : ''}
                | 📊 <strong>표시 개수:</strong> 최대 ${maxResults}개
            </p>
        </div>
        
        <!-- 공유 버튼 -->
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 20px;">
            <button onclick="shareViaEmail()" class="btn" style="background: #4CAF50; padding: 8px 16px; font-size: 14px;">
                <span>📧</span> 이메일
            </button>
            <button onclick="shareViaKakao()" class="btn" style="background: #FEE500; color: #000; padding: 8px 16px; font-size: 14px;">
                <span>💬</span> 카카오톡
            </button>
        </div>
    `;
    
    // 커피숍 섹션
    if (allPlaces.cafes.length > 0) {
        html += `
            <div style="margin-bottom: 24px;">
                <h3 style="color: #8B4513; margin-bottom: 16px; font-size: 18px;">
                    ☕ 커피숍 (도보 거리 가까운 순 ${allPlaces.cafes.length}곳)
                </h3>
                <div style="display: grid; gap: 12px;">
        `;
        
        allPlaces.cafes.forEach((place, index) => {
            html += createPlaceCard(place, index, 'cafe');
        });
        
        html += `</div></div>`;
    }
    
    // 한식 섹션
    if (allPlaces.korean.length > 0) {
        html += `
            <div style="margin-bottom: 24px;">
                <h3 style="color: #E53935; margin-bottom: 16px; font-size: 18px;">
                    🍚 한식 (도보 거리 가까운 순 ${allPlaces.korean.length}곳)
                </h3>
                <div style="display: grid; gap: 12px;">
        `;
        
        allPlaces.korean.forEach((place, index) => {
            html += createPlaceCard(place, index + allPlaces.cafes.length, 'korean');
        });
        
        html += `</div></div>`;
    }
    
    // 일식 섹션
    if (allPlaces.japanese.length > 0) {
        html += `
            <div style="margin-bottom: 24px;">
                <h3 style="color: #D32F2F; margin-bottom: 16px; font-size: 18px;">
                    🍱 일식 (도보 거리 가까운 순 ${allPlaces.japanese.length}곳)
                </h3>
                <div style="display: grid; gap: 12px;">
        `;
        
        allPlaces.japanese.forEach((place, index) => {
            html += createPlaceCard(place, index + allPlaces.cafes.length + allPlaces.korean.length, 'japanese');
        });
        
        html += `</div></div>`;
    }
    
    // 중식 섹션
    if (allPlaces.chinese.length > 0) {
        html += `
            <div style="margin-bottom: 24px;">
                <h3 style="color: #C62828; margin-bottom: 16px; font-size: 18px;">
                    🥟 중식 (도보 거리 가까운 순 ${allPlaces.chinese.length}곳)
                </h3>
                <div style="display: grid; gap: 12px;">
        `;
        
        allPlaces.chinese.forEach((place, index) => {
            html += createPlaceCard(place, index + allPlaces.cafes.length + allPlaces.korean.length + allPlaces.japanese.length, 'chinese');
        });
        
        html += `</div></div>`;
    }
    
    restaurantList.innerHTML = html;
    
    const totalCount = allPlaces.cafes.length + allPlaces.korean.length + allPlaces.japanese.length + allPlaces.chinese.length;
    showToast(`커피숍 ${allPlaces.cafes.length}곳, 식당 ${totalCount - allPlaces.cafes.length}곳을 찾았습니다!`, 'success');
}

// 장소 카드 생성
function createPlaceCard(place, index, type) {
    const distance = place.distance ? parseInt(place.distance) : 0;
    const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`;
    
    // 도보 시간 계산 (평균 도보 속도: 4km/h = 67m/min)
    const walkingMinutes = Math.ceil(distance / 67);
    const walkingTime = walkingMinutes < 1 ? '1분 미만' : `도보 약 ${walkingMinutes}분`;
    
    // 가상 별점 계산
    const rating = calculateVirtualRating(place, index);
    const stars = '⭐'.repeat(rating);
    
    const phone = place.phone || '전화번호 없음';
    const address = place.road_address_name || place.address_name;
    const category = place.category_name.split(' > ').pop();
    
    const typeColors = {
        cafe: '#8B4513',
        korean: '#E53935',
        japanese: '#D32F2F',
        chinese: '#C62828'
    };
    
    const typeEmojis = {
        cafe: '☕',
        korean: '🍚',
        japanese: '🍱',
        chinese: '🥟'
    };
    
    return `
        <div class="restaurant-card" id="restaurant-${index}" onmouseenter="highlightMarker(${index})" onmouseleave="unhighlightMarker(${index})">
            <div class="restaurant-header">
                <div style="flex: 1;">
                    <h3 class="restaurant-name">${typeEmojis[type]} ${index + 1}. ${escapeHtml(place.place_name)}</h3>
                    <div style="margin-top: 4px;">
                        <span style="color: #FFB300; font-size: 14px; margin-right: 8px;">${stars}</span>
                        <span class="restaurant-category" style="background: ${typeColors[type]}20; color: ${typeColors[type]};">${escapeHtml(category)}</span>
                        <span class="restaurant-distance" style="color: ${typeColors[type]}; font-weight: 600;">
                            🚶 ${distanceText} (${walkingTime})
                        </span>
                    </div>
                </div>
            </div>
            <div class="restaurant-info">
                📍 ${escapeHtml(address)}<br>
                📞 ${escapeHtml(phone)}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                ${place.place_url ? `
                    <a href="${place.place_url}" target="_blank" class="restaurant-link">
                        카카오맵에서 보기 →
                    </a>
                ` : ''}
                <button onclick="focusOnMarker(${index})" class="btn" style="background: #667eea; padding: 8px 16px; font-size: 13px; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    지도에서 보기
                </button>
            </div>
        </div>
    `;
}

// 카카오맵 표시 (동선 포함)
function displayKakaoMapWithRoute(customerLocation, allPlaces) {
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(customerLocation.lat, customerLocation.lng),
        level: 5 // 확대 레벨
    };
    
    const map = new kakao.maps.Map(mapContainer, mapOption);
    window.currentMap = map;
    window.currentMarkers = [];
    
    // 고객사 마커 (빨간색 - 출발점)
    const customerMarkerPosition = new kakao.maps.LatLng(customerLocation.lat, customerLocation.lng);
    const customerImageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
    const customerImageSize = new kakao.maps.Size(24, 35);
    const customerMarkerImage = new kakao.maps.MarkerImage(customerImageSrc, customerImageSize);
    
    const customerMarker = new kakao.maps.Marker({
        position: customerMarkerPosition,
        map: map,
        image: customerMarkerImage
    });
    
    // 고객사 인포윈도우
    const customerInfowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:10px;font-size:14px;font-weight:bold;color:#E53935;">🏢 ${customerLocation.placeName || '고객사'}</div>`
    });
    customerInfowindow.open(map, customerMarker);
    
    // 모든 장소 합치기
    const allPlacesList = [
        ...allPlaces.cafes,
        ...allPlaces.korean,
        ...allPlaces.japanese,
        ...allPlaces.chinese
    ];
    
    // 동선 경로 좌표
    const linePath = [customerMarkerPosition];
    
    // 장소별 마커 생성
    allPlacesList.forEach((place, index) => {
        const position = new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
        linePath.push(position);
        
        // 카테고리별 색상
        let markerColor = 'blue';
        if (index < allPlaces.cafes.length) {
            markerColor = 'blue'; // 커피숍
        } else if (index < allPlaces.cafes.length + allPlaces.korean.length) {
            markerColor = 'red'; // 한식
        } else if (index < allPlaces.cafes.length + allPlaces.korean.length + allPlaces.japanese.length) {
            markerColor = 'orange'; // 일식
        } else {
            markerColor = 'yellow'; // 중식
        }
        
        // 마커 이미지 설정
        const imageSrc = `https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_${markerColor}.png`;
        const imageSize = new kakao.maps.Size(36, 37);
        const imgOptions = {
            spriteSize: new kakao.maps.Size(36, 691),
            spriteOrigin: new kakao.maps.Point(0, (index * 46) + 10),
            offset: new kakao.maps.Point(13, 37)
        };
        const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imgOptions);
        
        const marker = new kakao.maps.Marker({
            position: position,
            map: map,
            image: markerImage
        });
        
        // 주소 정보
        const address = place.road_address_name || place.address_name;
        const category = place.category_name.split(' > ').pop();
        const distance = parseInt(place.distance);
        const walkingMinutes = Math.ceil(distance / 67);
        const walkingTime = walkingMinutes < 1 ? '1분 미만' : `도보 ${walkingMinutes}분`;
        
        // 인포윈도우
        const infowindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:10px;font-size:13px;min-width:200px;max-width:300px;">
                <strong style="color:#1976d2;font-size:14px;">${index + 1}. ${place.place_name}</strong><br>
                <span style="color:#666;font-size:12px;line-height:1.5;">
                    🏷️ ${category}<br>
                    📍 ${address}<br>
                    🚶 ${distance}m (${walkingTime})
                </span>
            </div>`
        });
        
        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', function() {
            window.currentMarkers.forEach(m => m.infowindow.close());
            infowindow.open(map, marker);
            const card = document.getElementById(`restaurant-${index}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.background = '#e3f2fd';
                setTimeout(() => {
                    card.style.background = '#f8f9fa';
                }, 1000);
            }
        });
        
        // 마커 마우스오버 이벤트
        kakao.maps.event.addListener(marker, 'mouseover', function() {
            infowindow.open(map, marker);
        });
        
        // 마커 마우스아웃 이벤트
        kakao.maps.event.addListener(marker, 'mouseout', function() {
            infowindow.close();
        });
        
        window.currentMarkers.push({ marker, infowindow });
    });
    
    // 동선 표시 (점선)
    const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#667eea',
        strokeOpacity: 0.7,
        strokeStyle: 'dashed'
    });
    
    polyline.setMap(map);
    
    // 지도 범위 재설정
    const bounds = new kakao.maps.LatLngBounds();
    linePath.forEach(position => bounds.extend(position));
    map.setBounds(bounds);
}

// 마커에 포커스
function focusOnMarker(index) {
    if (!window.currentMap || !window.currentMarkers[index]) return;
    
    const markerData = window.currentMarkers[index];
    const position = markerData.marker.getPosition();
    
    // 지도 중심 이동
    window.currentMap.setCenter(position);
    window.currentMap.setLevel(3);
    
    // 모든 인포윈도우 닫기
    window.currentMarkers.forEach(m => m.infowindow.close());
    
    // 해당 인포윈도우 열기
    markerData.infowindow.open(window.currentMap, markerData.marker);
    
    // 지도 섹션으로 스크롤
    document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 마커 하이라이트
function highlightMarker(index) {
    if (!window.currentMarkers[index]) return;
    const markerData = window.currentMarkers[index];
    markerData.infowindow.open(window.currentMap, markerData.marker);
}

// 마커 하이라이트 해제
function unhighlightMarker(index) {
    if (!window.currentMarkers[index]) return;
    const markerData = window.currentMarkers[index];
    markerData.infowindow.close();
}

// 이메일로 공유
function shareViaEmail() {
    if (!window.currentCustomerInfo) {
        showToast('공유할 맛집 정보가 없습니다.', 'error');
        return;
    }
    
    const { name, location, restaurants } = window.currentCustomerInfo;
    
    // 이메일 본문 생성
    let body = `📍 ${name} 주변 맛집 추천\n\n`;
    
    // 고객사 위치 정보
    body += `[고객사 위치]\n`;
    body += `${location.placeName || name}\n`;
    body += `주소: ${location.address}\n`;
    if (location.phone) {
        body += `전화: ${location.phone}\n`;
    }
    body += `\n`;
    
    // 맛집 리스트
    body += `[주변 맛집 (1km 반경 내 ${restaurants.length}곳)]\n\n`;
    
    restaurants.forEach((place, index) => {
        const distance = place.distance ? `${place.distance}m` : '-';
        const phone = place.phone || '전화번호 없음';
        const address = place.road_address_name || place.address_name;
        const category = place.category_name.split(' > ').pop();
        
        body += `${index + 1}. ${place.place_name}\n`;
        body += `   카테고리: ${category}\n`;
        body += `   거리: ${distance}\n`;
        body += `   주소: ${address}\n`;
        body += `   전화: ${phone}\n`;
        if (place.place_url) {
            body += `   상세보기: ${place.place_url}\n`;
        }
        body += `\n`;
    });
    
    body += `\n※ 미팅 전 고객사 사전파악 시스템에서 생성됨`;
    
    // 이메일 클라이언트 열기
    const subject = encodeURIComponent(`${name} 주변 맛집 추천`);
    const emailBody = encodeURIComponent(body);
    
    window.location.href = `mailto:?subject=${subject}&body=${emailBody}`;
    
    showToast('이메일 클라이언트가 열립니다.', 'success');
}

// 카카오톡으로 공유
function shareViaKakao() {
    if (!window.currentCustomerInfo) {
        showToast('공유할 맛집 정보가 없습니다.', 'error');
        return;
    }
    
    const { name, location, restaurants } = window.currentCustomerInfo;
    
    // 카카오톡 공유는 웹에서 직접 불가능하므로 텍스트 복사 기능 제공
    let text = `📍 ${name} 주변 맛집 추천\n\n`;
    
    // 고객사 위치 정보
    text += `[고객사 위치]\n`;
    text += `${location.placeName || name}\n`;
    text += `📍 ${location.address}\n`;
    if (location.phone) {
        text += `📞 ${location.phone}\n`;
    }
    text += `\n`;
    
    // 맛집 리스트
    text += `[주변 맛집 (1km 반경)]\n\n`;
    
    restaurants.forEach((place, index) => {
        const distance = place.distance ? `${place.distance}m` : '-';
        const phone = place.phone || '전화번호 없음';
        const address = place.road_address_name || place.address_name;
        const category = place.category_name.split(' > ').pop();
        
        text += `${index + 1}. ${place.place_name}\n`;
        text += `🏷️ ${category} | 📍 ${distance}\n`;
        text += `📞 ${phone}\n`;
        text += `📍 ${address}\n`;
        if (place.place_url) {
            text += `🔗 ${place.place_url}\n`;
        }
        text += `\n`;
    });
    
    // 클립보드에 복사
    navigator.clipboard.writeText(text).then(() => {
        showToast('맛집 정보가 복사되었습니다! 카카오톡에 붙여넣기 하세요.', 'success');
    }).catch(() => {
        // 복사 실패 시 텍스트 영역 표시
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('맛집 정보가 복사되었습니다! 카카오톡에 붙여넣기 하세요.', 'success');
    });
}
