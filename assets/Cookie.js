/*
  * Cookie管理脚本
  * 根据localStorage中的"Cookie"变量控制Cookie的启用和禁用
*/

// Cookie管理类
class CookieManager {
    constructor() {
        console.group('🍪 CookieManager 初始化');
        console.log('开始初始化Cookie管理器...');
        this.cookieEnabled = this.checkCookieStatus();
        console.log('当前Cookie状态:', this.cookieEnabled ? '启用' : '禁用');
        this.init();
        console.groupEnd();
    }

    // 检查Cookie状态
    checkCookieStatus() {
        const cookieChoice = localStorage.getItem('Cookie');
        console.log('从localStorage读取Cookie选择:', cookieChoice);
        // 如果用户选择了False，则禁用Cookie；否则启用Cookie
        return cookieChoice !== 'False';
    }

// 初始化Cookie管理
    init() {
        console.group('🔧 CookieManager 初始化处理');
        if (!this.cookieEnabled) {
            console.log('检测到Cookie被禁用，开始禁用所有Cookie功能');
            this.disableAllCookies();
        } else {
            console.log('检测到Cookie被启用，确保Cookie功能正常');
            this.enableAllCookies();
        }

        // 监听localStorage变化，实时更新Cookie状态
        window.addEventListener('storage', (e) => {
            console.group('📡 localStorage 存储事件');
            console.log('检测到localStorage变化:', e.key, '=', e.newValue);
            if (e.key === 'Cookie') {
                this.cookieEnabled = this.checkCookieStatus();
                console.log('Cookie状态更新为:', this.cookieEnabled ? '启用' : '禁用');
                if (!this.cookieEnabled) {
                    console.log('开始禁用Cookie功能...');
                    this.disableAllCookies();
                } else {
                    console.log('开始启用Cookie功能...');
                    this.enableAllCookies();
                }
            }
            console.groupEnd();
        });

        // 监听页面内的Cookie选择变化
        this.setupCookieChangeListener();
        console.groupEnd();
    }

    // 禁用所有Cookie相关功能
    disableAllCookies() {
        console.group('🚫 禁用所有Cookie功能');
        console.log('开始执行禁用Cookie流程...');

        // 0. 先保存原始Cookie方法，然后扫描并删除所有现有Cookie
        this.prepareAndDeleteCookies();

        // 1. 禁用document.cookie
        this.overrideDocumentCookie();

        // 2. 禁用localStorage和sessionStorage（可选）
        this.disableWebStorage();

        // 3. 禁用IndexedDB（可选）
        this.disableIndexedDB();

        // 4. 禁用所有需要Cookie的API调用（包括CookieStore）
        this.disableCookieDependentAPIs();

        // 5. 显示禁用提示
        this.showDisabledMessage();
        
        console.log('✅ Cookie功能禁用完成');
        console.groupEnd();
    }

    // 启用所有Cookie相关功能
    enableAllCookies() {
        console.group('✅ 启用所有Cookie功能');
        console.log('开始执行启用Cookie流程...');

        // 1. 恢复document.cookie功能
        this.restoreDocumentCookie();

        // 2. 启用Web Storage
        this.enableWebStorage();

        // 3. 启用IndexedDB
        this.enableIndexedDB();

        // 4. 启用依赖Cookie的API调用
        this.enableCookieDependentAPIs();

        // 5. 隐藏禁用提示
        this.hideDisabledMessage();
        
        console.log('✅ Cookie功能启用完成');
        console.groupEnd();
    }

    // 准备并删除所有现有Cookie
    prepareAndDeleteCookies() {
        console.group('🗑️ 准备并删除现有Cookie');
        console.log('开始清空所有现有Cookie...');
        
        // 保存原始Cookie方法
        this.saveOriginalCookieMethods();
        
        // 清空所有Cookie
        this.deleteAllCookies();
        console.groupEnd();
    }

