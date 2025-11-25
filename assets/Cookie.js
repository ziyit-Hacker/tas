/**
 * Cookie管理脚本
 * 根据localStorage中的"Cookie"变量控制Cookie的启用和禁用
 */

// Cookie管理类
class CookieManager {
    constructor() {
        this.cookieEnabled = this.checkCookieStatus();
        this.init();
    }

    // 检查Cookie状态
    checkCookieStatus() {
        const cookieChoice = localStorage.getItem('Cookie');
        // 如果用户选择了False，则禁用Cookie；否则启用Cookie
        return cookieChoice !== 'False';
    }

    // 初始化Cookie管理
    init() {
        if (!this.cookieEnabled) {
            this.disableAllCookies();
        } else {
            this.enableAllCookies();
        }

        // 监听localStorage变化，实时更新Cookie状态
        window.addEventListener('storage', (e) => {
            if (e.key === 'Cookie') {
                this.cookieEnabled = this.checkCookieStatus();
                if (!this.cookieEnabled) {
                    this.disableAllCookies();
                } else {
                    this.enableAllCookies();
                }
            }
        });

        // 监听页面内的Cookie选择变化
        this.setupCookieChangeListener();
    }

    // 禁用所有Cookie相关功能
    disableAllCookies() {
        console.log('Cookie功能已禁用');

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
    }

    // 重写document.cookie以禁用Cookie
    overrideDocumentCookie() {
        // 禁用Cookie设置和读取
        Object.defineProperty(document, 'cookie', {
            get: () => {
                console.warn('Cookie已被禁用，无法读取Cookie');
                // 返回空字符串而不是抛出错误，避免影响其他代码
                return '';
            },
            set: (value) => {
                console.warn('Cookie已被禁用，无法设置Cookie:', value);
                // 不执行任何操作，让赋值操作完全无效
                // 不抛出错误，避免影响其他代码的正常执行
                return;
            },
            configurable: true
        });
    }

    // 恢复document.cookie功能
    restoreDocumentCookie() {
        if (this.originalCookieGetter && this.originalCookieSetter) {
            Object.defineProperty(document, 'cookie', {
                get: this.originalCookieGetter,
                set: this.originalCookieSetter,
                configurable: true
            });
        } else if (this.originalCookieValue !== undefined) {
            // 备用方案：删除自定义属性，让浏览器恢复默认行为
            delete document.cookie;
        }
    }

    // 禁用Web Storage
    disableWebStorage() {
        if (!this.originalLocalStorage) {
            this.originalLocalStorage = {
                getItem: window.localStorage.getItem,
                setItem: window.localStorage.setItem,
                removeItem: window.localStorage.removeItem,
                clear: window.localStorage.clear
            };

            this.originalSessionStorage = {
                getItem: window.sessionStorage.getItem,
                setItem: window.sessionStorage.setItem,
                removeItem: window.sessionStorage.removeItem,
                clear: window.sessionStorage.clear
            };
        }

        // 重写localStorage方法
        window.localStorage.getItem = function() {
            console.warn('Cookie已被禁用，localStorage功能受限');
            return null;
        };
        window.localStorage.setItem = function() {
            console.warn('Cookie已被禁用，无法设置localStorage');
            return false;
        };
        window.localStorage.removeItem = function() {
            console.warn('Cookie已被禁用，无法删除localStorage');
            return false;
        };
        window.localStorage.clear = function() {
            console.warn('Cookie已被禁用，无法清空localStorage');
            return false;
        };

        // 重写sessionStorage方法
        window.sessionStorage.getItem = function() {
            console.warn('Cookie已被禁用，sessionStorage功能受限');
            return null;
        };
        window.sessionStorage.setItem = function() {
            console.warn('Cookie已被禁用，无法设置sessionStorage');
            return false;
        };
        window.sessionStorage.removeItem = function() {
            console.warn('Cookie已被禁用，无法删除sessionStorage');
            return false;
        };
        window.sessionStorage.clear = function() {
            console.warn('Cookie已被禁用，无法清空sessionStorage');
            return false;
        };
    }

