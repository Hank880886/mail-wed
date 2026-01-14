class MailApp {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.token = localStorage.getItem('mailToken');
        this.currentUser = JSON.parse(localStorage.getItem('mailUser') || 'null');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkAuth();
    }
    
    bindEvents() {
        // 登入/註冊切換
        document.getElementById('showRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        });
        
        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
        });
        
        // 登入表單
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });
        
        // 註冊表單
        document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.register();
        });
        
        // 登出按鈕
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
        
        // 撰寫郵件按鈕
        document.getElementById('composeBtn')?.addEventListener('click', () => {
            this.showComposeModal();
        });
        
        // 關閉撰寫模態框
        document.getElementById('closeCompose')?.addEventListener('click', () => {
            this.hideComposeModal();
        });
        
        // 發送郵件表單
        document.getElementById('composeForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.sendEmail();
        });
        
        // 刷新郵件列表
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadEmails();
        });
        
        // 菜單點擊
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActiveFolder(e.currentTarget.dataset.folder);
            });
        });
        
        // 點擊模態框外部關閉
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
    
    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                
                localStorage.setItem('mailToken', data.token);
                localStorage.setItem('mailUser', JSON.stringify(data.user));
                
                this.showMailClient();
                this.loadEmails();
                this.showMessage('登入成功！', 'success');
            } else {
                this.showMessage(data.error || '登入失敗', 'error');
            }
        } catch (error) {
            this.showMessage('網路錯誤，請稍後再試', 'error');
        }
    }
    
    async register() {
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const displayName = document.getElementById('regDisplayName').value;
        
        try {
            const response = await fetch(`${this.apiBase}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, display_name: displayName })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('註冊成功！請登入', 'success');
                // 切換回登入表單
                document.getElementById('registerForm').style.display = 'none';
                document.getElementById('loginForm').style.display = 'block';
                // 填充登入表單
                document.getElementById('email').value = email;
            } else {
                this.showMessage(data.error || '註冊失敗', 'error');
            }
        } catch (error) {
            this.showMessage('網路錯誤，請稍後再試', 'error');
        }
    }
    
    logout() {
        localStorage.removeItem('mailToken');
        localStorage.removeItem('mailUser');
        this.token = null;
        this.currentUser = null;
        this.showLoginPage();
        this.showMessage('已登出', 'success');
    }
    
    checkAuth() {
        if (this.token && this.currentUser) {
            this.showMailClient();
            this.loadEmails();
        } else {
            this.showLoginPage();
        }
    }
    
    showLoginPage() {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('mailClient').style.display = 'none';
        // 重置表單
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }
    
    showMailClient() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mailClient').style.display = 'block';
        document.getElementById('userEmail').textContent = this.currentUser?.email || '';
    }
    
    showComposeModal() {
        document.getElementById('composeModal').style.display = 'flex';
    }
    
    hideComposeModal() {
        document.getElementById('composeModal').style.display = 'none';
        document.getElementById('composeForm').reset();
    }
    
    async sendEmail() {
        const to = document.getElementById('composeTo').value;
        const subject = document.getElementById('composeSubject').value;
        const body = document.getElementById('composeBody').value;
        
        try {
            const response = await fetch(`${this.apiBase}/emails/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ to, subject, body })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('郵件發送成功！', 'success');
                this.hideComposeModal();
                this.loadEmails();
            } else {
                this.showMessage(data.error || '發送失敗', 'error');
            }
        } catch (error) {
            this.showMessage('網路錯誤，請稍後再試', 'error');
        }
    }
    
    async loadEmails() {
        try {
            const response = await fetch(`${this.apiBase}/emails`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const emails = await response.json();
                this.renderEmails(emails);
                this.updateEmailCount(emails.length);
            }
        } catch (error) {
            console.error('載入郵件失敗:', error);
        }
    }
    
    renderEmails(emails) {
        const mailList = document.getElementById('mailList');
        
        if (emails.length === 0) {
            mailList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox fa-3x"></i>
                    <h3>收件箱空空如也</h3>
                    <p>點擊「撰寫郵件」開始發送第一封郵件</p>
                </div>
            `;
            return;
        }
        
        mailList.innerHTML = emails.map(email => `
            <div class="mail-item" data-id="${email.id}">
                <div class="mail-avatar">
                    ${email.sender_display?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div class="mail-info">
                    <div class="mail-sender">
                        ${email.sender_display || email.sender_email}
                        ${email.is_starred ? '<i class="fas fa-star" style="color: #fbbc04;"></i>' : ''}
                    </div>
                    <div class="mail-subject">${this.escapeHtml(email.subject || '無主旨')}</div>
                    <div class="mail-preview">${this.escapeHtml(email.body?.substring(0, 100) || '')}</div>
                </div>
                <div class="mail-time">
                    ${this.formatTime(email.created_at)}
                </div>
            </div>
        `).join('');
        
        // 添加郵件點擊事件
        document.querySelectorAll('.mail-item').forEach(item => {
            item.addEventListener('click', () => {
                const emailId = item.dataset.id;
                this.showEmailDetail(emailId);
            });
        });
    }
    
    updateEmailCount(count) {
        document.getElementById('inboxCount').textContent = count;
        document.getElementById('mailCount').textContent = `${count} 封郵件`;
    }
    
    setActiveFolder(folder) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folder}"]`).classList.add('active');
        // 這裡可以根據文件夾加載不同的郵件
    }
    
    showMessage(message, type) {
        // 創建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.innerHTML = `
            <span>${message}</span>
            <button class="close-message">&times;</button>
        `;
        
        // 添加到頁面
        document.body.appendChild(messageEl);
        
        // 自動消失
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
        
        // 手動關閉
        messageEl.querySelector('.close-message').addEventListener('click', () => {
            messageEl.remove();
        });
        
        // 添加樣式
        if (!document.querySelector('#messageStyles')) {
            const style = document.createElement('style');
            style.id = 'messageStyles';
            style.textContent = `
                .message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 24px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    animation: slideIn 0.3s ease;
                }
                
                .message.success {
                    background: #34a853;
                }
                
                .message.error {
                    background: #ea4335;
                }
                
                .message .close-message {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) { // 24小時內
            return date.toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diff < 604800000) { // 7天內
            return date.toLocaleDateString('zh-TW', { 
                weekday: 'short' 
            });
        } else {
            return date.toLocaleDateString('zh-TW', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showEmailDetail(emailId) {
        // 這裡可以實現查看郵件詳情的功能
        this.showMessage(`查看郵件 ID: ${emailId}`, 'success');
    }
}

// 應用程式啟動
document.addEventListener('DOMContentLoaded', () => {
    window.mailApp = new MailApp();
});