    // 保存原始Cookie方法
    saveOriginalCookieMethods() {
        console.log('💾 保存原始Cookie方法...');
        if (!this.originalCookieGetter) {
            const descriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
            if (descriptor) {
                this.originalCookieGetter = descriptor.get;
                this.originalCookieSetter = descriptor.set;
                console.log('✅ 原始Cookie getter/setter已保存');
            } else {
                console.warn('⚠️ 无法获取document.cookie属性描述符');
            }
            this.originalCookieValue = document.cookie;
            console.log('当前Cookie值:', this.originalCookieValue);
        } else {
            console.log('📋 原始Cookie方法已存在，跳过保存');
        }
    }

    // 删除所有Cookie
    deleteAllCookies() {
        console.group('🔍 删除所有Cookie');
        try {
            console.log('📊 当前页面Cookie数量:', document.cookie ? document.cookie.split(';').length : 0);
            console.log('📝 当前Cookie内容:', document.cookie || '空');
            
            // 方法1: 设置过期时间为过去的时间
            const cookies = document.cookie.split(';');
            console.log(`🔍 找到 ${cookies.length} 个Cookie，开始逐个删除...`);
            
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                
                console.log(`🗑️ 删除Cookie: ${name}`);
                
                // 为每个Cookie设置过期时间（过去的时间）
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
            }

            // 方法2: 清空整个Cookie字符串
            console.log('🧹 清空整个Cookie字符串...');
            document.cookie = '';

            // 方法3: 尝试清空所有可能的路径和域
            console.log('🌐 尝试清空所有可能的路径和域...');
            const domains = [
                window.location.hostname,
                '.' + window.location.hostname,
                window.location.host
            ];
            
            const paths = ['/', '/h', '/程序', '/html', '/ziyit'];
            
            domains.forEach(domain => {
                paths.forEach(path => {
                    document.cookie = `authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
                });
            });
            
            console.log('✅ Cookie清空完成');
            console.log('📊 清空后Cookie数量:', document.cookie ? document.cookie.split(';').length : 0);
            console.log('📝 清空后Cookie内容:', document.cookie || '空');
            
        } catch (error) {
            console.error('❌ 清空Cookie时出错:', error);
        }
        console.groupEnd();
    }

    // 重写document.cookie以禁用Cookie
    overrideDocumentCookie() {
        console.group('🔒 重写document.cookie');
        console.log('开始重写document.cookie属性...');
        
        // 禁用Cookie设置和读取
        Object.defineProperty(document, 'cookie', {
            get: () => {
                console.warn('🚫 Cookie已被禁用，无法读取Cookie');
                // 返回空字符串而不是抛出错误，避免影响其他代码
                return '';
            },
            set: (value) => {
                console.warn('🚫 Cookie已被禁用，无法设置Cookie:', value);
                // 不执行任何操作，让赋值操作完全无效
                // 不抛出错误，避免影响其他代码的正常执行
                return;
            },
            configurable: true
        });
        
        console.log('✅ document.cookie重写完成');
        console.groupEnd();
    }

    // 恢复document.cookie功能
    restoreDocumentCookie() {
        console.group('🔓 恢复document.cookie功能');
        console.log('开始恢复document.cookie功能...');
        
        if (this.originalCookieGetter && this.originalCookieSetter) {
            Object.defineProperty(document, 'cookie', {
                get: this.originalCookieGetter,
                set: this.originalCookieSetter,
                configurable: true
            });
            console.log('✅ 使用原始getter/setter恢复document.cookie');
        } else if (this.originalCookieValue !== undefined) {
            // 备用方案：删除自定义属性，让浏览器恢复默认行为
            delete document.cookie;
            console.log('✅ 使用删除属性方式恢复document.cookie');
        } else {
            console.warn('⚠️ 无法恢复document.cookie，原始方法不存在');
        }
        console.groupEnd();
    }

    // 设置Cookie状态（供外部调用）
    setCookieStatus(enabled) {
        console.group('⚙️ 设置Cookie状态');
        console.log('设置Cookie状态为:', enabled ? '启用' : '禁用');
        
        localStorage.setItem('Cookie', enabled ? 'True' : 'False');
        this.cookieEnabled = enabled;
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('cookieChoiceChanged'));
        
        if (!enabled) {
            console.log('开始禁用Cookie功能...');
            this.disableAllCookies();
        } else {
            console.log('开始启用Cookie功能...');
            this.enableAllCookies();
        }
        console.groupEnd();
    }

    // 设置Cookie状态（供外部调用）
    setCookieStatus(enabled) {
        console.group('⚙️ 设置Cookie状态');
        console.log('设置Cookie状态为:', enabled ? '启用' : '禁用');
        
        localStorage.setItem('Cookie', enabled ? 'True' : 'False');
        this.cookieEnabled = enabled;
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('cookieChoiceChanged'));
        
        if (!enabled) {
            console.log('开始禁用Cookie功能...');
            this.disableAllCookies();
        } else {
            console.log('开始启用Cookie功能...');
            this.enableAllCookies();
        }
        console.groupEnd();
    }

    // 禁用Web Storage
    disableWebStorage() {
        console.group('🔒 禁用Web Storage');
        console.log('开始禁用sessionStorage，保留localStorage...');
        
        if (!this.originalSessionStorage) {
            // 只保存sessionStorage的原始方法，localStorage保持不变
            this.originalSessionStorage = {
                getItem: window.sessionStorage.getItem,
                setItem: window.sessionStorage.setItem,
                removeItem: window.sessionStorage.removeItem,
                clear: window.sessionStorage.clear
            };
        }

        // 重写sessionStorage方法（禁用sessionStorage）
        window.sessionStorage.getItem = function () {
            console.warn('🚫 Cookie已被禁用，sessionStorage功能受限');
            return null;
        };
        window.sessionStorage.setItem = function () {
            console.warn('🚫 Cookie已被禁用，无法设置sessionStorage');
            return false;
        };
        window.sessionStorage.removeItem = function () {
            console.warn('🚫 Cookie已被禁用，无法删除sessionStorage');
            return false;
        };
        window.sessionStorage.clear = function () {
            console.warn('🚫 Cookie已被禁用，无法清空sessionStorage');
            return false;
        };
        
        console.log('✅ sessionStorage禁用完成，localStorage保持可用');
        console.groupEnd();
    }

    // 启用Web Storage
    enableWebStorage() {
        console.group('🔓 启用Web Storage');
        console.log('开始启用sessionStorage...');
        
        if (this.originalSessionStorage) {
            // 只恢复sessionStorage，localStorage不需要恢复
            window.sessionStorage.getItem = this.originalSessionStorage.getItem;
            window.sessionStorage.setItem = this.originalSessionStorage.setItem;
            window.sessionStorage.removeItem = this.originalSessionStorage.removeItem;
window.sessionStorage.clear = this.originalSessionStorage.clear;
        }
        
        console.log('✅ sessionStorage启用完成');
        console.groupEnd();
    }

    // 禁用IndexedDB
    disableIndexedDB() {
        console.group('🔒 禁用IndexedDB');
        console.log('开始禁用IndexedDB...');
        
        if (window.indexedDB && !this.originalIndexedDBOpen) {
            this.originalIndexedDBOpen = window.indexedDB.open;

            window.indexedDB.open = function () {
                console.warn('🚫 Cookie已被禁用，IndexedDB功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };
        }
        
        console.log('✅ IndexedDB禁用完成');
        console.groupEnd();
    }

    // 启用IndexedDB
    enableIndexedDB() {
        console.group('🔓 启用IndexedDB');
        console.log('开始启用IndexedDB...');
        
        if (window.indexedDB && this.originalIndexedDBOpen) {
            window.indexedDB.open = this.originalIndexedDBOpen;
        }
        
        console.log('✅ IndexedDB启用完成');
        console.groupEnd();
    }

    // 禁用依赖Cookie的API调用
    disableCookieDependentAPIs() {
        console.group('🔒 禁用依赖Cookie的API调用');
        console.log('开始禁用XMLHttpRequest、fetch和CookieStore API...');
        
        // 保存原始方法
        if (!this.originalXHRSend) {
            this.originalXHRSend = XMLHttpRequest.prototype.send;
        }
        if (!this.originalFetch) {
            this.originalFetch = window.fetch;
        }

        // 禁用XMLHttpRequest发送Cookie
        XMLHttpRequest.prototype.send = function (data) {
            if (this.withCredentials) {
                console.warn('🚫 Cookie已被禁用，已移除withCredentials标志');
                this.withCredentials = false;
            }
            return this.originalXHRSend.call(this, data);
        }.bind(this);

        // 禁用fetch发送Cookie
        window.fetch = function (input, init = {}) {
            if (init.credentials === 'include') {
                console.warn('🚫 Cookie已被禁用，已移除credentials标志');
                init.credentials = 'omit';
            }
            return this.originalFetch.call(this, input, init);
        }.bind(this);

        // 禁用CookieStore API（如果存在）
        this.disableCookieStoreAPI();
        
        console.log('✅ 依赖Cookie的API禁用完成');
        console.groupEnd();
    }

    // 禁用CookieStore API
    disableCookieStoreAPI() {
        if (window.cookieStore) {
            console.log('🔍 检测到CookieStore API，正在禁用...');

            // 保存原始CookieStore方法
            if (!this.originalCookieStore) {
                this.originalCookieStore = {
                    get: window.cookieStore.get,
                    getAll: window.cookieStore.getAll,
                    set: window.cookieStore.set,
                    delete: window.cookieStore.delete,
                    onchange: window.cookieStore.onchange
                };
            }

            // 重写CookieStore方法
            window.cookieStore.get = function () {
                console.warn('🚫 Cookie已被禁用，CookieStore.get功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };

            window.cookieStore.getAll = function () {
                console.warn('🚫 Cookie已被禁用，CookieStore.getAll功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };

            window.cookieStore.set = function () {
                console.warn('🚫 Cookie已被禁用，CookieStore.set功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };

            window.cookieStore.delete = function () {
                console.warn('🚫 Cookie已被禁用，CookieStore.delete功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };

            // 禁用CookieStore事件监听
            if (window.cookieStore.onchange) {
                window.cookieStore.onchange = null;
            }
        }
    }

    // 启用CookieStore API
    enableCookieStoreAPI() {
        if (window.cookieStore && this.originalCookieStore) {
            window.cookieStore.get = this.originalCookieStore.get;
            window.cookieStore.getAll = this.originalCookieStore.getAll;
            window.cookieStore.set = this.originalCookieStore.set;
            window.cookieStore.delete = this.originalCookieStore.delete;
            window.cookieStore.onchange = this.originalCookieStore.onchange;
        }
    }

    // 启用依赖Cookie的API调用
    enableCookieDependentAPIs() {
        console.group('🔓 启用依赖Cookie的API调用');
        console.log('开始启用XMLHttpRequest、fetch和CookieStore API...');
        
        // 恢复XMLHttpRequest
        if (this.originalXHRSend) {
            XMLHttpRequest.prototype.send = this.originalXHRSend;
        }

        // 恢复fetch
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
        }

        // 恢复CookieStore API
        this.enableCookieStoreAPI();
        
        console.log('✅ 依赖Cookie的API启用完成');
        console.groupEnd();
    }

    // 显示禁用提示
    showDisabledMessage() {
        console.group('💬 显示禁用提示');
        console.log('开始显示Cookie禁用提示...');
        
        // 创建或显示禁用提示
        let messageDiv = document.getElementById('cookie-disabled-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'cookie-disabled-message';
            messageDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #f8d7da;
                color: #721c24;
                padding: 10px 15px;
                border: 1px solid #f5c6cb;
                border-radius: 5px;
                z-index: 10001;
                font-size: 14px;
                max-width: 300px;
            `;
            messageDiv.innerHTML = 'Cookie功能已被禁用';
            document.body.appendChild(messageDiv);
        }
        messageDiv.style.display = 'block';
        
        console.log('✅ 禁用提示显示完成');
        console.groupEnd();
    }

    // 隐藏禁用提示
    hideDisabledMessage() {
        console.group('💬 隐藏禁用提示');
        console.log('开始隐藏Cookie禁用提示...');
        
        const messageDiv = document.getElementById('cookie-disabled-message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
        
        console.log('✅ 禁用提示隐藏完成');
        console.groupEnd();
    }

    // 设置Cookie变化监听器
    setupCookieChangeListener() {
        console.group('📡 设置Cookie变化监听器');
        console.log('开始设置页面内Cookie选择变化监听器...');
        
        // 监听自定义事件（用于页面内Cookie选择变化）
        window.addEventListener('cookieChoiceChanged', (e) => {
            this.cookieEnabled = this.checkCookieStatus();
            if (!this.cookieEnabled) {
                this.disableAllCookies();
            } else {
                this.enableAllCookies();
            }
        });
        
        console.log('✅ Cookie变化监听器设置完成');
        console.groupEnd();
    }

    // 手动触发Cookie状态检查
    refreshCookieStatus() {
        console.group('🔄 手动刷新Cookie状态');
        console.log('开始手动刷新Cookie状态...');
        
        this.cookieEnabled = this.checkCookieStatus();
        if (!this.cookieEnabled) {
            this.disableAllCookies();
        } else {
            this.enableAllCookies();
        }
        
        console.log('✅ Cookie状态刷新完成');
        console.groupEnd();
    }

    // 获取当前Cookie状态
    getCookieStatus() {
        return this.cookieEnabled;
    }
}

// 创建全局Cookie管理器实例
window.cookieManager = new CookieManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookieManager;
}

// 添加开发者调试工具
window.debugCookieManager = {
    // 获取当前Cookie状态
    getStatus: () => {
        console.group('🔍 Cookie管理器调试信息');
        console.log('当前Cookie状态:', window.cookieManager.getCookieStatus() ? '启用' : '禁用');
        console.log('localStorage Cookie设置:', localStorage.getItem('Cookie'));
        console.log('当前document.cookie:', document.cookie);
        console.log('原始Cookie方法已保存:', !!window.cookieManager.originalCookieGetter);
        console.groupEnd();
        return window.cookieManager.getCookieStatus();
    },
    
    // 强制启用Cookie
    enable: () => {
        console.log('🔧 强制启用Cookie...');
        window.cookieManager.setCookieStatus(true);
    },
    
    // 强制禁用Cookie
    disable: () => {
        console.log('🔧 强制禁用Cookie...');
        window.cookieManager.setCookieStatus(false);
    },
    
    // 测试Cookie功能
    test: () => {
        console.group('🧪 Cookie功能测试');
        console.log('1. 测试document.cookie设置...');
        try {
            document.cookie = 'test_cookie=debug_value; path=/';
            console.log('✅ document.cookie设置测试完成');
        } catch (e) {
            console.error('❌ document.cookie设置失败:', e);
        }
        
        console.log('2. 测试localStorage...');
        try {
            localStorage.setItem('test_storage', 'debug_value');
            console.log('✅ localStorage设置测试完成');
        } catch (e) {
            console.error('❌ localStorage设置失败:', e);
        }
        
        console.log('3. 读取测试值...');
        console.log('document.cookie test_cookie:', document.cookie.includes('test_cookie'));
        console.log('localStorage test_storage:', localStorage.getItem('test_storage'));
        console.groupEnd();
    }
};

console.log('🎉 Cookie管理器初始化完成！');
console.log('💡 开发者提示: 使用 debugCookieManager 进行调试');
console.log('   - window.debugCookieManager.getStatus() - 查看状态');
console.log('   - window.debugCookieManager.enable() - 启用Cookie');
console.log('   - window.debugCookieManager.disable() - 禁用Cookie');
console.log('   - window.debugCookieManager.test() - 测试功能');

// 添加错误检查
try {
    console.log('✅ Cookie.js脚本已加载');
    console.log('✅ Cookie管理器实例:', window.cookieManager);
    console.log('✅ 调试工具可用:', window.debugCookieManager);
} catch (error) {
    console.error('❌ Cookie.js加载错误:', error);
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookieManager;
}