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
            balance: balance != null ? balance : 0
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
                    balance: result.user.balance || 0
                };
            }
            // If server says session invalid, clear it and return false
            this.clearSession();
            return { success: false };
        } catch (e) {
            console.warn('getProfile failed:', e);
        }

        // If offline or error, still return false to force login
        return { success: false };
    },

    async syncBalance(userId, sessionToken) {
        const result = await this.call('getProfile', { userId, sessionToken });
        if (result.success) return result.user.balance || 0;
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
    }
};
