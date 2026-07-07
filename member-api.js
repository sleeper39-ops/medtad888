const MemberAPI = {
    async call(action, extraData = {}) {
        console.log('MemberAPI.call called with action:', action, 'extraData:', extraData);
        if (!GAS_API_URL) {
            throw new Error('กรุณาตั้งค่า GAS_API_URL ใน config.js ก่อน');
        }
        const payload = JSON.stringify({ action, ...extraData });
        console.log('Sending payload:', payload);
        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payload
            });
            console.log('Response status:', response.status, response.statusText);
            const text = await response.text();
            console.log('Response text:', text);
            try {
                const result = JSON.parse(text);
                console.log('Parsed result:', result);
                return result;
            } catch (e) {
                throw new Error('API response error: ' + text.substring(0, 100));
            }
        } catch (e) {
            console.error('MemberAPI.call error:', e);
            throw e;
        }
    },

    saveSession(user, sessionToken, balance) {
        localStorage.setItem('memberSession', JSON.stringify({
            userId: user.id,
            sessionToken: sessionToken,
            name: user.name,
            email: user.email,
            trueMoneyLink: user.trueMoneyLink,
            balance: Number(balance) || 0
        }));
    },

    getSession() {
        const saved = localStorage.getItem('memberSession');
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (e) {
            return null;
        }
    },

    clearSession() {
        localStorage.removeItem('memberSession');
    },

    userFromApi(apiUser) {
        return {
            id: apiUser.userId,
            name: apiUser.userId,
            email: apiUser.email,
            trueMoneyLink: apiUser.trueMoneyLink,
            avatar: '👤'
        };
    },

    userFromSession(session) {
        return {
            id: session.userId,
            name: session.name || session.userId,
            email: session.email || '',
            trueMoneyLink: session.trueMoneyLink || '',
            avatar: '👤'
        };
    },

    async restore() {
        const session = this.getSession();
        if (!session) return { success: false };

        try {
            const result = await this.call('getProfile', {
                userId: session.userId,
                sessionToken: session.sessionToken
            });
            if (result.success) {
                return {
                    success: true,
                    user: this.userFromApi(result.user),
                    sessionToken: session.sessionToken,
                    balance: Number(result.user.balance) || 0
                };
            }
            return { success: false, reason: 'invalid_session' };
        } catch (e) {
            console.warn('getProfile failed (offline/error):', e);
            return {
                success: true,
                user: this.userFromSession(session),
                sessionToken: session.sessionToken,
                balance: Number(session.balance) || 0,
                isOffline: true
            };
        }
    },

    async syncBalance(userId, sessionToken) {
        const result = await this.call('getProfile', { userId, sessionToken });
        if (result.success) return Number(result.user.balance) || 0;
        return null;
    },

    async updateBalance(userId, sessionToken, amount) {
        return this.call('updateBalance', { userId, sessionToken, amount });
    },

    async getAllMembers() {
        return this.call('getAllMembers');
    },

    async adminUpdateBalance(userId, amount) {
        return this.call('adminUpdateBalance', { userId, amount });
    },

    async changePassword(userId, sessionToken, oldPassword, newPassword) {
        return this.call('changePassword', { userId, sessionToken, oldPassword, newPassword });
    },

    async submitGiftVoucher(userId, sessionToken, amount, link, telegramBotToken, telegramChatId) {
        return this.call('submitGiftVoucher', { userId, sessionToken, amount, link, telegramBotToken, telegramChatId });
    },

    async requestWithdrawal(userId, sessionToken, amount, account) {
        return this.call('requestWithdrawal', { userId, sessionToken, amount, account });
    },

    async getAdminSettings() {
        return this.call('getAdminSettings');
    },

    async saveAdminSettings(settings) {
        return this.call('saveAdminSettings', settings);
    }
};

/** แสดงยอดเงิน — อัปเดต DOM เฉพาะเมื่อค่าเปลี่ยนจริง */
const BalanceUI = {
    _shown: {},
    _gasAt: 0,

    format(amount) {
        return (Number(amount) || 0).toLocaleString();
    },

    set(elementId, amount, opts = {}) {
        const el = document.getElementById(elementId);
        const num = Number(amount) || 0;
        if (!el) return num;

        const suffix = opts.suffix != null ? opts.suffix : '';
        const prev = this._shown[elementId];
        if (prev === num && !opts.force) return num;

        this._shown[elementId] = num;
        el.textContent = this.format(num) + suffix;
        if (opts.gas) this._gasAt = Date.now();
        return num;
    },

    /** Firebase เป็นตัวสำรอง — ไม่อ่านถ้าเพิ่ง sync GAS ไป */
    acceptFirebase() {
        return Date.now() - this._gasAt > 6000;
    },

    clear(elementId) {
        if (elementId) delete this._shown[elementId];
        else this._shown = {};
        this._gasAt = 0;
    }
};