    // 启用Web Storage
    enableWebStorage() {
        if (this.originalLocalStorage) {
            window.localStorage.getItem = this.originalLocalStorage.getItem;
            window.localStorage.setItem = this.originalLocalStorage.setItem;
            window.localStorage.removeItem = this.originalLocalStorage.removeItem;
            window.localStorage.clear = this.originalLocalStorage.clear;

            window.sessionStorage.getItem = this.originalSessionStorage.getItem;
            window.sessionStorage.setItem = this.originalSessionStorage.setItem;
            window.sessionStorage.removeItem = this.originalSessionStorage.removeItem;
            window.sessionStorage.clear = this.originalSessionStorage.clear;
        }
    }

    // 禁用IndexedDB
    disableIndexedDB() {
        if (window.indexedDB && !this.originalIndexedDBOpen) {
            this.originalIndexedDBOpen = window.indexedDB.open;
            
            window.indexedDB.open = function() {
                console.warn('Cookie已被禁用，IndexedDB功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };
        }
    }

    // 启用IndexedDB
    enableIndexedDB() {
        if (window.indexedDB && this.originalIndexedDBOpen) {
            window.indexedDB.open = this.originalIndexedDBOpen;
        }
    }

    // 禁用依赖Cookie的API调用
    disableCookieDependentAPIs() {
        // 保存原始方法
        if (!this.originalXHRSend) {
            this.originalXHRSend = XMLHttpRequest.prototype.send;
        }
        if (!this.originalFetch) {
            this.originalFetch = window.fetch;
        }

        // 禁用XMLHttpRequest发送Cookie
        XMLHttpRequest.prototype.send = function(data) {
            if (this.withCredentials) {
                console.warn('Cookie已被禁用，已移除withCredentials标志');
                this.withCredentials = false;
            }
            return this.originalXHRSend.call(this, data);
        }.bind(this);

        // 禁用fetch发送Cookie
        window.fetch = function(input, init = {}) {
            if (init.credentials === 'include') {
                console.warn('Cookie已被禁用，已移除credentials标志');
                init.credentials = 'omit';
            }
            return this.originalFetch.call(this, input, init);
        }.bind(this);

        // 禁用CookieStore API（如果存在）
        this.disableCookieStoreAPI();
    }

    // 禁用CookieStore API
    disableCookieStoreAPI() {
        if (window.cookieStore) {
            console.log('检测到CookieStore API，正在禁用...');
            
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
            window.cookieStore.get = function() {
                console.warn('Cookie已被禁用，CookieStore.get功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };

            window.cookieStore.getAll = function() {
                console.warn('Cookie已被禁用，CookieStore.getAll功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };

            window.cookieStore.set = function() {
                console.warn('Cookie已被禁用，CookieStore.set功能受限');
                return Promise.reject(new Error('Cookie已被禁用'));
            };

            window.cookieStore.delete = function() {
                console.warn('Cookie已被禁用，CookieStore.delete功能受限');
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
    }

    // 显示禁用提示
    showDisabledMessage() {
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
    }

    // 隐藏禁用提示
    hideDisabledMessage() {
        const messageDiv = document.getElementById('cookie-disabled-message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }

    // 设置Cookie变化监听器
    setupCookieChangeListener() {
        // 监听自定义事件（用于页面内Cookie选择变化）
        window.addEventListener('cookieChoiceChanged', (e) => {
            this.cookieEnabled = this.checkCookieStatus();
            if (!this.cookieEnabled) {
                this.disableAllCookies();
            } else {
                this.enableAllCookies();
            }
        });
    }

    // 手动触发Cookie状态检查
    refreshCookieStatus() {
        this.cookieEnabled = this.checkCookieStatus();
        if (!this.cookieEnabled) {
            this.disableAllCookies();
        } else {
            this.enableAllCookies();
        }
    }

    // 获取当前Cookie状态
    getCookieStatus() {
        return this.cookieEnabled;
    }

    // 设置Cookie状态（供外部调用）
    setCookieStatus(enabled) {
        localStorage.setItem('Cookie', enabled ? 'True' : 'False');
        this.cookieEnabled = enabled;
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('cookieChoiceChanged'));
        
        if (!enabled) {
            this.disableAllCookies();
        } else {
            this.enableAllCookies();
        }
    }
}

// 创建全局Cookie管理器实例
window.cookieManager = new CookieManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookieManager;
}