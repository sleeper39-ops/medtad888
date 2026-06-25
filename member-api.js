const MemberAPI = {
    async call(action, extraData = {}) {
        if (!GAS_API_URL || GAS_API_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
            throw new Error('กรุณาตั้งค่า GAS_API_URL ใน js/config.js ก่อน (Deploy Google Apps Script)');
        }
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...extraData })
        });
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('API response error: ' + text.substring(0, 100));
        }
    },

    saveSession(user, sessionToken) {
        localStorage.setItem('memberSession', JSON.stringify({
            userId: user.id,
            sessionToken: sessionToken,
            name: user.name,
            email: user.email,
            trueMoneyLink: user.trueMoneyLink
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
                    balance: result.user.balance || 0
                };
            }
            this.clearSession();
            return { success: false };
        } catch (e) {
            console.warn('Session restore failed:', e);
            return { success: false };
        }
    },

    async syncBalance(userId, sessionToken) {
        const result = await this.call('getProfile', { userId, sessionToken });
        if (result.success) return result.user.balance || 0;
        return null;
    },

    async updateBalance(userId, sessionToken, amount) {
        return this.call('updateBalance', { userId, sessionToken, amount });
    }
};
